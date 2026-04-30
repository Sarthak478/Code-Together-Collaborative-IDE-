const { Redis } = require("@upstash/redis");
const dotenv = require("dotenv");

dotenv.config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/* ── Room Management Helpers ── */

const getRoomMeta = async (roomId) => {
    // Upstash handles object serialization automatically if used with hgetall/hset
    // But we can also use a simple key for metadata since it's cleaner in Upstash
    return await redis.hgetall(`room:${roomId}`);
};

const setRoomMeta = async (roomId, meta) => {
    const pipeline = redis.pipeline();
    pipeline.hset(`room:${roomId}`, meta);
    pipeline.sadd('active_rooms', roomId);
    await pipeline.exec();
};

const deleteRoom = async (roomId) => {
    const pipeline = redis.pipeline();
    pipeline.del(`room:${roomId}`);
    pipeline.del(`room:${roomId}:approved`);
    pipeline.del(`room:${roomId}:denied`);
    pipeline.del(`room:${roomId}:waiting`);
    pipeline.srem('active_rooms', roomId);
    await pipeline.exec();
};

const isApproved = async (roomId, username) => {
    const result = await redis.sismember(`room:${roomId}:approved`, username);
    return result === 1;
};

const isDenied = async (roomId, username) => {
    const result = await redis.sismember(`room:${roomId}:denied`, username);
    return result === 1;
};

const approveUser = async (roomId, username) => {
    const pipeline = redis.pipeline();
    pipeline.sadd(`room:${roomId}:approved`, username);
    pipeline.srem(`room:${roomId}:denied`, username);
    pipeline.hdel(`room:${roomId}:waiting`, username);
    await pipeline.exec();
};

const denyUser = async (roomId, username) => {
    const pipeline = redis.pipeline();
    pipeline.srem(`room:${roomId}:approved`, username);
    pipeline.sadd(`room:${roomId}:denied`, username);
    pipeline.hdel(`room:${roomId}:waiting`, username);
    await pipeline.exec();
};

const addWaitingUser = async (roomId, username, metadata) => {
    // Upstash automatically serializes objects in hashes
    await redis.hset(`room:${roomId}:waiting`, { [username]: metadata });
};

const getWaitingUsers = async (roomId) => {
    const waiting = await redis.hgetall(`room:${roomId}:waiting`);
    if (!waiting) return [];
    return Object.values(waiting);
};

const removeWaitingUser = async (roomId, username) => {
    await redis.hdel(`room:${roomId}:waiting`, username);
};

const getActiveRooms = async () => {
    return await redis.smembers('active_rooms');
};

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
    getActiveRooms
};
