import { Server } from "@hocuspocus/server";
import { parse } from "url";
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { initAPI } from "./api.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 1236;

// Enable CORS for Express
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  /\.onrender\.com$/
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) return pattern.test(origin);
      return pattern === origin;
    });
    if (isAllowed) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

const deletionTimers = new Map();
const activeConnections = new Map();

// --- Access Control State ---
const approvedUsers = new Map();
const deniedUsers = new Map();
const waitingUsers = new Map();
const roomHosts = new Map();
const roomLimits = new Map();
const roomTypes = new Map();
const roomConnections = new Map();

function initRoomState(roomId) {
    if (!approvedUsers.has(roomId)) approvedUsers.set(roomId, new Set());
    if (!deniedUsers.has(roomId)) deniedUsers.set(roomId, new Set());
    if (!waitingUsers.has(roomId)) waitingUsers.set(roomId, new Map());
    if (!roomLimits.has(roomId)) roomLimits.set(roomId, 0);
    if (!roomConnections.has(roomId)) roomConnections.set(roomId, new Map());
}

// --- Hocuspocus Server ---
const hocuspocus = new Server({
    async onAuthenticate(data) {
        const { documentName, request, connection } = data;
        const parsedUrl = parse(request.url, true);
        const { username, hostToken } = parsedUrl.query;

        initRoomState(documentName);
        const roomType = roomTypes.get(documentName);

        if (roomType === "broadcast") return;
        if (hostToken && roomHosts.get(documentName) === hostToken) return;
        if (deniedUsers.get(documentName).has(username)) throw new Error("Access Denied");

        const limit = roomLimits.get(documentName);
        const currentActive = activeConnections.get(documentName) || 0;
        if (limit > 0 && currentActive >= limit && !approvedUsers.get(documentName).has(username)) {
            throw new Error("Room Limit Reached");
        }

        if (!approvedUsers.get(documentName).has(username)) throw new Error("Waiting for host approval");
        roomConnections.get(documentName).set(username, connection);
    },

    onConnect({ documentName }) {
        const current = activeConnections.get(documentName) || 0;
        const updated = current + 1;
        activeConnections.set(documentName, updated);
        console.log(`Client joined ${documentName}. Active: ${updated}`);

        if (deletionTimers.has(documentName)) {
            clearTimeout(deletionTimers.get(documentName));
            deletionTimers.delete(documentName);
        }
    },

    onDisconnect({ documentName, request }) {
        let username;
        try {
            if (request && request.url) {
                const parsedUrl = parse(request.url, true);
                username = parsedUrl.query.username;
            }
        } catch (_) {}

        if (username && roomConnections.has(documentName)) {
            roomConnections.get(documentName).delete(username);
        }

        const current = activeConnections.get(documentName) || 1;
        const updated = current - 1;
        activeConnections.set(documentName, updated);
        console.log(`Client left ${documentName}. Active: ${updated}`);

        if (updated === 0) {
            const timeout = setTimeout(async () => {
                console.log(`Room ${documentName} expired.`);
                activeConnections.delete(documentName);
                deletionTimers.delete(documentName);
                approvedUsers.delete(documentName);
                deniedUsers.delete(documentName);
                waitingUsers.delete(documentName);
                roomHosts.delete(documentName);
                roomLimits.delete(documentName);
                roomTypes.delete(documentName);
                roomConnections.delete(documentName);

                // Call internal cleanup (localhost is fine here as it's the same process now)
                try {
                    await fetch(`http://localhost:${PORT}/fs/clear-room`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ roomId: documentName })
                    });
                } catch(e) {}
            }, 60000);
            deletionTimers.set(documentName, timeout);
        }
    }
});

// --- API Routes (Moved from Hocuspocus onRequest to Express) ---

app.get("/rooms", (req, res) => {
    res.json(Array.from(activeConnections.keys()));
});

app.post("/room/:roomId/create", (req, res) => {
    const { roomId } = req.params;
    const { hostToken, roomType } = req.body;
    initRoomState(roomId);
    if (!roomHosts.has(roomId)) {
        roomHosts.set(roomId, hostToken);
        roomTypes.set(roomId, roomType || "collaborative");
    } else if (roomHosts.get(roomId) !== hostToken) {
        return res.status(403).json({ success: false, error: "Room already exists" });
    }
    res.json({ success: true });
});

app.post("/room/:roomId/join-request", (req, res) => {
    const { roomId } = req.params;
    const { username } = req.body;
    initRoomState(roomId);
    if (deniedUsers.get(roomId).has(username)) {
        return res.status(403).json({ success: false, error: "Access Denied" });
    }
    const limit = roomLimits.get(roomId);
    const currentActive = activeConnections.get(roomId) || 0;
    if (limit > 0 && currentActive >= limit && !approvedUsers.get(roomId).has(username)) {
        return res.status(403).json({ success: false, error: "Capacity reached" });
    }
    if (!approvedUsers.get(roomId).has(username)) {
        waitingUsers.get(roomId).set(username, { username, timestamp: Date.now() });
    }
    res.json({ success: true, status: approvedUsers.get(roomId).has(username) ? "approved" : "waiting" });
});

app.post("/room/:roomId/:action", (req, res) => {
    const { roomId, action } = req.params;
    const { hostToken, username, limit } = req.body;
    if (hostToken !== roomHosts.get(roomId)) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    if (action === "approve") {
        waitingUsers.get(roomId).delete(username);
        deniedUsers.get(roomId).delete(username);
        approvedUsers.get(roomId).add(username);
    } else if (action === "deny" || action === "kick") {
        waitingUsers.get(roomId).delete(username);
        approvedUsers.get(roomId).delete(username);
        deniedUsers.get(roomId).add(username);
        const conns = roomConnections.get(roomId);
        if (conns && conns.has(username)) {
            conns.get(username).close(4003, "Kicked");
            conns.delete(username);
        }
    } else if (action === "limit") {
        roomLimits.set(roomId, parseInt(limit, 10) || 0);
    } else if (action === "destroy") {
        const conns = roomConnections.get(roomId);
        if (conns) for (const c of conns.values()) c.close(4004, "Destroyed");
        // ... cleanup state ...
        approvedUsers.delete(roomId); deniedUsers.delete(roomId); waitingUsers.delete(roomId);
        roomHosts.delete(roomId); roomLimits.delete(roomId); roomTypes.delete(roomId);
        roomConnections.delete(roomId); activeConnections.delete(roomId);
    }
    res.json({ success: true });
});

app.get("/room/:roomId/status", (req, res) => {
    const { roomId } = req.params;
    const { username } = req.query;
    if (!roomHosts.has(roomId)) return res.json({ status: "destroyed" });
    if (deniedUsers.get(roomId).has(username)) return res.json({ status: "denied" });
    if (approvedUsers.get(roomId).has(username)) return res.json({ status: "approved" });
    if (waitingUsers.get(roomId).has(username)) return res.json({ status: "waiting" });
    res.json({ status: "unknown" });
});

app.get("/room/:roomId/waiting", (req, res) => {
    const { roomId } = req.params;
    const { hostToken } = req.query;
    if (hostToken !== roomHosts.get(roomId)) return res.status(403).json({ error: "Unauthorized" });
    res.json({ success: true, waiting: Array.from(waitingUsers.get(roomId).values()), limit: roomLimits.get(roomId) });
});

// Initialize API routes and WS
const apiWss = initAPI(app, httpServer);

// Handle Websocket Upgrades
httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url);
    if (pathname === "/terminal" || pathname === "/execution") {
        apiWss.handleUpgrade(request, socket, head, (ws) => {
            apiWss.emit("connection", ws, request);
        });
    } else {
        hocuspocus.handleUpgrade(request, socket, head);
    }
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Unified Server running on port ${PORT}`);
    console.log(`   - API & Terminal: http://localhost:${PORT}`);
    console.log(`   - Collaboration: ws://localhost:${PORT}`);
});