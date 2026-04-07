# External Integrations

**Analysis Date:** 2026-04-06

## APIs & External Services

**Collaboration Services:**
- Hocuspocus Cloud / Custom Server - Used for synchronizing Yjs documents.
  - Setup: `client/` connects to `ws://localhost:1235`

**Remote Code Execution:**
- Wandbox (or Piston-like service) - Fallback for languages not supported locally.
  - Integration: `server/services/wandbox.js`
  - Method: REST API via `axios`

## Data Storage

**Databases:**
- Redis - Used for persistent collaboration state.
  - Client: `ioredis`
  - Connection: Configured via env variables

**File Storage:**
- Local/Server Temp Storage - Files are synced to `tmpdir()` on the server for execution and terminal access.
  - Path pattern: `liveshare_room_{roomId}`

## Authentication & Identity

**Implementation:**
- Custom Room/User IDs - Currently uses `nanoid` for room creation.
- Session Management: Room-based connectivity via WebSockets.

## Monitoring & Observability

**Logs:**
- Console Logging - Server output tracked in `fe_log.txt` and terminal stdout.

## CI/CD & Deployment

**Hosting:**
- Planned for separate client/server deployment.

## Environment Configuration

**Required env vars:**
- `FRONTEND_URL` - Origin allowed by CORS
- `PORT` - API server port (default 1236)
- `REDIS_URL` (Optional) - For Redis persistence

## Webhooks & Callbacks

**Incoming:**
- WebSocket Connections - `/terminal` for PTY interaction, root for execution.

**Outgoing:**
- Wandbox API calls for remote execution.

---
*Integration audit: 2026-04-06*
