// diagnostic_simple.js – minimal checks (no WS)
const { Redis } = require('@upstash/redis');

const BACKEND = 'https://code-together-collaborative-ide.onrender.com';
const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\"/g, '');
const REDIS_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || '').replace(/\"/g, '');

const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

async function createRoom() {
  try {
    const roomId = 'test-room-' + Date.now();
    const res = await fetch(`${BACKEND}/room/${roomId}/create`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken: 'test-token', roomType: 'collaborative', limit: 10 })
    });
    const text = await res.text();
    if (res.ok) {
      // It might be json, but we don't care about the body if it's ok for diagnostic
      return roomId;
    }
    console.error('API Error:', res.status, text);
    return null;
  } catch (e) { 
    console.error('Fetch Error:', e.message);
    return null; 
  }
}

async function verifyRedis(roomId) {
  if (!roomId) return false;
  const meta = await redis.hget(`room:${roomId}`, 'hostToken');
  const activeRooms = await redis.smembers('active_rooms');
  const inSet = activeRooms && activeRooms.includes(roomId);
  return !!meta && inSet;
}

(async () => {
  for (let i = 0; i < 3; i++) {
    console.log(`Attempt ${i + 1}`);
    const roomId = await createRoom();
    if (!roomId) { console.warn('Failed to create room via API'); continue; }
    
    if (await verifyRedis(roomId)) {
      console.log(`✅ All checks passed (Room: ${roomId} created and saved in Redis)`);
      process.exit(0);
    }
    console.warn('Redis entry missing for room', roomId);
  }
  console.error('❌ Diagnostics failed');
  process.exit(1);
})();
