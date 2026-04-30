const { Redis } = require("@upstash/redis");
require("dotenv").config();

async function testRedis() {
    console.log("URL:", process.env.UPSTASH_REDIS_REST_URL);
    console.log("Token:", process.env.UPSTASH_REDIS_REST_TOKEN ? "Present" : "Missing");

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    try {
        const result = await redis.ping();
        console.log("Ping result:", result);
    } catch (error) {
        console.error("Redis connection error:", error);
    }
}

testRedis();
