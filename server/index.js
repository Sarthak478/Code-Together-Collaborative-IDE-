import { Server } from "@hocuspocus/server";
import { parse } from "url";

const deletionTimers = new Map();
const activeConnections = new Map();

// --- Access Control State ---
// roomId -> Set of approved usernames
const approvedUsers = new Map();
// roomId -> Set of denied/kicked usernames
const deniedUsers = new Map();
// roomId -> Map of username -> { username, status, timestamp }
const waitingUsers = new Map();
// roomId -> hostToken string
const roomHosts = new Map();
// roomId -> limit (number). 0 means unlimited
const roomLimits = new Map();
// roomId -> roomType (string, e.g., "collaborative", "interview", "broadcast")
const roomTypes = new Map();
// We also need to be able to kick active connections. Hocuspocus gives us connection instances.
// We can store connections in a Map: roomId -> Map of username -> connection
const roomConnections = new Map();

function initRoomState(roomId) {
    if (!approvedUsers.has(roomId)) approvedUsers.set(roomId, new Set());
    if (!deniedUsers.has(roomId)) deniedUsers.set(roomId, new Set());
    if (!waitingUsers.has(roomId)) waitingUsers.set(roomId, new Map());
    if (!roomLimits.has(roomId)) roomLimits.set(roomId, 0); // 0 = unlimited
    if (!roomConnections.has(roomId)) roomConnections.set(roomId, new Map());
}

function parseJSONBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 100000) { // Safety limit
                req.destroy();
                resolve({});
            }
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
        });
    });
}

function sendJSON(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    res.end(JSON.stringify(data));
}

const server = new Server({
    port: 1235,

    async onRequest(data) {
        const { request, response } = data;
        const parsedUrl = parse(request.url, true);
        const path = parsedUrl.pathname;

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (request.method === "OPTIONS") {
            response.writeHead(200);
            response.end();
            return Promise.reject(); // Reject to stop Hocuspocus from processing further
        }

        // /rooms info
        if (path === "/rooms" && request.method === "GET") {
            sendJSON(response, 200, Array.from(activeConnections.keys()));
            return Promise.reject();
        }

        // --- REST API for Access Control ---
        const roomMatch = path.match(/^\/room\/([^\/]+)\/(.+)$/);
        if (roomMatch) {
            const roomId = roomMatch[1];
            const action = roomMatch[2];
            initRoomState(roomId);

            if (request.method === "POST") {
                const body = await parseJSONBody(request);

                // Create room: initializes host and room type
                if (action === "create") {
                    const { hostToken, roomType } = body;
                    if (!roomHosts.has(roomId)) {
                        roomHosts.set(roomId, hostToken);
                        roomTypes.set(roomId, roomType || "collaborative");
                    } else if (roomHosts.get(roomId) !== hostToken) {
                        sendJSON(response, 403, { success: false, error: "Room already exists with a different host." });
                        return Promise.reject();
                    }
                    sendJSON(response, 200, { success: true });
                    return Promise.reject();
                }

                // Join request
                if (action === "join-request") {
                    const { username } = body;
                    // Check if denied
                    if (deniedUsers.get(roomId).has(username)) {
                        sendJSON(response, 403, { success: false, error: "Access Denied. The host rejected your request or you were kicked." });
                        return Promise.reject();
                    }
                    // Check limit
                    const limit = roomLimits.get(roomId);
                    const currentActive = activeConnections.get(roomId) || 0;
                    if (limit > 0 && currentActive >= limit && !approvedUsers.get(roomId).has(username)) {
                        sendJSON(response, 403, { success: false, error: "Access Denied. The room capacity limit has been reached." });
                        return Promise.reject();
                    }
                    
                    if (!approvedUsers.get(roomId).has(username)) {
                        waitingUsers.get(roomId).set(username, { username, timestamp: Date.now() });
                    }
                    sendJSON(response, 200, { success: true, status: approvedUsers.get(roomId).has(username) ? "approved" : "waiting" });
                    return Promise.reject();
                }

                // Host Actions
                const hostToken = body.hostToken;
                if (hostToken !== roomHosts.get(roomId)) {
                    sendJSON(response, 403, { success: false, error: "Unauthorized. Invalid host token." });
                    return Promise.reject();
                }

                if (action === "approve") {
                    const { username } = body;
                    waitingUsers.get(roomId).delete(username);
                    deniedUsers.get(roomId).delete(username);
                    approvedUsers.get(roomId).add(username);
                    sendJSON(response, 200, { success: true });
                    return Promise.reject();
                }

                if (action === "deny" || action === "kick") {
                    const { username } = body;
                    waitingUsers.get(roomId).delete(username);
                    approvedUsers.get(roomId).delete(username);
                    deniedUsers.get(roomId).add(username);

                    // Force disconnect the user if they are connected
                    const conns = roomConnections.get(roomId);
                    if (conns && conns.has(username)) {
                        conns.get(username).close(4003, "Kicked by host");
                        conns.delete(username);
                    }
                    sendJSON(response, 200, { success: true });
                    return Promise.reject();
                }

                if (action === "limit") {
                    const { limit } = body;
                    roomLimits.set(roomId, parseInt(limit, 10) || 0);
                    sendJSON(response, 200, { success: true });
                    return Promise.reject();
                }

                if (action === "destroy") {
                    const conns = roomConnections.get(roomId);
                    if (conns) {
                        for (const conn of conns.values()) {
                            try { conn.close(4004, "Room Destroyed"); } catch(e) {}
                        }
                    }
                    
                    const INTERNAL_API_URL = process.env.API_URL || "http://localhost:1236";
                    try {
                        await fetch(`${INTERNAL_API_URL}/fs/clear-room`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ roomId })
                        });
                    } catch(e) {
                        console.error("Failed to call /fs/clear-room", e);
                    }

                    approvedUsers.delete(roomId);
                    deniedUsers.delete(roomId);
                    waitingUsers.delete(roomId);
                    roomHosts.delete(roomId);
                    roomLimits.delete(roomId);
                    roomTypes.delete(roomId);
                    roomConnections.delete(roomId);
                    activeConnections.delete(roomId);
                    if (deletionTimers.has(roomId)) {
                        clearTimeout(deletionTimers.get(roomId));
                        deletionTimers.delete(roomId);
                    }

                    sendJSON(response, 200, { success: true });
                    return Promise.reject();
                }
            }

            if (request.method === "GET") {
                // Poll status for joiner
                if (action === "status") {
                    const username = parsedUrl.query.username;
                    if (!roomHosts.has(roomId)) {
                        sendJSON(response, 200, { status: "destroyed" });
                    } else if (deniedUsers.get(roomId).has(username)) {
                        sendJSON(response, 200, { status: "denied" });
                    } else if (approvedUsers.get(roomId).has(username)) {
                        sendJSON(response, 200, { status: "approved" });
                    } else if (waitingUsers.get(roomId).has(username)) {
                        sendJSON(response, 200, { status: "waiting" });
                    } else {
                        // User hasn't requested or state was reset
                        sendJSON(response, 200, { status: "unknown" });
                    }
                    return Promise.reject();
                }

                // Host polls waiting users
                if (action === "waiting") {
                    const hostToken = parsedUrl.query.hostToken;
                    if (hostToken !== roomHosts.get(roomId)) {
                        sendJSON(response, 403, { success: false, error: "Unauthorized" });
                        return Promise.reject();
                    }
                    const waitingList = Array.from(waitingUsers.get(roomId).values());
                    const limit = roomLimits.get(roomId);
                    sendJSON(response, 200, { success: true, waiting: waitingList, limit });
                    return Promise.reject();
                }
            }
        }

        return Promise.resolve();
    },

    async onAuthenticate(data) {
        const { documentName, request, connection } = data;
        const parsedUrl = parse(request.url, true);
        const { username, hostToken } = parsedUrl.query;

        initRoomState(documentName);
        const roomType = roomTypes.get(documentName);

        // If broadcast room, no authentication needed
        if (roomType === "broadcast") {
            return;
        }

        // Host verification
        if (hostToken && roomHosts.get(documentName) === hostToken) {
            return; // Host is always allowed
        }

        if (deniedUsers.get(documentName).has(username)) {
            throw new Error("Access Denied");
        }

        // Limit Check for new connections
        const limit = roomLimits.get(documentName);
        const currentActive = activeConnections.get(documentName) || 0;
        if (limit > 0 && currentActive >= limit && !approvedUsers.get(documentName).has(username)) {
            throw new Error("Room Limit Reached");
        }

        // Approval check
        if (!approvedUsers.get(documentName).has(username)) {
            throw new Error("Waiting for host approval");
        }

        // Validated!
        // Store connection so we can kick later
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
            console.log(`Room ${documentName} empty. Starting 60s timer.`);
            const timeout = setTimeout(async () => {
                console.log(`Room ${documentName} expired (no active users).`);
                activeConnections.delete(documentName);
                deletionTimers.delete(documentName);
                
                // Clean up all access control state
                approvedUsers.delete(documentName);
                deniedUsers.delete(documentName);
                waitingUsers.delete(documentName);
                roomHosts.delete(documentName);
                roomLimits.delete(documentName);
                roomTypes.delete(documentName);
                roomConnections.delete(documentName);

                const INTERNAL_API_URL = process.env.API_URL || "http://localhost:1236";
                try {
                    await fetch(`${INTERNAL_API_URL}/fs/clear-room`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ roomId: documentName })
                    });
                } catch(e) {
                    console.error("Failed to cleanup room folder", e);
                }
            }, 60000);
            deletionTimers.set(documentName, timeout);
        }
    }
});

server.listen().then(() => {
    console.log("Yjs collaboration server running on ws://localhost:1235 🚀");
});