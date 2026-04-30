# Fix Frontend‑Backend Connection and Verify Redis

## Goal

Resolve the connection errors between the Netlify frontend (`https://coodetogether.netlify.app`) and the Render backend, ensure the environment variables are correct, and verify that the Redis‑based room persistence works in production. The plan will run a series of diagnostics (the “Ralph” checks) and then invoke the GSD autonomous workflow to apply any missing fixes automatically.

## User Review Required

> [!IMPORTANT]
> This plan will make the following changes automatically:
> - Update `client/.env` with the correct backend URLs.
> - Commit and push those changes to the repository (triggering a Netlify redeploy).
> - Restart the Render service after confirming the env vars.
> - Run a short test script that creates a room and checks Redis keys.
> - Execute `gsd‑autonomous` (or the equivalent GSD phase commands) to apply any remaining fixes.
>
> Please confirm you are okay with these automated changes and the redeploy cycle.

## Open Questions

- Do you want the backend URL to remain on Render (`https://code‑together‑collaborative‑ide.onrender.com`) or has it moved elsewhere?
  - **Answer:** No movement.
- Should we also clean up the duplicate `FRONTEND_URL` / `CLIENT_URL` variables, or keep them as‑is for backward compatibility?
  - **Answer:** We'll work on that later.
- Do you want the email invitation link to use `CLIENT_URL` or `FRONTEND_URL`? (Both are now the same, but confirming avoids future confusion.)
  - **Answer:** Use the one handling the most functionalities so it will be easy to remove the less‑used one in future.

## Proposed Changes

### 1️⃣ Update client environment

#### [MODIFY] client/.env
```diff
@@
- VITE_API_URL=https://code-together-collaborative-ide.onrender.com
- VITE_COLLAB_URL=https://code-together-collaborative-ide.onrender.com
- VITE_WS_URL=wss://code-together-collaborative-ide.onrender.com
+ VITE_API_URL=https://code-together-collaborative-ide.onrender.com
+ VITE_COLLAB_URL=https://code-together-collaborative-ide.onrender.com
+ VITE_WS_URL=wss://code-together-collaborative-ide.onrender.com
```
*(Replace placeholder URLs if the backend moves.)*

### 2️⃣ Commit & push changes

Create a small script `git-commit-push.sh` to stage, commit, and push `.env`.
```bash
#!/usr/bin/env bash
git add client/.env
git commit -m "fix: update client env URLs to match production backend"
git push origin main
```

### 3️⃣ Restart Render service (manual step)
- In Render dashboard, click **Manual Deploy** or **Restart** to pick up updated env vars.

### 4️⃣ Run diagnostic script (Ralph loop)
Create `diagnostic_loop.js` that:
1. Checks `/health` endpoint.
2. Opens a WebSocket.
3. Creates a room via API.
4. Verifies Redis entry.
5. Retries up to 3 times.
```js
import fetch from 'node-fetch';
import WebSocket from 'ws';
import { createClient } from '@upstash/redis';

const BACKEND = process.env.API_URL || 'http://localhost:1236';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL.replace(/"/g, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN.replace(/"/g, '');
const redis = createClient({ url: REDIS_URL, token: REDIS_TOKEN });

async function healthCheck() { const res = await fetch(`${BACKEND}/health`); return res.ok; }
async function wsCheck() { return new Promise(r=>{ const ws = new WebSocket(`${BACKEND.replace('http','ws')}/ws`); ws.on('open',()=>{ws.close();r(true)}); ws.on('error',()=>r(false));}); }
async function createRoom() { const res = await fetch(`${BACKEND}/rooms`,{method:'POST'}); const data = await res.json(); return data.roomId; }
async function verifyRedis(id){ const meta = await redis.hget(`room:${id}`,'hostToken'); return !!meta; }
(async()=>{ for(let i=0;i<3;i++){ console.log(`Attempt ${i+1}`); if(!(await healthCheck())||!(await wsCheck())){ console.warn('Backend/WS unreachable'); continue; } const id=await createRoom(); if(await verifyRedis(id)){ console.log('✅ All checks passed'); process.exit(0);} console.warn('Redis missing for',id);} console.error('❌ Diagnostics failed'); process.exit(1);})();
```
Run with `node diagnostic_loop.js` after deployment.

### 5️⃣ Execute GSD autonomous workflow
If diagnostics succeed, run:
```
npx -y gsd-autonomous --interactive
```
The `--interactive` flag pauses only for blockers needing your decision.

## Verification Plan

- **Automated:** Run `node diagnostic_loop.js` – expect exit code 0.
- **Manual:** Open `https://coodetogether.netlify.app`, create a room, confirm Upstash shows `room:<id>`.
- Send a test invitation email; the link should open the Netlify URL with the room ID.

---
*After you approve, I will execute the steps in order, committing changes, running diagnostics, and launching the GSD autonomous workflow.*
