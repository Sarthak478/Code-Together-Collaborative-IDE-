import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { exec } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* -------------------- ROOM TRACKING -------------------- */

const roomClients = new Map();  // roomId -> Set(ws)
const roomQueues = new Map();   // roomId -> { running, queue }

/* -------------------- WEBSOCKET -------------------- */

wss.on("connection", (ws) => {

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "join" && data.roomId) {
        if (!roomClients.has(data.roomId)) {
          roomClients.set(data.roomId, new Set());
        }
        roomClients.get(data.roomId).add(ws);
        ws.roomId = data.roomId;
        console.log(`WS client joined room: ${data.roomId}`);
      }
    } catch (e) {
      console.error("WS message parse error", e);
    }
  });

  ws.on("close", () => {
    if (ws.roomId && roomClients.has(ws.roomId)) {
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
  // Languages that can only be highlighted, not run here
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

  // Define local vs remote strategy
  const localRuntimes = ["python", "javascript", "typescript"];
  const isLocalSupported = localRuntimes.includes(language);

  // If language is compiled and likely missing local compiler, go straight to Piston
  if (!isLocalSupported) {
    return await executeRemote(language, code);
  }

  // Otherwise, try local execution first
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
      
      // Filter out Node.js 22+ ExperimentalWarning for TypeScript stripping
      if (language === "typescript") {
        finalStderr = finalStderr
          .split("\n")
          .filter(line => !line.includes("ExperimentalWarning: Type Stripping is an experimental feature"))
          .filter(line => !line.includes("Use `node --trace-warnings"))
          .join("\n")
          .trim();
      }

      // If local command is missing, failover to remote
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

    // Resolve the job's promise so the HTTP response can send back the result
    if (job.resolve) job.resolve(result);

  } catch (err) {
    console.error("Execution error", err);
    broadcast(roomId, { type: "run:output", userId: job.userId, output: "Execution error: " + err.message, exitCode: 1 });
    if (job.resolve) job.resolve({ stdout: "", stderr: err.message, exitCode: 1 });
  } finally {
    room.running = false;
    processQueue(roomId); // Run next if any
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

  // Remove any pending job from this same user
  room.queue = room.queue.filter((job) => job.userId !== userId);

  if (room.running) {
    const position = room.queue.length + 1;
    room.queue.push({ userId, language, code, resolve: null });
    console.log(`Queued job in room ${roomId} by ${userId}. Position: ${position}`);
    return res.json({ status: "queued", position });
  }

  // Run immediately and wait for result so we can also return it in HTTP response
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

/* -------------------- TEST ROUTE -------------------- */

app.get("/", (req, res) => {
  res.send("Execution API running 🚀");
});

/* -------------------- SERVER START -------------------- */

const PORT = 1236;

server.listen(PORT, () => {
  console.log(`Execution server running at http://localhost:${PORT}`);
});