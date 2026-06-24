const { parse } = require("url");
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { initAPI } = require("./api.js");
const { createCollaborationServer } = require("./utils/collaborationServer");
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
    removeWaitingUser,
    getActiveRooms
} = require("./services/redisService");
const {
    recordRoomCreated,
    recordRoomDestroyed,
    recordJoinRequest,
    recordApproval,
    recordDenial,
    recordConnectionCount,
    recordWaitingCount,
} = require("./services/adminMetrics");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 1236;

// CORS must run before redirects so browser preflight requests get the right headers.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
    FRONTEND_URL,
    "https://code-together.me",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    /\.onrender\.com$/,
    /\.netlify\.app$/
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(pattern => {
            if (pattern instanceof RegExp) return pattern.test(origin);
            return pattern === origin;
        });
        if (isAllowed) callback(null, true);
        else callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Force HTTPS Redirection (For Port 80 Security)
app.use((req, res, next) => {
    const host = req.header("host") || "";
    const forwardedProto = req.header("x-forwarded-proto");
    const upgradeHeader = String(req.header("upgrade") || "").toLowerCase();
    const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);

    if (
        process.env.NODE_ENV === "production" &&
        !isLocalHost &&
        upgradeHeader !== "websocket" &&
        forwardedProto &&
        forwardedProto !== "https"
    ) {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});

// Security Middleware (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "connect-src": [
                "'self'", 
                "data:",
                "https://code-together-collaborative-ide.onrender.com", 
                "wss://code-together-collaborative-ide.onrender.com",
                "https://code-together.me",
                "wss://code-together.me",
                "http://localhost:*",
                "ws://localhost:*",
                "wss://localhost:*"
            ],
            "img-src": ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net"],
            "worker-src": ["'self'", "blob:"],
            "frame-src": ["'self'"],
            "frame-ancestors": ["'self'"],
            "object-src": ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(express.json({ limit: "1000mb" }));

// Live state (not persisted in Redis because they represent active memory/sockets)
const deletionTimers = new Map();
const activeConnections = new Map();
const roomConnections = new Map();

// --- Hocuspocus Server ---
const collaboration = createCollaborationServer({
    serverOptions: {
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
        recordConnectionCount(documentName, updated);
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
        recordConnectionCount(documentName, updated);
        console.log(`Client left ${documentName}. Active: ${updated}`);

        if (updated === 0) {
            const timeout = setTimeout(async () => {
                console.log(`Room ${documentName} expired and cleaned from Redis.`);
                activeConnections.delete(documentName);
                deletionTimers.delete(documentName);
                roomConnections.delete(documentName);

                await deleteRoom(documentName);
                recordRoomDestroyed(documentName);

                try {
                    const axios = require("axios");
                    await axios.post(`http://localhost:${PORT}/fs/clear-room`, { roomId: documentName });
                } catch(e) {}
            }, 60000);
            deletionTimers.set(documentName, timeout);
        }
    }
    }
});
const hocuspocus = collaboration.hocuspocus;

// --- API Routes ---

app.get("/rooms", async (req, res) => {
    try {
        const rooms = await getActiveRooms();
        res.json(rooms || []);
    } catch (err) {
        res.json(Array.from(activeConnections.keys()));
    }
});

app.post("/room/:roomId/create", async (req, res) => {
    const { roomId } = req.params;
    const { hostToken, roomType, roomMode } = req.body;
    
    const existing = await getRoomMeta(roomId);
    if (existing && Object.keys(existing).length > 0) {
        if (existing.hostToken !== hostToken) {
            return res.status(403).json({ success: false, error: "Room already exists" });
        }
    } else {
        await setRoomMeta(roomId, {
            hostToken,
            roomType: roomType || "collaborative",
            roomMode: roomMode || "unknown",
            limit: "0",
            createdAt: Date.now().toString()
        });
        recordRoomCreated(roomId, { roomType, roomMode });
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
        const waiting = await getWaitingUsers(roomId);
        recordWaitingCount(roomId, waiting.length);
    }

    recordJoinRequest(roomId);

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
        const waiting = await getWaitingUsers(roomId);
        recordWaitingCount(roomId, waiting.length);
        recordApproval(roomId);
    } else if (action === "deny" || action === "kick") {
        await denyUser(roomId, username);
        const waiting = await getWaitingUsers(roomId);
        recordWaitingCount(roomId, waiting.length);
        recordDenial(roomId);
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
        recordConnectionCount(roomId, 0);
        recordWaitingCount(roomId, 0);
        recordRoomDestroyed(roomId);
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
        hocuspocus.webSocketServer.handleUpgrade(request, socket, head, (ws) => {
            hocuspocus.webSocketServer.emit("connection", ws, request);
        });
    }
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Unified Server running on port ${PORT}`);
    console.log(`   - API & Terminal: http://localhost:${PORT}`);
    console.log(`   - Collaboration: ${collaboration.available ? `ws://localhost:${PORT}` : "unavailable (dependency load failed)"}`);
    if (!collaboration.available) {
        console.warn(`[collaboration] Disabled because the collaboration server dependency failed to load: ${collaboration.error.message}`);
    }
});
