/**
 * kill-ports.js
 * Kills any processes holding ports 1235 and 1236 before starting the server.
 * Works on Windows (PowerShell) and Unix (lsof/kill).
 */
import { execSync } from "child_process";

const PORTS = [1235, 1236];

function killPort(port) {
  try {
    if (process.platform === "win32") {
      // Get PIDs listening on the port
      const output = execSync(
        `netstat -ano | findstr :${port}`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      );
      const pids = new Set();
      output.split("\n").forEach(line => {
        // Only kill processes that are LISTENING, not TIME_WAIT etc.
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0") pids.add(pid);
        }
      });
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`[kill-ports] Killed PID ${pid} on port ${port}`);
        } catch (_) {}
      }
    } else {
      // Unix
      try {
        const pid = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
        if (pid) {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          console.log(`[kill-ports] Killed PID ${pid} on port ${port}`);
        }
      } catch (_) {}
    }
  } catch (_) {
    // Port was not in use — that's fine
  }
}

for (const port of PORTS) {
  killPort(port);
}

console.log("[kill-ports] Ports cleared. Starting servers...");
