# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure internal admin panel with guarded access and aggregate-only room and system metrics.

**Architecture:** Add a shared backend metrics service plus admin auth/session endpoints, then layer a dedicated frontend admin screen on top of those guarded APIs. Keep all private user content out of the admin payloads and expose only sanitized room/system summaries.

**Tech Stack:** Express, in-memory runtime state, React, Vite, existing CodeTogether frontend styles

---

### Task 1: Shared Admin Metrics Service

**Files:**
- Create: `server/services/adminMetrics.js`
- Modify: `server/index.js`
- Modify: `server/api.js`

- [ ] Add a shared metrics service for counters, room snapshots, and recent sanitized events
- [ ] Instrument room lifecycle events in the collaboration server
- [ ] Expose a snapshot builder for admin endpoints

### Task 2: Admin Auth and Guarded Endpoints

**Files:**
- Modify: `server/api.js`
- Modify: `server/services/redisService.js`

- [ ] Add admin login, logout, and session routes
- [ ] Add HTTP-only cookie session handling
- [ ] Add guarded `GET /admin/metrics`
- [ ] Return only aggregate and sanitized room/system data

### Task 3: Admin Frontend Route and Dashboard

**Files:**
- Create: `client/src/components/admin/AdminPanel.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/RoomWrapper.jsx`

- [ ] Add a separate admin route in the client app
- [ ] Add admin login UI and authenticated dashboard UI
- [ ] Poll admin metrics and render overview cards, room table, and recent event feed

### Task 4: Verification

**Files:**
- Modify: `server/index.js`
- Modify: `server/api.js`
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/admin/AdminPanel.jsx`

- [ ] Run server syntax checks
- [ ] Run client lint
- [ ] Run client build
- [ ] Report verification results and remaining environmental gaps
