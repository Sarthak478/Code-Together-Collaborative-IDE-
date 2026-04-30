import fetch from 'node-fetch';
import WebSocket from 'ws';
import { createClient } from '@upstash/redis';

const BACKEND = process.env.API_URL || 'http://localhost:1236';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL.replace(/\"/g, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN.replace(/\"/g, '');
const redis = createClient({ url: REDIS_URL, token: REDIS_TOKEN });

async function healthCheck() {
  try {
    const res = await fetch(`${BACKEND}/health`);
    return res.ok;
  } catch (_) { return false; }
}

async function wsCheck() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${BACKEND.replace('http', 'ws')}/ws`);
    ws.on('open', () => { ws.close(); resolve(true); });
    ws.on('error', () => resolve(false));
    setTimeout(() => resolve(false), 5000);
  });
}

async function createRoom() {
  try {
    const res = await fetch(`${BACKEND}/rooms`, { method: 'POST' });
    const data = await res.json();
    return data.roomId;
  } catch (_) { return null; }
}

async function verifyRedis(roomId) {
  if (!roomId) return false;
  const meta = await redis.hget(`room:${roomId}`, 'hostToken');
  return !!meta;
}

(async () => {
  for (let i = 0; i < 3; i++) {
    console.log(`Attempt ${i + 1} of diagnostics...`);
    const healthy = await healthCheck();
    const wsOk = await wsCheck();
    if (!healthy || !wsOk) { console.warn('Backend or WS unreachable'); continue; }
    const roomId = await createRoom();
    const redisOk = await verifyRedis(roomId);
    if (redisOk) { console.log('✅ All checks passed!'); process.exit(0); }
    console.warn('Redis entry missing for room', roomId);
  }
  console.error('❌ Diagnostics failed after 3 attempts');
  process.exit(1);
})();
