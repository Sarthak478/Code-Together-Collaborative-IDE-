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


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* -------------------- ROOM TRACKING -------------------- */

const roomClients = new Map();  // roomId -> Set(ws)
const roomQueues = new Map();   // roomId -> { running, queue }

/* -------------------- PTY TERMINALS -------------------- */
const roomTerminals = new Map(); // roomId -> ptyProcess
const roomTerminalHistory = new Map(); // roomId -> string (last N chars)
const roomWatchers = new Map(); // roomId -> chokidarWatcher

function ensureWatcher(roomId, roomCwd) {
  if (roomWatchers.has(roomId)) return;

  console.log(`[WATCHER] Starting for room ${roomId} at ${roomCwd}`);
  const watcher = chokidar.watch(roomCwd, {
    ignored: [/(^|[\/\\])\../, "**/node_modules/**", "**/.git/**"],
    persistent: true,
    ignoreInitial: true,
    depth: 10,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  roomWatchers.set(roomId, watcher);

  const notifyChange = (filePath) => {
    let rel = relative(roomCwd, filePath).replace(/\\/g, "/");
    if (!rel.startsWith("/")) rel = "/" + rel;
    const parentPath = dirname(rel).replace(/\\/g, "/");

    console.log(`[FS:EVENT] ${rel} in room ${roomId}`);
    broadcast(roomId, {
      type: "fs:changed",
      path: rel,
      parentPath: parentPath === "." ? "/" : parentPath,
    });
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
    if (!roomId) { ws.close(); return; }

    const shell = platform() === "win32" ? "powershell.exe" : "bash";
    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    if (!existsSync(roomCwd)) {
      mkdirSync(roomCwd, { recursive: true });
    }

    // Spawn new PTY if not exists for this room
    if (!roomTerminals.has(roomId)) {
      console.log(`Spawning terminal for room ${roomId} using ${shell} at ${roomCwd}`);

      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: roomCwd,
        env: process.env
      });

      roomTerminals.set(roomId, ptyProcess);
      roomTerminalHistory.set(roomId, "");

      ptyProcess.onData((data) => {
        // Broadcast to all terminal clients in room
        wss.clients.forEach(client => {
          if (client.roomId === roomId && client.isTerminal && client.readyState === 1) {
            client.send(JSON.stringify({ type: "output", data }));
          }
        });

        // Save history (last 5000 chars)
        let hist = roomTerminalHistory.get(roomId) + data;
        if (hist.length > 5000) hist = hist.slice(-5000);
        roomTerminalHistory.set(roomId, hist);
      });

      ptyProcess.onExit(({ exitCode }) => {
        console.log(`Terminal for room ${roomId} exited with code ${exitCode}`);
        roomTerminals.delete(roomId);
        wss.clients.forEach(client => {
          if (client.roomId === roomId && client.isTerminal && client.readyState === 1) {
            client.send(JSON.stringify({ type: "exit", code: exitCode }));
          }
        });
      });
    }

    // Start file watcher for the room
    ensureWatcher(roomId, roomCwd);

    ws.roomId = roomId;
    ws.isTerminal = true;

    // Send history to new client
    const hist = roomTerminalHistory.get(roomId);
    if (hist) {
      ws.send(JSON.stringify({ type: "output", data: hist }));
    }

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        const ptyProcess = roomTerminals.get(roomId);
        if (!ptyProcess) return;

        if (data.type === "input") {
          ptyProcess.write(data.data);
        } else if (data.type === "resize") {
          try { ptyProcess.resize(data.cols, data.rows); } catch (e) { }
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
        if (!roomClients.has(data.roomId)) {
          roomClients.set(data.roomId, new Set());
        }
        roomClients.get(data.roomId).add(ws);
        ws.roomId = data.roomId;
        ws.isTerminal = false;

        const roomCwd = join(tmpdir(), `liveshare_room_${data.roomId}`);
        if (!existsSync(roomCwd)) mkdirSync(roomCwd, { recursive: true });
        ensureWatcher(data.roomId, roomCwd);

        console.log(`[WS] Client joined room: ${data.roomId}`);
      }
    } catch (e) {
      console.error("WS message parse error", e);
    }
  });

  ws.on("close", () => {
    if (ws.roomId && !ws.isTerminal && roomClients.has(ws.roomId)) {
      roomClients.get(ws.roomId).delete(ws);
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

    const ptyProcess = roomTerminals.get(roomId);
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

app.delete("/fs/delete", (req, res) => {
  const { roomId, path } = req.body;
  try {
    const fullPath = join(tmpdir(), `liveshare_room_${roomId}`, path.replace(/^\//, ""));
    if (!existsSync(fullPath)) return res.json({ success: true });
    if (fs.statSync(fullPath).isDirectory()) rmSync(fullPath, { recursive: true, force: true });
    else unlinkSync(fullPath);
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

/* -------------------- TEST ROUTE -------------------- */

app.get("/", (req, res) => {
  res.send("Execution API running 🚀");
});

/* -------------------- SERVER START -------------------- */

const PORT = 1236;

server.listen(PORT, () => {
  console.log(`Execution server running at http://localhost:${PORT}`);
});