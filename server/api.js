import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { exec } from "child_process";
import fs from "fs";
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir, platform } from "os";
import { join, dirname, relative } from "path";
import pty from "node-pty";
import chokidar from "chokidar";
import { simpleGit } from "simple-git";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import axios from "axios";
import { sendInviteEmail } from "./services/emailService.js";
 
dotenv.config();

const app = express();

// Rate Limiting for production safety
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});

app.use(limiter);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  /\.onrender\.com$/  // Allow any render subdomain
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

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* -------------------- ROOM TRACKING -------------------- */

const roomClients = new Map();  // roomId -> Set(ws)
const roomQueues = new Map();   // roomId -> { running, queue }

/* -------------------- PTY TERMINALS -------------------- */
const roomTerminals = new Map(); // roomId -> ptyProcess
const roomTerminalHistory = new Map(); // roomId -> string (last N chars)
const roomWatchers = new Map(); // roomId -> chokidarWatcher
const roomCleanupTimers = new Map(); // roomId -> timeoutId
const roomLastResizer = new Map(); // roomId -> { clientId, cols, rows, time }

function cleanupRoomFolder(roomId) {
  const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
  if (existsSync(roomCwd)) {
    console.log(`[CLEANUP] Deleting stale room folder: ${roomId}`);
    try {
      rmSync(roomCwd, { recursive: true, force: true });
    } catch (e) {
      console.error(`[CLEANUP:ERROR] Failed to delete ${roomId}:`, e.message);
    }
  }
  roomCleanupTimers.delete(roomId);

  // Terminate all PTY processes related to this room
  for (const [key, ptyProcess] of roomTerminals.entries()) {
    if (key.startsWith(`${roomId}_`)) {
      try { ptyProcess.kill(); } catch (e) { }
      roomTerminals.delete(key);
      roomTerminalHistory.delete(key);
      roomLastResizer.delete(key);
    }
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

  const notifyChange = (filePath) => {
    let rel = relative(roomCwd, filePath).replace(/\\/g, "/");
    if (!rel.startsWith("/")) rel = "/" + rel;
    const parentPath = dirname(rel).replace(/\\/g, "/");
    const safeParent = (parentPath === "." || parentPath === "/") ? "/" : parentPath;

    pendingChanges.add(safeParent);

    if (!notifyTimeout) {
      notifyTimeout = setTimeout(() => {
        const paths = Array.from(pendingChanges);
        pendingChanges.clear();
        notifyTimeout = null;

        for (const p of paths) {
          broadcast(roomId, {
            type: "fs:changed",
            path: p,
            parentPath: p
          });
        }
      }, 500);
    }
  };

  watcher
    .on("add", notifyChange)
    .on("addDir", notifyChange)
    .on("unlink", notifyChange)
    .on("unlinkDir", notifyChange);
}


/* -------------------- WEBSOCKET -------------------- */

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/terminal") {
    const roomId = url.searchParams.get("roomId");
    const terminalId = url.searchParams.get("terminalId") || "1";
    if (!roomId) { ws.close(); return; }

    const termKey = `${roomId}_${terminalId}`;
    const shell = platform() === "win32" ? "powershell.exe" : "bash";
    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    if (!existsSync(roomCwd)) {
      mkdirSync(roomCwd, { recursive: true });
    }

    // Spawn new PTY if not exists for this room+terminal
    if (!roomTerminals.has(termKey)) {
      console.log(`Spawning terminal ${terminalId} for room ${roomId} using ${shell} at ${roomCwd}`);

      const ptyProcess = pty.spawn(shell, [], {
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
        wss.clients.forEach(client => {
          if (client.roomId === roomId && client.terminalId === terminalId && client.isTerminal && client.readyState === 1) {
            client.send(JSON.stringify({ type: "output", data }));
          }
        });

        // Save history (last 5000 chars)
        let hist = roomTerminalHistory.get(termKey) + data;
        if (hist.length > 5000) hist = hist.slice(-5000);
        roomTerminalHistory.set(termKey, hist);
      });

      ptyProcess.onExit(({ exitCode }) => {
        console.log(`Terminal ${terminalId} for room ${roomId} exited with code ${exitCode}`);
        roomTerminals.delete(termKey);
        wss.clients.forEach(client => {
          if (client.roomId === roomId && client.terminalId === terminalId && client.isTerminal && client.readyState === 1) {
            client.send(JSON.stringify({ type: "exit", code: exitCode }));
          }
        });
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
        const data = JSON.parse(msg.toString());
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

  // STANDARD EXECUTION WEBSOCKET
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

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

import { executeRemote } from "./services/wandbox.js";

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

    let command;
    if (language === "python") command = `python "${tmpFile}"`;
    else if (language === "javascript") command = `node "${tmpFile}"`;
    else if (language === "typescript") command = `node --experimental-strip-types "${tmpFile}"`;

    exec(command, { timeout: 10000 }, async (error, stdout, stderr) => {
      try { unlinkSync(tmpFile); } catch (_) { }

      let finalStderr = stderr || (error && error.message && !stderr ? error.message : "");

      if (language === "typescript") {
        finalStderr = finalStderr
          .split("\n")
          .filter(line => !line.includes("ExperimentalWarning: Type Stripping is an experimental feature"))
          .filter(line => !line.includes("Use `node --trace-warnings"))
          .join("\n")
          .trim();
      }

      if (finalStderr.includes("is not recognized as an internal or external command")) {
        console.log(`Local runtime for ${language} missing. Falling back to remote...`);
        const remoteResult = await executeRemote(language, code);
        return resolve(remoteResult);
      }

      resolve({
        stdout: stdout || "",
        stderr: finalStderr,
        exitCode: error ? (error.code ?? 1) : 0,
      });
    });
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

    let ptyProcess = roomTerminals.get(`${roomId}_1`);
    if (!ptyProcess) {
      // fallback, try to find any terminal for this room
      const fallbackKey = Array.from(roomTerminals.keys()).find(k => k.startsWith(`${roomId}_`));
      if (fallbackKey) ptyProcess = roomTerminals.get(fallbackKey);
    }

    if (!ptyProcess) {
      return res.status(400).json({ error: "No active terminal session in this room." });
    }

    const filepath = activeFile.path.replace(/^\//, "");

    let cmdString = "";
    if (language === "python") {
      cmdString = `python "${filepath}"\r`;
    } else if (language === "javascript") {
      cmdString = `node "${filepath}"\r`;
    } else if (language === "typescript") {
      cmdString = `npx ts-node "${filepath}"\r`;
    } else if (language === "cpp" || language === "c") {
      const executable = platform() === "win32" ? "a.exe" : "./a.out";
      cmdString = `g++ "${filepath}" && ${executable}\r`;
    } else if (language === "rust") {
      const executable = platform() === "win32" ? `${filepath.replace('.rs', '.exe')}` : `./${filepath.replace('.rs', '')}`;
      cmdString = `rustc "${filepath}" && ${executable}\r`;
    } else if (language === "go") {
      cmdString = `go run "${filepath}"\r`;
    } else if (language === "java") {
      cmdString = `java "${filepath}"\r`;
    } else {
      cmdString = `${platform() === "win32" ? "" : "./"}"${filepath}"\r`;
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

    res.json({ success: true, message: "Sync successful" });

  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to write virtual files to server disk." });
  }
});

/* -------------------- CLEAR ROOM FILES (for folder re-import) ---- */

app.post("/fs/clear-room", (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: "roomId required" });

  const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);

  try {
    if (existsSync(roomCwd)) {
      rmSync(roomCwd, { recursive: true, force: true });
    }
    mkdirSync(roomCwd, { recursive: true });
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

app.post("/fs/clear-room", (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: "roomId is required" });

  const roomDir = join(tmpdir(), `liveshare_room_${roomId}`);
  try {
    if (existsSync(roomDir)) {
      rmSync(roomDir, { recursive: true, force: true });
    }
    res.json({ success: true, message: "Room cleared" });
  } catch (err) {
    console.error("Clear room error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/fs/create", (req, res) => {
  const { roomId, type, path } = req.body;
  try {
    const fullPath = join(tmpdir(), `liveshare_room_${roomId}`, path.replace(/^\//, ""));
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
const getGit = (roomId) => {
  const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
  return simpleGit(roomCwd);
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

/* -------------------- ERROR MAPPING HELPER -------------------- */
const simplifyGitError = (err) => {
  const msg = err.message || String(err);
  
  if (msg.includes("Authentication failed") || msg.includes("Invalid username or password")) {
    return "Your GitHub Token (PAT) is invalid or expired. Please check your settings.";
  }
  if (msg.includes("permission denied") || msg.includes("403")) {
    return "Permission denied. Ensure your token has 'repo' scope enabled.";
  }
  if (msg.includes("remote: Repository not found")) {
    return "GitHub repository not found. Please check the URL.";
  }
  if (msg.includes("couldn't find remote ref")) {
    return "Branch not found on GitHub. Try pushing your code first.";
  }
  if (msg.includes("rejected") || msg.includes("non-fast-forward")) {
    return "Sync blocked. Someone else has changed these files—try pulling changes first.";
  }
  if (msg.includes("CONFLICT") || msg.includes("Automatic merge failed")) {
    return "Merge conflict! You'll need to manually resolve differences in the files.";
  }
  if (msg.includes("already exists") && msg.includes("remote origin")) {
    return "Remote already exists. We've updated it to your new URL.";
  }
  
  return msg.split(':').pop().trim() || "An unexpected Git error occurred.";
};

app.post("/git/init", async (req, res) => {
  const { roomId, defaultBranch = "main", authorName, authorEmail } = req.body;
  try {
    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    if (!existsSync(roomCwd)) {
      mkdirSync(roomCwd, { recursive: true });
    }
    const git = getGit(roomId);
    await git.init();
    
    // Set default branch immediately
    await git.checkout(["-b", defaultBranch]);
    
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
  try {
    const git = getGit(roomId);
    if (authorName && authorEmail) {
      await git.addConfig("user.name", authorName);
      await git.addConfig("user.email", authorEmail);
    }
    await git.commit(message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/git/remote", async (req, res) => {
  const { roomId, remoteUrl } = req.body;
  try {
    const git = getGit(roomId);
    const remotes = await git.getRemotes();
    if (remotes.find(r => r.name === "origin")) {
      await git.removeRemote("origin");
    }
    await git.addRemote("origin", remoteUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/git/push", async (req, res) => {
  const { roomId, pat, username } = req.body;

  if (!pat || !username) {
    return res.status(400).json({ error: "GitHub PAT and username required" });
  }

  try {
    const git = getGit(roomId);

    // Get current branch
    const status = await git.status();
    const currentBranch = status.current;

    // Get remote URL
    let remoteUrl;
    try {
      remoteUrl = await git.remote(["get-url", "origin"]);
      remoteUrl = remoteUrl.trim();
    } catch (e) {
      return res.status(400).json({ error: "No remote repository configured. Please connect to a GitHub repository first." });
    }

    // Create authenticated URL
    const authUrl = remoteUrl.replace("https://github.com/", `https://${username}:${pat}@github.com/`);

    // Set upstream if not set
    try {
      await git.push(["-u", authUrl, currentBranch]);
    } catch (pushErr) {
      // If first push fails, try force with lease
      if (pushErr.message.includes("rejected") || pushErr.message.includes("failed to push")) {
        return res.status(400).json({
          error: "Push rejected. The remote contains work you don't have locally. Try pulling first."
        });
      }
      throw pushErr;
    }

    res.json({ success: true, message: `Pushed to ${currentBranch}` });
  } catch (err) {
    console.error("Push error:", err);
    res.status(500).json({ error: simplifyGitError(err) });
  }
});

app.post("/git/pull", async (req, res) => {
  const { roomId, pat, username } = req.body;

  if (!pat || !username) {
    return res.status(400).json({ error: "GitHub PAT and username required" });
  }

  try {
    const git = getGit(roomId);

    // Get current branch
    const status = await git.status();
    const currentBranch = status.current;

    // Get remote URL
    let remoteUrl;
    try {
      remoteUrl = await git.remote(["get-url", "origin"]);
      remoteUrl = remoteUrl.trim();
    } catch (e) {
      return res.status(400).json({ error: "No remote repository configured. Please connect to a GitHub repository first." });
    }

    // Create authenticated URL
    const authUrl = remoteUrl.replace("https://github.com/", `https://${username}:${pat}@github.com/`);

    // Pull changes
    await git.pull(authUrl, currentBranch, { "--no-rebase": null, "--allow-unrelated-histories": null });

    res.json({ success: true, message: `Pulled from ${currentBranch}` });
  } catch (err) {
    console.error("Pull error:", err);
    res.status(500).json({ error: simplifyGitError(err) });
  }
});

app.post("/git/user-repos", async (req, res) => {
  const { pat } = req.body;
  if (!pat) return res.status(400).json({ error: "PAT required" });

  try {
    // Intelligent Token Detection
    const isFineGrained = pat.startsWith("github_pat_");
    const authHeader = isFineGrained ? `Bearer ${pat}` : `token ${pat}`;
    
    const headers = {
      "Authorization": authHeader,
      "Accept": "application/vnd.github.v3+json",
    };

    // Fine-grained tokens perform better with the specific API version header
    if (isFineGrained) {
      headers["X-GitHub-Api-Version"] = "2022-11-28";
    }

    console.log(`[GitHub API] Fetching repos using ${isFineGrained ? "Fine-grained" : "Classic"} token prefix.`);

    const response = await axios.get("https://api.github.com/user/repos", {
      params: { 
        sort: "updated", 
        per_page: 100,
        type: "all",
        affiliation: "owner,collaborator,organization_member"
      },
      headers
    });

    if (response.data.length === 0) {
      // Diagnostic log for empty results
      console.warn(`[GitHub API] Success but 0 repos found. Token identity: ${pat.substring(0, 10)}...`);
    }

    res.json(response.data.map(r => ({ name: r.full_name, url: r.clone_url })));
  } catch (err) {
    const errorData = err.response?.data || {};
    console.error("Fetch repos error:", errorData.message || err.message);
    
    // Provide a more descriptive error if we can
    const friendlyError = errorData.message?.includes("Bad credentials") 
      ? "Invalid GitHub token. Please check your token and try again."
      : (errorData.message || "Failed to fetch repositories");

    res.status(err.response?.status || 500).json({ error: friendlyError });
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
app.post("/api/rooms/:roomId/invite", async (req, res) => {
  const { roomId } = req.params;
  const { emails, inviter, roomType, isHost } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "At least one email address is required." });
  }

  // Permission logic: Interview mode requires host status
  if (roomType === "Interview" && !isHost) {
    return res.status(403).json({ error: "Only the host can send invitations in Interview mode." });
  }

  try {
    const sendPromises = emails.map(email => sendInviteEmail(email, roomId, inviter || "A colleague"));
    await Promise.all(sendPromises);
    res.json({ success: true, message: `Invitations sent to ${emails.length} recipient(s).` });
  } catch (error) {
    console.error("Invite error:", error);
    res.status(500).json({ error: "Failed to send invitations. Please check SMTP configuration." });
  }
});

/* -------------------- TEST ROUTE -------------------- */

app.get("/", (req, res) => {
  res.send("Execution API running 🚀");
});

/* -------------------- SERVER START -------------------- */

const PORT = process.env.PORT || 1236;

server.listen(PORT, () => {
  console.log(`Execution server running on port ${PORT}`);
});