const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");
const { exec } = require("child_process");
const fs = require("fs");
const { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } = require("fs");
const { tmpdir, platform } = require("os");
const { join, dirname, relative } = require("path");
const pty = require("node-pty");
const chokidar = require("chokidar");
const { simpleGit } = require("simple-git");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const { sendInviteEmail } = require("./services/emailService.js");
const { getActiveRooms, getRoomMeta, getWaitingUsers, getRedisStatus } = require("./services/redisService.js");
const {
  getGit,
  isValidRepo,
  ensureRepoInitialized,
  normalizePat,
  redactSecret,
  resolveCurrentBranch,
  simplifyGitError,
  remoteBranchExists,
  reinitRepo,
  withAuthenticatedOrigin
} = require("./services/gitService.js");
const {
  getCounters,
  listRecentEvents,
  listRecentRooms,
  recordRunRequest,
} = require("./services/adminMetrics.js");
const {
  parseTerminalMessage,
  parseExecutionMessage,
} = require("./utils/wsPayloads");
const { getTerminalShellLaunchConfig } = require("./utils/terminalShell");

dotenv.config();

const initAPI = (app, server) => {
  const wss = new WebSocketServer({ noServer: true });

  // Rate Limiting for production safety
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // limit each IP to 10000 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes" }
  });

  const inviteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 invites per hour
    message: { error: "Invitation limit reached. Please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
  const allowedOrigins = [
    FRONTEND_URL,
    "https://code-together.me",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    /\.onrender\.com$/,
    /\.netlify\.app$/
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(pattern => {
        if (pattern instanceof RegExp) return pattern.test(origin);
        return pattern === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  app.use(express.json({ limit: "1000mb" }));

  /* -------------------- SECURITY HELPERS -------------------- */

  /**
   * Strips dangerous characters and directory traversal attempts (../)
   */
  function sanitizePath(input) {
    if (typeof input !== "string") return "";
    // Remove control characters, null bytes, and ".."
    return input.replace(/[\x00-\x1f\x7f]/g, "")
      .replace(/\.\./g, "")
      .replace(/[<>:"|?*]/g, ""); // Windows invalid chars
  }

  function buildRunCommand(language, filepath) {
    const normalizedLanguage = String(language || "").toLowerCase();
    const pythonCommand = platform() === "win32"
      ? `if (Get-Command python -ErrorAction SilentlyContinue) { python "${filepath}" } elseif (Get-Command py -ErrorAction SilentlyContinue) { py -3 "${filepath}" } else { Write-Error "Python runtime not found" }\r`
      : `python3 "${filepath}" || python "${filepath}"\r`;

    // Map of supported languages
    const supportedCommands = {
      "python": pythonCommand,
      "javascript": `node "${filepath}"\r`,
      "typescript": `node --experimental-strip-types "${filepath}"\r`,
      "kotlin": {
        cmd: () => {
          const jarName = `${filepath.replace(/\.kt$/i, "")}.jar`;
          return `kotlinc "${filepath}" -include-runtime -d "${jarName}" && java -jar "${jarName}"\r`;
        },
        lang: "Kotlin"
      },
      "cpp": {
        cmd: () => {
          const executable = platform() === "win32" ? "a.exe" : "./a.out";
          return `g++ "${filepath}" && ${executable}\r`;
        },
        lang: "C++"
      },
      "c": {
        cmd: () => {
          const executable = platform() === "win32" ? "a.exe" : "./a.out";
          return `g++ "${filepath}" && ${executable}\r`;
        },
        lang: "C"
      },
      "rust": {
        cmd: () => {
          const executable = platform() === "win32" ? `${filepath.replace(".rs", ".exe")}` : `./${filepath.replace(".rs", "")}`;
          return `rustc "${filepath}" && ${executable}\r`;
        },
        lang: "Rust"
      },
      "go": `go run "${filepath}"\r`,
      "java": {
        cmd: () => {
          const className = filepath.split("/").pop().replace(/\.java$/i, "");
          const classDir = dirname(filepath);
          const classPath = classDir === "." ? "." : `${classDir}${platform() === "win32" ? ";" : ":"}.`;
          return `javac "${filepath}" && java -cp "${classPath}" "${className}"\r`;
        },
        lang: "Java"
      },
      "php": `php "${filepath}"\r`,
      "ruby": `ruby "${filepath}"\r`,
      "csharp": `dotnet script "${filepath}"\r`,
      "swift": `swift "${filepath}"\r`,
      "perl": `perl "${filepath}"\r`,
      "lua": `lua "${filepath}"\r`,
      "shell": platform() === "win32" ? `powershell -ExecutionPolicy Bypass -File "${filepath}"\r` : `bash "${filepath}"\r`
    };

    const cmd = supportedCommands[normalizedLanguage];
    
    if (!cmd) {
      return null; // Language not supported
    }

    // If cmd is an object with a function, call it
    if (typeof cmd === "object" && cmd.cmd) {
      return cmd.cmd();
    }

    return cmd;
  }

  /* -------------------- ROOM TRACKING -------------------- */

  const roomClients = new Map();  // roomId -> Set(ws)
  const roomQueues = new Map();   // roomId -> { running, queue }
  const localAgents = new Map();  // roomId -> Map(agentId -> { lastSeen, label })
  const localAgentJobs = new Map(); // roomId -> queued local-agent jobs
  const localAgentTerminalSessions = new Map(); // roomId -> { agentId, label, history, pendingInputs, pendingResize, pendingSyncFiles, shell, lastSeen }
  const LOCAL_AGENT_STALE_MS = 30 * 1000;

  /* -------------------- PTY TERMINALS -------------------- */
  const roomTerminals = new Map(); // roomId -> ptyProcess
  const roomTerminalHistory = new Map(); // roomId -> string (last N chars)
  const roomWatchers = new Map(); // roomId -> chokidarWatcher
  const roomCleanupTimers = new Map(); // roomId -> timeoutId
  const roomLastResizer = new Map(); // roomId -> { clientId, cols, rows, time }
  const adminSessions = new Map(); // sessionId -> { createdAt, expiresAt }
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const ADMIN_COOKIE_NAME = "ct_admin_session";
  const ADMIN_SESSION_MS = 1000 * 60 * 60 * 12;

  function parseCookies(req) {
    const raw = req.headers.cookie || "";
    return raw.split(";").reduce((acc, part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return acc;
      const key = part.slice(0, idx).trim();
      const value = decodeURIComponent(part.slice(idx + 1).trim());
      if (key) acc[key] = value;
      return acc;
    }, {});
  }

  function clearExpiredAdminSessions() {
    const current = Date.now();
    for (const [sessionId, session] of adminSessions.entries()) {
      if ((session?.expiresAt || 0) <= current) {
        adminSessions.delete(sessionId);
      }
    }
  }

  function getAdminSecrets() {
    return {
      accessKey: process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_PANEL_KEY || "",
      password: process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "",
    };
  }

  function setAdminCookie(res, sessionId) {
    const secure = process.env.NODE_ENV === "production";
    const sameSite = secure ? "None" : "Lax";
    const parts = [
      `${ADMIN_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
      "HttpOnly",
      "Path=/",
      `SameSite=${sameSite}`,
      `Max-Age=${Math.floor(ADMIN_SESSION_MS / 1000)}`
    ];
    if (secure) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }

  function clearAdminCookie(res) {
    const secure = process.env.NODE_ENV === "production";
    const sameSite = secure ? "None" : "Lax";
    const parts = [
      `${ADMIN_COOKIE_NAME}=`,
      "HttpOnly",
      "Path=/",
      `SameSite=${sameSite}`,
      "Max-Age=0"
    ];
    if (secure) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }

  function getAdminSession(req) {
    clearExpiredAdminSessions();
    const cookies = parseCookies(req);
    const sessionId = cookies[ADMIN_COOKIE_NAME];
    if (!sessionId) return null;

    const session = adminSessions.get(sessionId);
    if (!session) return null;

    if (session.expiresAt <= Date.now()) {
      adminSessions.delete(sessionId);
      return null;
    }

    return { sessionId, ...session };
  }

  function requireAdmin(req, res, next) {
    const session = getAdminSession(req);
    if (!session) {
      return res.status(401).json({ authenticated: false, error: "Admin authentication required." });
    }

    req.adminSession = session;
    next();
  }

  function createAdminSession() {
    clearExpiredAdminSessions();
    const sessionId = crypto.randomBytes(24).toString("hex");
    const createdAt = Date.now();
    adminSessions.set(sessionId, {
      createdAt,
      expiresAt: createdAt + ADMIN_SESSION_MS,
    });
    return sessionId;
  }

  async function stopRoomResources(roomId) {
    roomCleanupTimers.delete(roomId);

    const watcher = roomWatchers.get(roomId);
    if (watcher) {
      roomWatchers.delete(roomId);
      try {
        await watcher.close();
      } catch (error) {
        console.warn(`[WATCHER] Failed to close watcher for ${roomId}:`, error.message);
      }
    }

    for (const [key, ptyProcess] of roomTerminals.entries()) {
      if (key.startsWith(`${roomId}_`)) {
        try { ptyProcess.kill(); } catch (e) { }
        roomTerminals.delete(key);
        roomTerminalHistory.delete(key);
        roomLastResizer.delete(key);
      }
    }

    roomClients.delete(roomId);
    roomQueues.delete(roomId);
    localAgents.delete(roomId);
    localAgentJobs.delete(roomId);
    localAgentTerminalSessions.delete(roomId);
  }

  async function removeRoomFolder(roomCwd) {
    if (!existsSync(roomCwd)) return;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        rmSync(roomCwd, { recursive: true, force: true });
        return;
      } catch (error) {
        if ((error.code === "EBUSY" || error.code === "EPERM") && attempt < 3) {
          await delay(150 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
  }

  async function clearRoomWorkspace(roomId, { recreate = false } = {}) {
    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    await stopRoomResources(roomId);
    await removeRoomFolder(roomCwd);

    if (recreate) {
      mkdirSync(roomCwd, { recursive: true });
    }
  }

  async function cleanupRoomFolder(roomId) {
    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    if (existsSync(roomCwd)) {
      console.log(`[CLEANUP] Deleting stale room folder: ${roomId}`);
    }

    try {
      await clearRoomWorkspace(roomId);
    } catch (e) {
      console.error(`[CLEANUP:ERROR] Failed to delete ${roomId}:`, e.message);
    }
  }

  function ensureWatcher(roomId, roomCwd) {
    if (roomWatchers.has(roomId)) return;

    console.log(`[WATCHER] Starting for room ${roomId} at ${roomCwd}`);
    const watcher = chokidar.watch(roomCwd, {
      ignored: [
        /(^|[\/\\])\../,
        "**/.git/**"
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 10,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    roomWatchers.set(roomId, watcher);

    const pendingChanges = new Set();
    let notifyTimeout = null;

    const notifyChange = (filePath, eventType = "change") => {
      let rel = relative(roomCwd, filePath).replace(/\\/g, "/");
      if (!rel.startsWith("/")) rel = "/" + rel;
      const parentPath = dirname(rel).replace(/\\/g, "/");
      const safeParent = (parentPath === "." || parentPath === "/") ? "/" : parentPath;

      pendingChanges.add(JSON.stringify({
        path: rel,
        parentPath: safeParent,
        eventType
      }));

      if (!notifyTimeout) {
        notifyTimeout = setTimeout(() => {
          const events = Array.from(pendingChanges).map(value => JSON.parse(value));
          pendingChanges.clear();
          notifyTimeout = null;

          for (const event of events) {
            broadcast(roomId, {
              type: "fs:changed",
              path: event.path,
              parentPath: event.parentPath,
              eventType: event.eventType
            });
          }
        }, 500);
      }
    };

    watcher
      .on("add", (filePath) => notifyChange(filePath, "add"))
      .on("addDir", (filePath) => notifyChange(filePath, "addDir"))
      .on("change", (filePath) => notifyChange(filePath, "change"))
      .on("unlink", (filePath) => notifyChange(filePath, "unlink"))
      .on("unlinkDir", (filePath) => notifyChange(filePath, "unlinkDir"));
  }


  /* -------------------- WEBSOCKET -------------------- */

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/terminal") {
      const roomId = url.searchParams.get("roomId");
      const terminalId = url.searchParams.get("terminalId") || "1";
      if (!roomId) { ws.close(); return; }

      const termKey = `${roomId}_${terminalId}`;
      const localTerminalSession = getLocalAgentTerminalSession(roomId);

      if (localTerminalSession) {
        ws.roomId = roomId;
        ws.terminalId = terminalId;
        ws.isTerminal = true;
        ws.terminalMode = "local-agent";

        if (localTerminalSession.history) {
          ws.send(JSON.stringify({ type: "output", data: localTerminalSession.history }));
        }

        ws.on("message", (msg) => {
          try {
            const data = parseTerminalMessage(msg);
            const session = getLocalAgentTerminalSession(roomId);
            if (!session) return;

            session.lastSeen = Date.now();

            if (data.type === "input" && typeof data.data === "string") {
              session.pendingInputs.push(data.data);
            } else if (data.type === "resize") {
              session.pendingResize = {
                cols: Number(data.cols) || 80,
                rows: Number(data.rows) || 24
              };
            }
          } catch (e) {
            console.error("Local terminal WS message error", e);
          }
        });

        return;
      }

      const terminalLaunch = getTerminalShellLaunchConfig(platform());
      const shell = terminalLaunch.shell;
      const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
      if (!existsSync(roomCwd)) {
        mkdirSync(roomCwd, { recursive: true });
      }

      // Spawn new PTY if not exists for this room+terminal
      if (!roomTerminals.has(termKey)) {
        console.log(`Spawning terminal ${terminalId} for room ${roomId} using ${shell} at ${roomCwd}`);

        const ptyProcess = pty.spawn(shell, terminalLaunch.args, {
          name: "xterm-color",
          cols: 80,
          rows: 24,
          cwd: roomCwd,
          env: process.env
        });

        roomTerminals.set(termKey, ptyProcess);
        roomTerminalHistory.set(termKey, "");

        ptyProcess.onData((data) => {
          // Broadcast to all clients assigned to this specific terminal
          broadcastTerminal(roomId, terminalId, { type: "output", data });

          // Save history (last 5000 chars)
          let hist = roomTerminalHistory.get(termKey) + data;
          if (hist.length > 5000) hist = hist.slice(-5000);
          roomTerminalHistory.set(termKey, hist);
        });

        ptyProcess.onExit(({ exitCode }) => {
          console.log(`Terminal ${terminalId} for room ${roomId} exited with code ${exitCode}`);
          roomTerminals.delete(termKey);
          broadcastTerminal(roomId, terminalId, { type: "exit", code: exitCode });
        });
      }

      // Start file watcher for the room (only initiates once per room anyway)
      ensureWatcher(roomId, roomCwd);

      ws.roomId = roomId;
      ws.terminalId = terminalId;
      ws.isTerminal = true;

      // Send history to new client
      const hist = roomTerminalHistory.get(termKey);
      if (hist) {
        ws.send(JSON.stringify({ type: "output", data: hist }));
      }

      ws.on("message", (msg) => {
        try {
          const data = parseTerminalMessage(msg);
          const ptyProcess = roomTerminals.get(termKey);
          if (!ptyProcess) return;

          if (data.type === "input") {
            ptyProcess.write(data.data);
          } else if (data.type === "resize") {
            const now = Date.now();
            const last = roomLastResizer.get(termKey);

            // Debounce and only resize if significantly different or from a new active user
            if (!last || last.cols !== data.cols || last.rows !== data.rows) {
              try {
                ptyProcess.resize(data.cols, data.rows);
                roomLastResizer.set(termKey, { cols: data.cols, rows: data.rows, time: now });
                console.log(`[TERMINAL] Resized terminal ${terminalId} in ${roomId} to ${data.cols}x${data.rows}`);
              } catch (e) { }
            }
          }
        } catch (e) {
          console.error("Terminal WS message error", e);
        }
      });

      ws.on("close", () => {
        // Room cleanup could happen here if needed
      });

      return;
    }

    // Path must be /execution (or / for backward compatibility)
    if (url.pathname === "/execution" || url.pathname === "/") {
      ws.on("message", (msg) => {
        try {
          const data = parseExecutionMessage(msg);

          if (data.type === "join" && data.roomId) {
            const cleanRoomId = sanitizePath(data.roomId);
            if (!roomClients.has(cleanRoomId)) {
              roomClients.set(cleanRoomId, new Set());
            }

            // Cancel any pending cleanup if a user joins
            if (roomCleanupTimers.has(cleanRoomId)) {
              console.log(`[WS] User joined ${cleanRoomId}. Cancelling pending cleanup.`);
              clearTimeout(roomCleanupTimers.get(cleanRoomId));
              roomCleanupTimers.delete(cleanRoomId);
            }

            roomClients.get(cleanRoomId).add(ws);
            ws.roomId = cleanRoomId;
            ws.isTerminal = false;

            const roomCwd = join(tmpdir(), `liveshare_room_${cleanRoomId}`);
            if (!existsSync(roomCwd)) mkdirSync(roomCwd, { recursive: true });
            ensureWatcher(cleanRoomId, roomCwd);

            console.log(`[WS] Client joined room: ${cleanRoomId}`);
          }
        } catch (e) {
          console.error("WS message parse error", e);
        }
      });

      ws.on("close", () => {
        if (ws.roomId && !ws.isTerminal && roomClients.has(ws.roomId)) {
          const clients = roomClients.get(ws.roomId);
          clients.delete(ws);

          // Automatic 60-second cleanup if room is empty
          if (clients.size === 0) {
            console.log(`[WS] Room ${ws.roomId} is empty. Scheduling cleanup in 60s...`);
            const timerId = setTimeout(() => cleanupRoomFolder(ws.roomId), 60000);
            roomCleanupTimers.set(ws.roomId, timerId);
          }
        }
      });
    }
  });


  /* -------------------- BROADCAST -------------------- */

  function broadcast(roomId, message) {
    const clients = roomClients.get(roomId);
    if (!clients) return;

    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  /* -------------------- QUEUE -------------------- */

  function getRoomQueue(roomId) {
    if (!roomQueues.has(roomId)) {
      roomQueues.set(roomId, { running: false, queue: [] });
    }
    return roomQueues.get(roomId);
  }

  function getLocalAgentRoom(roomId) {
    if (!localAgents.has(roomId)) {
      localAgents.set(roomId, new Map());
    }
    return localAgents.get(roomId);
  }

  function getLocalAgentQueue(roomId) {
    if (!localAgentJobs.has(roomId)) {
      localAgentJobs.set(roomId, []);
    }
    return localAgentJobs.get(roomId);
  }

  function touchLocalAgent(roomId, agentId, label = "") {
    const roomAgents = getLocalAgentRoom(roomId);
    roomAgents.set(agentId, { lastSeen: Date.now(), label });
  }

  function pruneLocalAgents(roomId) {
    const roomAgents = localAgents.get(roomId);
    if (!roomAgents) return [];

    const now = Date.now();
    for (const [agentId, agent] of roomAgents.entries()) {
      if (now - agent.lastSeen > LOCAL_AGENT_STALE_MS) {
        roomAgents.delete(agentId);
      }
    }

    if (roomAgents.size === 0) {
      localAgents.delete(roomId);
      return [];
    }

    return Array.from(roomAgents.entries()).map(([agentId, agent]) => ({
      agentId,
      label: agent.label,
      lastSeen: agent.lastSeen
    }));
  }

  function hasActiveLocalAgent(roomId) {
    return pruneLocalAgents(roomId).length > 0;
  }

  function createLocalAgentJobId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getLocalAgentTerminalSession(roomId) {
    const session = localAgentTerminalSessions.get(roomId);
    if (!session) return null;

    if (Date.now() - session.lastSeen > LOCAL_AGENT_STALE_MS) {
      localAgentTerminalSessions.delete(roomId);
      return null;
    }

    return session;
  }

  function upsertLocalAgentTerminalSession(roomId, agentId, label = "", shell = "") {
    const existing = localAgentTerminalSessions.get(roomId);
    const session = existing && existing.agentId === agentId
      ? existing
      : {
          agentId,
          label,
          history: "",
          pendingInputs: [],
          pendingResize: null,
          pendingSyncFiles: null,
          shell,
          lastSeen: Date.now()
        };

    session.agentId = agentId;
    session.label = label || session.label || "";
    session.shell = shell || session.shell || "";
    session.lastSeen = Date.now();

    localAgentTerminalSessions.set(roomId, session);
    return session;
  }

  function broadcastTerminal(roomId, terminalId, payload, { includeAllRoomTerminals = false } = {}) {
    const serialized = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (!client.isTerminal || client.readyState !== 1 || client.roomId !== roomId) {
        return;
      }

      if (!includeAllRoomTerminals && client.terminalId !== terminalId) {
        return;
      }

      client.send(serialized);
    });
  }

  function appendLocalTerminalOutput(roomId, data) {
    const session = getLocalAgentTerminalSession(roomId);
    if (!session || !data) return;

    let hist = `${session.history || ""}${data}`;
    if (hist.length > 12000) hist = hist.slice(-12000);
    session.history = hist;
    session.lastSeen = Date.now();

    broadcastTerminal(roomId, null, { type: "output", data }, { includeAllRoomTerminals: true });
  }

  async function buildAdminMetricsSnapshot() {
    const activeRoomIds = await getActiveRooms().catch(() => []);
    const roomIds = new Set([
      ...activeRoomIds,
      ...listRecentRooms().map((room) => room.roomId),
    ]);

    const recentRoomMetrics = listRecentRooms();
    const recentRoomMap = new Map(recentRoomMetrics.map((room) => [room.roomId, room]));
    const roomSummaries = [];

    for (const roomId of roomIds) {
      const meta = await getRoomMeta(roomId).catch(() => null);
      const waitingUsers = await getWaitingUsers(roomId).catch(() => []);
      const tracked = recentRoomMap.get(roomId) || { roomId };
      const activeConnections = tracked.currentConnections || 0;

      roomSummaries.push({
        roomId,
        roomType: meta?.roomType || tracked.roomType || "unknown",
        roomMode: meta?.roomMode || tracked.roomMode || "unknown",
        createdAt: Number(meta?.createdAt || tracked.createdAt || 0) || null,
        lastActiveAt: tracked.lastActiveAt || null,
        status: activeRoomIds.includes(roomId) ? (activeConnections > 0 ? "active" : "idle") : (tracked.status || "destroyed"),
        activeConnections,
        waitingCount: Array.isArray(waitingUsers) ? waitingUsers.length : (tracked.waitingCount || 0),
        maxConnectionsSeen: tracked.maxConnectionsSeen || activeConnections,
      });
    }

    roomSummaries.sort((a, b) => (b.lastActiveAt || b.createdAt || 0) - (a.lastActiveAt || a.createdAt || 0));

    const activeClientConnections = roomSummaries.reduce((sum, room) => sum + room.activeConnections, 0);
    const localAgentRoomCount = Array.from(localAgents.keys()).filter((roomId) => pruneLocalAgents(roomId).length > 0).length;
    const localTerminalRoomCount = Array.from(localAgentTerminalSessions.keys()).filter((roomId) => !!getLocalAgentTerminalSession(roomId)).length;

    return {
      generatedAt: Date.now(),
      counters: getCounters(),
      overview: {
        activeRooms: activeRoomIds.length,
        trackedRooms: roomSummaries.length,
        activeClientConnections,
        waitingUsers: roomSummaries.reduce((sum, room) => sum + room.waitingCount, 0),
        localAgentRooms: localAgentRoomCount,
        localTerminalRooms: localTerminalRoomCount,
        serverTerminalRooms: Array.from(roomTerminals.keys()).length,
      },
      redis: getRedisStatus(),
      rooms: roomSummaries.slice(0, 50),
      recentEvents: listRecentEvents(35),
    };
  }

  const { executeRemote } = require("./services/wandbox.js");
  /* -------------------- CODE EXECUTION -------------------- */

  async function executeCode(language, code) {
    const highlightOnly = ["html", "css", "markdown"];
    if (highlightOnly.includes(language)) {
      return {
        stdout: "",
        stderr: "",
        exitCode: 0,
        isRender: true,
        lang: language,
        renderedCode: code,
      };
    }

    const localRuntimes = ["python", "javascript", "typescript"];
    const isLocalSupported = localRuntimes.includes(language);

    if (!isLocalSupported) {
      return await executeRemote(language, code);
    }

    return new Promise((resolve) => {
      const extMap = { python: "py", javascript: "js", typescript: "ts" };
      const ext = extMap[language];
      const baseDir = tmpdir();
      const runId = Date.now();
      const tmpFile = join(baseDir, `liveshare_exec_${runId}.${ext}`);

      try {
        writeFileSync(tmpFile, code, "utf8");
      } catch (e) {
        return resolve({ stdout: "", stderr: "Failed to write temp file: " + e.message, exitCode: 1 });
      }

      const commands = language === "python"
        ? (platform() === "win32"
          ? [`python "${tmpFile}"`, `py -3 "${tmpFile}"`]
          : [`python3 "${tmpFile}"`, `python "${tmpFile}"`])
        : language === "javascript"
          ? [`node "${tmpFile}"`]
          : [`node --experimental-strip-types "${tmpFile}"`];

      const isMissingRuntimeError = (error, stderr = "") => {
        const combined = `${stderr}\n${error?.message || ""}`.toLowerCase();
        return (
          combined.includes("is not recognized as an internal or external command") ||
          combined.includes("command not found") ||
          combined.includes("no installed pythons found") ||
          combined.includes("requested python version") ||
          combined.includes("python runtime not found") ||
          combined.includes("not found")
        );
      };

      const finalize = (result) => {
        try { unlinkSync(tmpFile); } catch (_) { }
        resolve(result);
      };

      const runLocalCommand = (commandIndex = 0) => {
        exec(commands[commandIndex], { timeout: 10000 }, async (error, stdout, stderr) => {
          let finalStderr = stderr || (error && error.message && !stderr ? error.message : "");

          if (language === "typescript") {
            finalStderr = finalStderr
              .split("\n")
              .filter(line => !line.includes("ExperimentalWarning: Type Stripping is an experimental feature"))
              .filter(line => !line.includes("Use `node --trace-warnings"))
              .join("\n")
              .trim();
          }

          if (error && isMissingRuntimeError(error, finalStderr)) {
            if (commandIndex + 1 < commands.length) {
              runLocalCommand(commandIndex + 1);
              return;
            }

            console.log(`Local runtime for ${language} missing. Falling back to remote...`);
            const remoteResult = await executeRemote(language, code);
            finalize(remoteResult);
            return;
          }

          finalize({
            stdout: stdout || "",
            stderr: finalStderr,
            exitCode: error ? (error.code ?? 1) : 0,
          });
        });
      };

      runLocalCommand();
    });
  }

  async function processQueue(roomId) {
    const room = getRoomQueue(roomId);
    if (room.running || room.queue.length === 0) return;

    const job = room.queue.shift();
    room.running = true;

    console.log(`Running code in room ${roomId} by ${job.userId}`);
    broadcast(roomId, { type: "run:start", userId: job.userId });

    try {
      const result = await executeCode(job.language, job.code);
      const output = result.stdout + (result.stderr ? "\n[stderr]: " + result.stderr : "") || "(no output)";

      console.log(`Finished running in room ${roomId}`);
      broadcast(roomId, { type: "run:output", userId: job.userId, output, exitCode: result.exitCode });

      if (job.resolve) job.resolve(result);

    } catch (err) {
      console.error("Execution error", err);
      broadcast(roomId, { type: "run:output", userId: job.userId, output: "Execution error: " + err.message, exitCode: 1 });
      if (job.resolve) job.resolve({ stdout: "", stderr: err.message, exitCode: 1 });
    } finally {
      room.running = false;
      processQueue(roomId);
    }
  }

  /* -------------------- RUN ENDPOINT -------------------- */

  app.post("/run", async (req, res) => {

    if (!req.body) {
      return res.status(400).json({ error: "Request body missing" });
    }

    const { roomId, userId, language, code } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({ error: "roomId and userId required" });
    }

    recordRunRequest("cloud", roomId);

    if (!code || !code.trim()) {
      return res.json({ status: "done", stdout: "", stderr: "", exitCode: 0, output: "(empty code)" });
    }

    const room = getRoomQueue(roomId);

    room.queue = room.queue.filter((job) => job.userId !== userId);

    if (room.running) {
      const position = room.queue.length + 1;
      room.queue.push({ userId, language, code, resolve: null });
      console.log(`Queued job in room ${roomId} by ${userId}. Position: ${position}`);
      return res.json({ status: "queued", position });
    }

    const result = await new Promise((resolve) => {
      room.queue.push({ userId, language, code, resolve });
      processQueue(roomId);
    });

    const output = result.stdout + (result.stderr ? "\n[stderr]: " + result.stderr : "") || "(no output)";

    res.json({
      status: "done",
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      output,
      isRender: result.isRender,
      lang: result.lang,
      renderedCode: result.renderedCode,
    });

  });

  /* -------------------- LOCAL AGENT ENDPOINTS -------------------- */

  app.get("/local-agent.py", (_req, res) => {
    res.type("text/x-python");
    res.sendFile(join(__dirname, "local-agent.py"));
  });

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      service: "backend",
      timestamp: Date.now()
    });
  });

  app.post("/admin/login", (req, res) => {
    const { accessKey, password } = req.body || {};
    const secrets = getAdminSecrets();

    if (!secrets.accessKey || !secrets.password) {
      return res.status(503).json({ error: "Admin access is not configured on the server." });
    }

    if (String(accessKey || "") !== secrets.accessKey || String(password || "") !== secrets.password) {
      return res.status(401).json({ error: "Invalid admin credentials." });
    }

    const sessionId = createAdminSession();
    setAdminCookie(res, sessionId);

    res.json({ success: true, authenticated: true });
  });

  app.post("/admin/logout", (req, res) => {
    const cookies = parseCookies(req);
    const sessionId = cookies[ADMIN_COOKIE_NAME];
    if (sessionId) {
      adminSessions.delete(sessionId);
    }

    clearAdminCookie(res);
    res.json({ success: true });
  });

  app.get("/admin/session", (req, res) => {
    const secrets = getAdminSecrets();
    const session = getAdminSession(req);

    res.json({
      authenticated: !!session,
      configured: Boolean(secrets.accessKey && secrets.password),
    });
  });

  app.get("/admin/metrics", requireAdmin, async (_req, res) => {
    const snapshot = await buildAdminMetricsSnapshot();
    res.json({ success: true, ...snapshot });
  });

  app.get("/local-agent/status", (req, res) => {
    const { roomId } = req.query;
    if (!roomId) {
      return res.status(400).json({ error: "roomId required" });
    }

    const agents = pruneLocalAgents(roomId);
    const terminal = getLocalAgentTerminalSession(roomId);
    res.json({
      success: true,
      connected: agents.length > 0,
      agents,
      terminalConnected: !!terminal,
      terminalShell: terminal?.shell || ""
    });
  });

  app.post("/local-agent/heartbeat", (req, res) => {
    const { roomId, agentId, label } = req.body || {};

    if (!roomId || !agentId) {
      return res.status(400).json({ error: "roomId and agentId required" });
    }

    touchLocalAgent(roomId, agentId, label);
    res.json({ success: true });
  });

  app.post("/local-agent/run", (req, res) => {
    const { roomId, userId, files, activeFile, language } = req.body || {};

    if (!roomId || !Array.isArray(files) || !activeFile) {
      return res.status(400).json({ error: "roomId, files, and activeFile are required" });
    }

    if (!hasActiveLocalAgent(roomId)) {
      return res.status(409).json({
        error: "No Local Agent is connected yet. Paste the starter command in your terminal, keep it open, then try again."
      });
    }

    const terminalSession = getLocalAgentTerminalSession(roomId);
    if (terminalSession) {
      recordRunRequest("local-agent", roomId);
      const filepath = String(activeFile.path || "").replace(/^\//, "");
      const cmdString = buildRunCommand(language, filepath);

      if (!cmdString) {
        return res.status(400).json({
          error: `Language "${language}" is not supported. Supported languages: Python, JavaScript, TypeScript, Kotlin, C/C++, Rust, Go, Java, PHP, Ruby, C#, Swift, Perl, Lua, and Shell.`
        });
      }

      terminalSession.pendingSyncFiles = files;
      terminalSession.pendingInputs.push({ type: "run", command: cmdString, resetCwd: true });
      terminalSession.lastSeen = Date.now();

      return res.json({
        success: true,
        jobId: createLocalAgentJobId(),
        message: "Queued on Local Agent terminal"
      });
    }

    const jobId = createLocalAgentJobId();
    recordRunRequest("local-agent", roomId);
    const job = {
      id: jobId,
      userId: userId || "local-user",
      files,
      activeFile,
      language,
      createdAt: Date.now()
    };

    getLocalAgentQueue(roomId).push(job);
    broadcast(roomId, { type: "run:start", userId: job.userId });

    res.json({
      success: true,
      jobId,
      message: "Queued on Local Agent"
    });
  });

  app.post("/local-agent/jobs/next", (req, res) => {
    const { roomId, agentId, label } = req.body || {};

    if (!roomId || !agentId) {
      return res.status(400).json({ error: "roomId and agentId required" });
    }

    touchLocalAgent(roomId, agentId, label);
    const queue = getLocalAgentQueue(roomId);
    const job = queue.shift() || null;

    res.json({ success: true, job });
  });

  app.post("/local-agent/jobs/result", (req, res) => {
    const { roomId, agentId, label, jobId, userId, output, exitCode } = req.body || {};

    if (!roomId || !agentId || !jobId) {
      return res.status(400).json({ error: "roomId, agentId, and jobId required" });
    }

    touchLocalAgent(roomId, agentId, label);
    const finalOutput = String(output || "").slice(-250000) || "(no output)";
    const finalExitCode = Number.isFinite(Number(exitCode)) ? Number(exitCode) : 0;

    broadcast(roomId, {
      type: "run:output",
      userId: userId || agentId,
      output: finalOutput,
      exitCode: finalExitCode
    });

    res.json({ success: true });
  });

  app.post("/local-agent/terminal/poll", (req, res) => {
    const { roomId, agentId, label, shell, output, exitCode } = req.body || {};

    if (!roomId || !agentId) {
      return res.status(400).json({ error: "roomId and agentId required" });
    }

    touchLocalAgent(roomId, agentId, label);
    const session = upsertLocalAgentTerminalSession(roomId, agentId, label, shell);

    if (typeof output === "string" && output.length > 0) {
      appendLocalTerminalOutput(roomId, output);
    }

    if (exitCode !== undefined && exitCode !== null) {
      broadcastTerminal(roomId, null, { type: "exit", code: Number(exitCode) || 0 }, { includeAllRoomTerminals: true });
    }

    const inputs = session.pendingInputs.splice(0, session.pendingInputs.length);
    const resize = session.pendingResize;
    const syncFiles = session.pendingSyncFiles;
    session.pendingResize = null;
    session.pendingSyncFiles = null;
    session.lastSeen = Date.now();

    res.json({
      success: true,
      actions: {
        inputs,
        resize,
        syncFiles
      }
    });
  });

  /* -------------------- IDE SYNC AND RUN ENDPOINT -------------------- */

  app.post("/sync-and-run", (req, res) => {
    const { roomId, files, activeFile, language } = req.body;

    if (!roomId || !files || !activeFile) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);

    try {
      if (!existsSync(roomCwd)) {
        mkdirSync(roomCwd, { recursive: true });
      }

      files.forEach((f) => {
        const fullPath = join(roomCwd, f.path.replace(/^\//, ""));
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, f.content || "", "utf8");
      });

      const localTerminalSession = getLocalAgentTerminalSession(roomId);
      if (localTerminalSession) {
        recordRunRequest("local-agent", roomId);
        const filepath = activeFile.path.replace(/^\//, "");
        const cmdString = buildRunCommand(language, filepath);

        if (!cmdString) {
          return res.status(400).json({ error: `Language "${language}" is not supported. Supported languages: Python, JavaScript, TypeScript, Kotlin, C/C++, Rust, Go, Java, PHP, Ruby, C#, Swift, Perl, Lua, and Shell.` });
        }

        localTerminalSession.pendingSyncFiles = files;
        localTerminalSession.pendingInputs.push({ type: "run", command: cmdString, resetCwd: true });
        localTerminalSession.lastSeen = Date.now();

        return res.json({ success: true, message: "Synced to Local Agent terminal and queued for execution." });
      }

      let ptyProcess = roomTerminals.get(`${roomId}_1`);
      if (!ptyProcess) {
        // fallback, try to find any terminal for this room
        const fallbackKey = Array.from(roomTerminals.keys()).find(k => k.startsWith(`${roomId}_`));
        if (fallbackKey) ptyProcess = roomTerminals.get(fallbackKey);
      }

      if (!ptyProcess) {
        return res.status(400).json({ error: "No active terminal session in this room." });
      }
      recordRunRequest("terminal", roomId);

      const filepath = activeFile.path.replace(/^\//, "");

      const cmdString = buildRunCommand(language, filepath);
      if (!cmdString) {
        return res.status(400).json({ error: `Language "${language}" is not supported. Supported languages: Python, JavaScript, TypeScript, Kotlin, C/C++, Rust, Go, Java, PHP, Ruby, C#, Swift, Perl, Lua, and Shell.` });
      }

      if (platform() === "win32") {
        ptyProcess.write("\x1b");
      } else {
        ptyProcess.write("\x05\x15");
      }

      ptyProcess.write(cmdString);

      res.json({ success: true, message: "Sync successful, command injected into terminal." });

    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to write virtual files to server disk." });
    }
  });

  /* -------------------- IDE SYNC FILES ENDPOINT -------------------- */

  app.post("/sync", (req, res) => {
    const { roomId, files } = req.body;

    if (!roomId || !files) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);

    try {
      if (!existsSync(roomCwd)) {
        mkdirSync(roomCwd, { recursive: true });
      }

      files.forEach((f) => {
        const fullPath = join(roomCwd, f.path.replace(/^\//, ""));
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, f.content || "", "utf8");
      });

      const localTerminalSession = getLocalAgentTerminalSession(roomId);
      if (localTerminalSession) {
        localTerminalSession.pendingSyncFiles = files;
        localTerminalSession.lastSeen = Date.now();
      }

      res.json({ success: true, message: "Sync successful" });

    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to write virtual files to server disk." });
    }
  });

  /* -------------------- CLEAR ROOM FILES (for folder re-import) ---- */

  app.post("/fs/clear-room", async (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    try {
      await clearRoomWorkspace(roomId, { recreate: true });
      res.json({ success: true, message: "Room files cleared" });
    } catch (error) {
      console.error("Clear room error:", error);
      res.status(500).json({ error: "Failed to clear room files" });
    }
  });

  /* -------------------- REST FILE SYSTEM ENDPOINTS -------------------- */

  app.get("/tree", (req, res) => {
    const { roomId, path = "/" } = req.query;
    if (!roomId) return res.status(400).json({ error: "roomId needed" });

    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    const targetDir = join(roomCwd, path.replace(/^\//, ""));

    try {
      if (!existsSync(targetDir)) return res.json([]);
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const result = entries.map(e => ({
        name: e.name,
        path: path === "/" ? `/${e.name}` : `${path}/${e.name}`,
        type: e.isDirectory() ? "folder" : "file",
        parentPath: path,
      }));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/content", (req, res) => {
    const { roomId, path } = req.query;
    try {
      const fullPath = join(tmpdir(), `liveshare_room_${roomId}`, path.replace(/^\//, ""));
      if (!existsSync(fullPath)) return res.status(404).json({ error: "File not found" });
      const content = fs.readFileSync(fullPath, "utf8");
      res.send(content);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/fs/delete", (req, res) => {
    const { roomId, path } = req.body;
    if (!roomId || !path) return res.status(400).json({ error: "roomId and path are required" });

    const fullPath = join(tmpdir(), `liveshare_room_${roomId}`, path.replace(/^\//, ""));

    try {
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
        res.json({ success: true, message: "Deleted successfully" });
      } else {
        res.status(404).json({ error: "File or folder not found" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.post("/fs/create", (req, res) => {
    const { roomId, type, path } = req.body;
    try {
      const fullPath = join(tmpdir(), `liveshare_room_${roomId}`, path.replace(/^\//, ""));
      if (existsSync(fullPath)) {
        return res.status(409).json({ error: `A ${type} with this name already exists.` });
      }
      if (!existsSync(dirname(fullPath))) mkdirSync(dirname(fullPath), { recursive: true });
      if (type === "folder") mkdirSync(fullPath, { recursive: true });
      else writeFileSync(fullPath, "", "utf8");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });



  app.put("/fs/rename", (req, res) => {
    const { roomId, oldPath, newPath } = req.body;
    try {
      const baseDir = join(tmpdir(), `liveshare_room_${roomId}`);
      const fullOld = join(baseDir, oldPath.replace(/^\//, ""));
      const fullNew = join(baseDir, newPath.replace(/^\//, ""));
      if (fullOld !== fullNew && existsSync(fullNew)) {
        return res.status(409).json({ error: "An item with this name already exists." });
      }
      fs.renameSync(fullOld, fullNew);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/fs/save", (req, res) => {
    const { roomId, path, content } = req.body;
    try {
      const fullPath = join(tmpdir(), `liveshare_room_${roomId}`, path.replace(/^\//, ""));
      writeFileSync(fullPath, content, "utf8");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------- GIT INTEGRATION -------------------- */
  // Core Git functions imported from gitService.js
  
  const isFineGrainedPat = (pat) => pat.startsWith("github_pat_");

  const getGithubAuthHeaders = (pat) => {
    const token = normalizePat(pat);
    const headers = {
      "Authorization": isFineGrainedPat(token) ? `Bearer ${token}` : `token ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LiveShare-CodeTogether"
    };

    return headers;
  };

  const normalizeGithubRemoteUrl = (remoteUrl) => {
    let cleanRemote = String(remoteUrl || "").trim();

    if (cleanRemote.startsWith("git@github.com:")) {
      cleanRemote = `https://github.com/${cleanRemote.slice("git@github.com:".length)}`;
    }

    const url = new URL(cleanRemote);
    if (url.hostname !== "github.com") {
      throw new Error("Only github.com remotes are supported.");
    }

    url.username = "";
    url.password = "";
    return url.toString();
  };

  const simplifyGithubApiError = (err, token) => {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message || "Failed to fetch repositories";
    const oauthScopes = err.response?.headers?.["x-oauth-scopes"] || "";

    if (status === 401 || /bad credentials/i.test(message)) {
      return "Invalid GitHub token. Check that the PAT was copied completely and has no extra spaces.";
    }

    if (status === 403) {
      if (/saml|sso/i.test(message)) {
        return "This token needs GitHub organization SSO authorization before repositories can be listed.";
      }

      if (!isFineGrainedPat(token) && oauthScopes && !oauthScopes.split(",").map(s => s.trim()).includes("repo")) {
        return "This classic GitHub token is missing the 'repo' scope.";
      }

      return "GitHub denied repository access for this token. For fine-grained PATs, select the repositories and grant Metadata read plus Contents read/write.";
    }

    if (status === 404) {
      return "GitHub could not find repositories available to this token.";
    }

    return message;
  };

  app.get("/git/status", async (req, res) => {
    const { roomId } = req.query;
    if (!roomId) return res.status(400).json({ error: "roomId needed" });
    try {
      const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
      if (!existsSync(roomCwd)) return res.json({ isRepo: false });

      const git = getGit(roomId);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return res.json({ isRepo: false });

      const status = await git.status();
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === "origin");

      res.json({
        isRepo: true,
        remoteUrl: origin ? origin.refs.fetch : null,
        modified: status.modified,
        not_added: status.not_added,
        staged: status.staged,
        deleted: status.deleted,
        created: status.created,
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------- AUTO-INITIALIZE GIT ENDPOINT -------------------- */
  app.post("/git/ensure-initialized", async (req, res) => {
    const { roomId, username } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    try {
      const result = await ensureRepoInitialized(roomId, "main", username || "CodeTogether User", `${(username || "user").toLowerCase()}@codetogether.io`);
      res.json({
        success: true,
        initialized: result.initialized,
        branch: result.branch || "main",
        message: result.initialized ? "Git repository initialized" : "Git repository was already initialized"
      });
    } catch (err) {
      console.error("Ensure init error:", err);
      res.status(500).json({ error: simplifyGitError(err) });
    }
  });

  /* -------------------- ERROR MAPPING HELPER -------------------- */

  app.post("/git/init", async (req, res) => {
    const { roomId, defaultBranch = "main", authorName, authorEmail } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    try {
      const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
      if (!existsSync(roomCwd)) {
        mkdirSync(roomCwd, { recursive: true });
      }
      const git = getGit(roomId);
      const wasRepo = await git.checkIsRepo();
      await git.init();

      if (!wasRepo) {
        const currentBranch = (await git.branch(["--show-current"])).current;
        if (currentBranch !== defaultBranch) {
          await git.checkout(["-b", defaultBranch]);
        }
      }

      // Configure author if provided
      if (authorName) await git.addConfig("user.name", authorName);
      if (authorEmail) await git.addConfig("user.email", authorEmail);

      res.json({ success: true, message: `Git initialized on '${defaultBranch}' branch.` });
    } catch (err) {
      console.error("Init error:", err);
      res.status(500).json({ error: simplifyGitError(err) });
    }
  });

  app.post("/git/stage", async (req, res) => {
    const { roomId, filePaths } = req.body;
    if (!roomId || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: "roomId and filePaths required" });
    }

    try {
      const git = getGit(roomId);
      await git.add(filePaths);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/git/unstage", async (req, res) => {
    const { roomId, filePaths } = req.body;
    if (!roomId || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: "roomId and filePaths required" });
    }

    try {
      const git = getGit(roomId);
      await git.reset(["HEAD", ...filePaths]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/git/commit", async (req, res) => {
    const { roomId, message, authorName, authorEmail } = req.body;
    if (!roomId || !String(message || "").trim()) {
      return res.status(400).json({ error: "roomId and commit message required" });
    }

    try {
      const git = getGit(roomId);
      const status = await git.status();
      const hasChanges = status.modified.length > 0 || status.not_added.length > 0 || status.deleted.length > 0 || status.staged.length > 0;

      if (!hasChanges) {
        return res.status(400).json({ error: "No changes available to commit." });
      }

      if (authorName && authorEmail) {
        await git.addConfig("user.name", authorName);
        await git.addConfig("user.email", authorEmail);
      }

      if (status.modified.length > 0 || status.not_added.length > 0 || status.deleted.length > 0) {
        await git.add(".");
      }

      await git.commit(message);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/git/remote", async (req, res) => {
    const { roomId } = req.body;
    const remoteUrl = typeof req.body.remoteUrl === "string" ? req.body.remoteUrl.trim() : "";
    if (!roomId || !remoteUrl) {
      return res.status(400).json({ error: "roomId and remoteUrl required" });
    }

    try {
      const git = getGit(roomId);
      const savedRemoteUrl = normalizeGithubRemoteUrl(remoteUrl);
      const remotes = await git.getRemotes();
      if (remotes.find(r => r.name === "origin")) {
        await git.removeRemote("origin");
      }
      await git.addRemote("origin", savedRemoteUrl);
      const currentRemoteUrl = (await git.remote(["get-url", "origin"])).trim();
      res.json({ success: true, remoteUrl: currentRemoteUrl });
    } catch (err) {
      res.status(500).json({ error: simplifyGitError(err) });
    }
  });

  app.post("/git/push", async (req, res) => {
    const { roomId, pat, username, commitMessage } = req.body;
    const token = normalizePat(pat);

    if (!token) {
      return res.status(400).json({ error: "GitHub PAT required" });
    }

    try {
      const git = getGit(roomId);

      // Get current branch
      let status = await git.status();
      const currentBranch = await resolveCurrentBranch(git);

      // If a commit message was provided, auto-stage all changes and commit first
      if (commitMessage && commitMessage.trim()) {
        const hasChanges = status.modified.length > 0 || status.not_added.length > 0 || status.deleted.length > 0 || status.staged.length > 0;
        if (hasChanges) {
          await git.add(".");
          const safeUsername = typeof username === "string" ? username.trim() : "";
          const authorName = safeUsername || "CodeTogether User";
          const normalizedAuthor = authorName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
          const authorEmail = `${normalizedAuthor || "codetogether-user"}@users.noreply.github.com`;
          await git.addConfig("user.name", authorName);
          await git.addConfig("user.email", authorEmail);
          await git.commit(commitMessage.trim());
          status = await git.status();
        }
      }

      // Verify there are commits to push
      try {
        await git.log();
      } catch (logErr) {
        return res.status(400).json({ error: "No commits found. Please commit your changes before pushing." });
      }

      // Get remote URL
      let remoteUrl;
      try {
        remoteUrl = await git.remote(["get-url", "origin"]);
        remoteUrl = remoteUrl.trim();
      } catch (e) {
        return res.status(400).json({ error: "No remote repository configured. Please connect to a GitHub repository first." });
      }

      // Temporarily update origin with auth, push, then restore the clean URL
      try {
        await withAuthenticatedOrigin(roomId, token, username, async ({ git: authedGit }) => {
          await authedGit.push(["--set-upstream", "origin", currentBranch]);
        });
      } catch (pushErr) {
        const errMsg = pushErr.message.toLowerCase();
        if (errMsg.includes("rejected") || errMsg.includes("failed to push") || errMsg.includes("non-fast-forward")) {
          return res.status(400).json({
            error: "Push rejected. The remote contains work you don't have locally. Try pulling first."
          });
        }
        if (errMsg.includes("authentication") || errMsg.includes("fatal: could not read password")) {
          return res.status(401).json({
            error: "GitHub authentication failed. Check your PAT is valid and has push permissions."
          });
        }
        throw pushErr;
      }

      res.json({ success: true, message: `Pushed to ${currentBranch}` });
    } catch (err) {
      console.error("Push error:", redactSecret(err, token));
      res.status(500).json({ error: simplifyGitError(err, token) });
    }
  });

  app.post("/git/pull", async (req, res) => {
    const { roomId, pat, username } = req.body;
    const token = normalizePat(pat);

    if (!token) {
      return res.status(400).json({ error: "GitHub PAT required" });
    }

    try {
      const git = getGit(roomId);

      // Get current branch
      const currentBranch = await resolveCurrentBranch(git);

      // Get remote URL
      let remoteUrl;
      try {
        remoteUrl = await git.remote(["get-url", "origin"]);
        remoteUrl = remoteUrl.trim();
      } catch (e) {
        return res.status(400).json({ error: "No remote repository configured. Please connect to a GitHub repository first." });
      }

      const branchExists = await remoteBranchExists(roomId, token, currentBranch);
      if (!branchExists) {
        return res.status(400).json({
          error: `Branch '${currentBranch}' does not exist on GitHub yet. Push this branch first.`
        });
      }

      // Pull changes through the authenticated origin URL, then restore the clean URL
      await withAuthenticatedOrigin(roomId, token, username, async ({ git: authedGit }) => {
        await authedGit.fetch("origin", currentBranch);
        await authedGit.raw(["pull", "origin", currentBranch, "--no-rebase", "--allow-unrelated-histories"]);
      });

      res.json({ success: true, message: `Pulled from ${currentBranch}` });
    } catch (err) {
      console.error("Pull error:", redactSecret(err, token));
      res.status(500).json({ error: simplifyGitError(err, token) });
    }
  });

  app.post("/git/user-repos", async (req, res) => {
    const token = normalizePat(req.body.pat);
    if (!token) return res.status(400).json({ error: "PAT required" });

    try {
      const headers = getGithubAuthHeaders(token);
      const tokenType = isFineGrainedPat(token) ? "fine-grained" : "classic";
      const repos = [];
      let page = 1;
      let lastResponse = null;

      console.log(`[GitHub API] Fetching repos using ${tokenType} token prefix.`);

      do {
        lastResponse = await axios.get("https://api.github.com/user/repos", {
          params: {
            sort: "updated",
            per_page: 100,
            page,
            affiliation: "owner,collaborator,organization_member"
          },
          headers
        });

        repos.push(...lastResponse.data);
        page += 1;
      } while (lastResponse.data.length === 100 && page <= 10);

      const oauthScopes = lastResponse?.headers?.["x-oauth-scopes"] || "";
      const hasClassicRepoScope = oauthScopes.split(",").map(s => s.trim()).includes("repo");
      let warning = "";

      if (repos.length === 0) {
        warning = isFineGrainedPat(token)
          ? "No repositories were returned. For fine-grained PATs, make sure repository access is set to All repositories or the specific repos you want to use."
          : "No repositories were returned for this token.";
        console.warn(`[GitHub API] Success but 0 repos found for ${tokenType} token.`);
      } else if (!isFineGrainedPat(token) && oauthScopes && !hasClassicRepoScope) {
        warning = "Repositories were fetched, but this classic token does not advertise the 'repo' scope. Private repo push/pull may fail.";
      }

      res.json({
        repos: repos.map(r => ({ name: r.full_name, url: r.clone_url, private: r.private })),
        tokenType,
        warning
      });
    } catch (err) {
      const errorData = err.response?.data || {};
      console.error("Fetch repos error:", errorData.message || err.message);
      res.status(err.response?.status || 500).json({ error: simplifyGithubApiError(err, token) });
    }
  });

  app.post("/git/branch", async (req, res) => {
    const { roomId, branchName, action } = req.body;
    if (!roomId || !branchName || !action) {
      return res.status(400).json({ error: "roomId, branchName, and action required" });
    }

    try {
      const git = getGit(roomId);
      if (action === "rename") {
        await git.branch(["-m", branchName]);
      } else if (action === "create") {
        await git.checkout(["-b", branchName]);
      } else if (action === "checkout") {
        await git.checkout(branchName);
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }
      res.json({ success: true, message: `Branch ${action === 'rename' ? 'renamed' : action === 'create' ? 'created' : 'switched'} to ${branchName}` });
    } catch (err) {
      console.error("Branch action error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/git/diff", async (req, res) => {
    const { roomId, filePath, staged } = req.query;
    try {
      const git = getGit(roomId);
      let diff;
      if (staged === "true") {
        diff = await git.diff(["--staged", filePath]);
      } else {
        diff = await git.diff([filePath]);
      }
      res.json({ diff });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------- INVITATION SYSTEM -------------------- */
  app.post("/api/rooms/:roomId/invite", inviteLimiter, async (req, res) => {
    const { roomId } = req.params;
    const { emails, inviter, roomType, roomMode, isHost } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "At least one email address is required." });
    }

    // Permission logic: Interview mode requires host status
    if (roomType === "Interview" && !isHost) {
      return res.status(403).json({ error: "Only the host can send invitations in Interview mode." });
    }

    try {
      const sendPromises = emails.map(email => sendInviteEmail(email, roomId, inviter || "A colleague", { roomType, roomMode, isHost }));
      await Promise.all(sendPromises);
      res.json({ success: true, message: `Invitations sent to ${emails.length} recipient(s).` });
    } catch (error) {
      console.error("Invite error:", error);
      res.status(500).json({ error: error.message || "Failed to send invitations. Please check your email configuration." });
    }
  });

  /* -------------------- TEST ROUTE -------------------- */

  app.get("/", (req, res) => {
    res.send("Execution API running 🚀");
  });

  return wss;
};

module.exports = { initAPI };
