const { Redis } = require("@upstash/redis");
const dotenv = require("dotenv");

dotenv.config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const hasRedisConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let warnedAboutFallback = false;

const memoryStore = {
    roomMeta: new Map(),
    approved: new Map(),
    denied: new Map(),
    waiting: new Map(),
    activeRooms: new Set(),
};

const getSet = (map, key) => {
    if (!map.has(key)) {
        map.set(key, new Set());
    }

    return map.get(key);
};

const getWaitingMap = (roomId) => {
    if (!memoryStore.waiting.has(roomId)) {
        memoryStore.waiting.set(roomId, new Map());
    }

    return memoryStore.waiting.get(roomId);
};

const warnFallback = (error) => {
    if (warnedAboutFallback) return;

    warnedAboutFallback = true;
    console.warn(
        "[redis] Falling back to in-memory room state for local/hybrid mode:",
        error?.message || error || "Redis unavailable"
    );
};

const withFallback = async (remoteAction, fallbackAction) => {
    if (!hasRedisConfig) {
        return fallbackAction();
    }

    try {
        return await remoteAction();
    } catch (error) {
        warnFallback(error);
        return fallbackAction();
    }
};

const getRoomMeta = async (roomId) =>
    withFallback(
        async () => await redis.hgetall(`room:${roomId}`),
        () => memoryStore.roomMeta.get(roomId) || null
    );

const setRoomMeta = async (roomId, meta) =>
    withFallback(
        async () => {
            const pipeline = redis.pipeline();
            pipeline.hset(`room:${roomId}`, meta);
            pipeline.sadd("active_rooms", roomId);
            await pipeline.exec();
        },
        () => {
            memoryStore.roomMeta.set(roomId, { ...meta });
            memoryStore.activeRooms.add(roomId);
        }
    );

const deleteRoom = async (roomId) =>
    withFallback(
        async () => {
            const pipeline = redis.pipeline();
            pipeline.del(`room:${roomId}`);
            pipeline.del(`room:${roomId}:approved`);
            pipeline.del(`room:${roomId}:denied`);
            pipeline.del(`room:${roomId}:waiting`);
            pipeline.srem("active_rooms", roomId);
            await pipeline.exec();
        },
        () => {
            memoryStore.roomMeta.delete(roomId);
            memoryStore.approved.delete(roomId);
            memoryStore.denied.delete(roomId);
            memoryStore.waiting.delete(roomId);
            memoryStore.activeRooms.delete(roomId);
        }
    );

const isApproved = async (roomId, username) =>
    withFallback(
        async () => {
            const result = await redis.sismember(`room:${roomId}:approved`, username);
            return result === 1;
        },
        () => getSet(memoryStore.approved, roomId).has(username)
    );

const isDenied = async (roomId, username) =>
    withFallback(
        async () => {
            const result = await redis.sismember(`room:${roomId}:denied`, username);
            return result === 1;
        },
        () => getSet(memoryStore.denied, roomId).has(username)
    );

const approveUser = async (roomId, username) =>
    withFallback(
        async () => {
            const pipeline = redis.pipeline();
            pipeline.sadd(`room:${roomId}:approved`, username);
            pipeline.srem(`room:${roomId}:denied`, username);
            pipeline.hdel(`room:${roomId}:waiting`, username);
            await pipeline.exec();
        },
        () => {
            getSet(memoryStore.approved, roomId).add(username);
            getSet(memoryStore.denied, roomId).delete(username);
            getWaitingMap(roomId).delete(username);
        }
    );

const denyUser = async (roomId, username) =>
    withFallback(
        async () => {
            const pipeline = redis.pipeline();
            pipeline.srem(`room:${roomId}:approved`, username);
            pipeline.sadd(`room:${roomId}:denied`, username);
            pipeline.hdel(`room:${roomId}:waiting`, username);
            await pipeline.exec();
        },
        () => {
            getSet(memoryStore.approved, roomId).delete(username);
            getSet(memoryStore.denied, roomId).add(username);
            getWaitingMap(roomId).delete(username);
        }
    );

const addWaitingUser = async (roomId, username, metadata) =>
    withFallback(
        async () => await redis.hset(`room:${roomId}:waiting`, { [username]: metadata }),
        () => getWaitingMap(roomId).set(username, metadata)
    );

const getWaitingUsers = async (roomId) =>
    withFallback(
        async () => {
            const waiting = await redis.hgetall(`room:${roomId}:waiting`);
            if (!waiting) return [];
            return Object.values(waiting);
        },
        () => Array.from(getWaitingMap(roomId).values())
    );

const removeWaitingUser = async (roomId, username) =>
    withFallback(
        async () => await redis.hdel(`room:${roomId}:waiting`, username),
        () => getWaitingMap(roomId).delete(username)
    );

const getActiveRooms = async () =>
    withFallback(
        async () => await redis.smembers("active_rooms"),
        () => Array.from(memoryStore.activeRooms)
    );

const getRedisStatus = () => ({
    configured: hasRedisConfig,
    fallbackMode: !hasRedisConfig || warnedAboutFallback,
});

module.exports = {
    redis,
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
    getActiveRooms,
    getRedisStatus,
};
