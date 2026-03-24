import { Server } from "@hocuspocus/server";

const deletionTimers = new Map();
const activeConnections = new Map();

const server = new Server({
    port: 1235,

    onRequest(data) {
        return new Promise((resolve, reject) => {
            const { request, response } = data;
            
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

            if (request.method === "OPTIONS") {
                response.writeHead(200);
                response.end();
                return reject();
            }

            if (request.url === "/rooms" && request.method === "GET") {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify(Array.from(activeConnections.keys())));
                return reject();
            }

            resolve();
        });
    },

    onConnect({ documentName }) {
        const current = activeConnections.get(documentName) || 0;
        const updated = current + 1;

        activeConnections.set(documentName, updated);

        console.log(`Client joined ${documentName}. Active: ${updated}`);

        if (deletionTimers.has(documentName)) {
            clearTimeout(deletionTimers.get(documentName));
            deletionTimers.delete(documentName);
            console.log(`Deletion cancelled for ${documentName}`);
        }
    },

    onDisconnect({ documentName }) {
        const current = activeConnections.get(documentName) || 1;
        const updated = current - 1;

        activeConnections.set(documentName, updated);

        console.log(`Client left ${documentName}. Active: ${updated}`);

        if (updated === 0) {
            console.log(`Room ${documentName} empty. Starting 60s timer.`);

            const timeout = setTimeout(() => {
                console.log(`Room ${documentName} expired (no active users).`);

                activeConnections.delete(documentName);
                deletionTimers.delete(documentName);

            }, 60000);

            deletionTimers.set(documentName, timeout);
        }
    }
});

server.listen().then(() => {
    console.log("Yjs collaboration server running on ws://localhost:1235 🚀");
});