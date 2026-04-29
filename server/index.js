const { Server } = require("@hocuspocus/server");
const { parse } = require("url");
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { initAPI } = require("./api.js");
const {
    getRoomMeta,
    setRoomMeta,
    deleteRoom,
    isApproved,
    isDenied,
    approveUser,
    denyUser,
    addWaitingUser,
    getWaitingUsers,
    removeWaitingUser
} = require("./services/redisService");

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
    /\.onrender\.com$/,
    /\.netlify\.app$/
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

// Live state (not persisted in Redis because they represent active memory/sockets)
const deletionTimers = new Map();
const activeConnections = new Map();
const roomConnections = new Map();

// --- Hocuspocus Server ---
const hocuspocus = new Server({
    async onAuthenticate(data) {
        const { documentName, request, connection } = data;
        const parsedUrl = parse(request.url, true);
        const { username, hostToken } = parsedUrl.query;

        const meta = await getRoomMeta(documentName);
        if (!meta || Object.keys(meta).length === 0) {
            throw new Error("Room does not exist");
        }

        const roomType = meta.roomType;
        const hostTokenStored = meta.hostToken;
        const limit = parseInt(meta.limit, 10) || 0;

        if (roomType === "broadcast") return;
        if (hostToken && hostTokenStored === hostToken) return;
        
        if (await isDenied(documentName, username)) throw new Error("Access Denied");

        const currentActive = activeConnections.get(documentName) || 0;
        const approved = await isApproved(documentName, username);

        if (limit > 0 && currentActive >= limit && !approved) {
            throw new Error("Room Limit Reached");
        }

        if (!approved) throw new Error("Waiting for host approval");

        if (!roomConnections.has(documentName)) roomConnections.set(documentName, new Map());
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
                console.log(`Room ${documentName} expired and cleaned from Redis.`);
                activeConnections.delete(documentName);
                deletionTimers.delete(documentName);
                roomConnections.delete(documentName);

                await deleteRoom(documentName);

                try {
                    const axios = require("axios");
                    await axios.post(`http://localhost:${PORT}/fs/clear-room`, { roomId: documentName });
                } catch(e) {}
            }, 60000);
            deletionTimers.set(documentName, timeout);
        }
    }
});

// --- API Routes ---

app.get("/rooms", (req, res) => {
    res.json(Array.from(activeConnections.keys()));
});

app.post("/room/:roomId/create", async (req, res) => {
    const { roomId } = req.params;
    const { hostToken, roomType } = req.body;
    
    const existing = await getRoomMeta(roomId);
    if (existing && Object.keys(existing).length > 0) {
        if (existing.hostToken !== hostToken) {
            return res.status(403).json({ success: false, error: "Room already exists" });
        }
    } else {
        await setRoomMeta(roomId, {
            hostToken,
            roomType: roomType || "collaborative",
            limit: "0",
            createdAt: Date.now().toString()
        });
    }
    res.json({ success: true });
});

app.post("/room/:roomId/join-request", async (req, res) => {
    const { roomId } = req.params;
    const { username } = req.body;

    const meta = await getRoomMeta(roomId);
    if (!meta || Object.keys(meta).length === 0) {
        return res.status(404).json({ success: false, error: "Room not found" });
    }

    if (await isDenied(roomId, username)) {
        return res.status(403).json({ success: false, error: "Access Denied" });
    }

    const limit = parseInt(meta.limit, 10) || 0;
    const currentActive = activeConnections.get(roomId) || 0;
    const approved = await isApproved(roomId, username);

    if (limit > 0 && currentActive >= limit && !approved) {
        return res.status(403).json({ success: false, error: "Capacity reached" });
    }

    if (!approved) {
        await addWaitingUser(roomId, username, { username, timestamp: Date.now() });
    }

    res.json({ success: true, status: approved ? "approved" : "waiting" });
});

app.post("/room/:roomId/:action", async (req, res) => {
    const { roomId, action } = req.params;
    const { hostToken, username, limit } = req.body;
    
    const meta = await getRoomMeta(roomId);
    if (!meta || meta.hostToken !== hostToken) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    if (action === "approve") {
        await approveUser(roomId, username);
    } else if (action === "deny" || action === "kick") {
        await denyUser(roomId, username);
        const conns = roomConnections.get(roomId);
        if (conns && conns.has(username)) {
            conns.get(username).close(4003, "Kicked");
            conns.delete(username);
        }
    } else if (action === "limit") {
        await setRoomMeta(roomId, { ...meta, limit: limit.toString() });
    } else if (action === "destroy") {
        const conns = roomConnections.get(roomId);
        if (conns) for (const c of conns.values()) c.close(4004, "Destroyed");
        
        await deleteRoom(roomId);
        activeConnections.delete(roomId);
        roomConnections.delete(roomId);
    }
    res.json({ success: true });
});

app.get("/room/:roomId/status", async (req, res) => {
    const { roomId } = req.params;
    const { username } = req.query;
    
    const meta = await getRoomMeta(roomId);
    if (!meta || Object.keys(meta).length === 0) return res.json({ status: "destroyed" });
    
    if (await isDenied(roomId, username)) return res.json({ status: "denied" });
    if (await isApproved(roomId, username)) return res.json({ status: "approved" });
    
    const waiting = await getWaitingUsers(roomId);
    if (waiting.some(u => u.username === username)) return res.json({ status: "waiting" });
    
    res.json({ status: "unknown" });
});

app.get("/room/:roomId/waiting", async (req, res) => {
    const { roomId } = req.params;
    const { hostToken } = req.query;
    
    const meta = await getRoomMeta(roomId);
    if (!meta || meta.hostToken !== hostToken) return res.status(403).json({ error: "Unauthorized" });
    
    const waiting = await getWaitingUsers(roomId);
    res.json({ success: true, waiting, limit: parseInt(meta.limit, 10) || 0 });
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