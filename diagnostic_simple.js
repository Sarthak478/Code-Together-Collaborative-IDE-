// diagnostic_simple.js – minimal checks (no WS)
// Node v22 has global fetch, so no need for node-fetch.
import { createClient } from '@upstash/redis';

const BACKEND = process.env.API_URL || 'http://localhost:1236';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL.replace(/\"/g, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN.replace(/\"/g, '');
const redis = createClient({ url: REDIS_URL, token: REDIS_TOKEN });

async function healthCheck() {
  try { const res = await fetch(`${BACKEND}/health`); return res.ok; } catch { return false; }
}

async function createRoom() {
  try {
    const res = await fetch(`${BACKEND}/rooms`, { method: 'POST' });
    const data = await res.json();
    return data.roomId;
  } catch { return null; }
}

async function verifyRedis(roomId) {
  if (!roomId) return false;
  const meta = await redis.hget(`room:${roomId}`, 'hostToken');
  return !!meta;
}

(async () => {
  for (let i = 0; i < 3; i++) {
    console.log(`Attempt ${i + 1}`);
    if (!await healthCheck()) { console.warn('Backend health check failed'); continue; }
    const roomId = await createRoom();
    if (await verifyRedis(roomId)) {
      console.log('✅ All checks passed');
      process.exit(0);
    }
    console.warn('Redis entry missing for room', roomId);
  }
  console.error('❌ Diagnostics failed');
  process.exit(1);
})();
