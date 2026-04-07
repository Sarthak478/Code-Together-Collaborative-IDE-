# Directory Structure

**Analysis Date:** 2026-04-06

## Root Directory

- `client/` - Frontend application (React + Vite).
- `server/` - Backend application (Express + Hocuspocus).
- `.planning/` - GSD (Get Shit Done) planning and codebase mapping.
- `.git/` - Git repository.

## Frontend (client/)

- `src/` - Main source code.
    - `components/` - React components.
        - `ui/` - Reusable UI elements (modals, buttons, toast).
        - `editor/` - Components shared between simpler editor and IDE.
        - `ide/` - IDE-specific panels (FileExplorer, Terminal, diffing).
    - `hooks/` - Custom hooks for business logic and state.
        - `useIDERoom.js` - Main logic handler for IDE.
        - `useEditorRoom.js` - Main logic for simple editor.
    - `assets/` - Static assets (images, fonts).
    - `constants/` - Shared constants (theme, limits).
    - `utils/` - Global utility functions.
- `public/` - Static assets served directly by Vite.

## Backend (server/)

- `index.js` - Main Hocuspocus (collaboration) server.
- `api.js` - Main Express server + WebSocket for terminals.
- `routes/` - REST API route handlers (v1, v2).
- `services/` - External service adapters (Wandbox, Piston).
- `utils/` - Server-side utility functions.
- `websocket/` - Terminal and execution websocket logic.

## Key Files:
- `client/src/config.js` - Frontend configuration (API URLs).
- `server/api.js` - Orchestration of code execution and PTY terminals.
- `server/.env` - Environment variables.

---
*Structure analysis: 2026-04-06*
