# System Architecture

**Analysis Date:** 2026-04-06

## Architectural Pattern

The project follows a **Client-Server Architecture** with a heavy focus on **Real-time Collaboration** using CRDTs (Conflict-free Replicated Data Types).

### Core Layers:
1.  **Transport Layer**: WebSockets (Hocuspocus/WS) for low-latency sync and REST (Express) for transactional operations.
2.  **Collaboration Layer**: Yjs manages shared state (text, awareness, file structure) across all clients.
3.  **Execution Layer**: Server-side PTY (node-pty) and filesystem isolation for running code.
4.  **UI Layer**: React-based modular component system with state synchronized via custom hooks.

## Data Flow

### 1. Document Synchronization
- **Input**: User types in CodeMirror.
- **Sync**: Yjs captures changes -> Hocuspocus Provider sends binary deltas via WS -> Hocuspocus Server broadcasts to other clients.
- **Output**: Remote clients apply deltas; UI updates.

### 2. Code Execution
- **Input**: User clicks "Run in Terminal".
- **Sync**: Client hits `/sync-and-run` (REST) with file contents -> Server writes files to `tmpdir()/liveshare_room_{roomId}`.
- **Trigger**: Server injects the appropriate run command (e.g., `python file.py`) into the room's PTY process.
- **Output**: PTY stdout/stderr is streamed back via WebSocket (`/terminal`) to the client's Xterm.js panel.

### 3. File System Operations
- **Management**: File tree structure is stored in a Yjs Map.
- **Persistence**: Server-side `y-redis` can persist the Yjs document state.
- **Sync to Disk**: Occurs on-demand when code needs to be executed or a terminal session starts.

## Abstractions & Entry Points

### Frontend (client/src/):
- `main.jsx`: Application bootstrap.
- `App.jsx`: Root router and core state initialization.
- `hooks/useIDERoom.js`: The "Brain" of the IDE - manages all logic, socket connections, and editor state.
- `components/IDERoom.jsx`: The layout orchestrator for the IDE mode.

### Backend (server/):
- `index.js`: Hocuspocus (Yjs) collaboration server.
- `api.js`: Express server + Terminal WebSocket server + Execution engine.
- `services/wandbox.js`: Remote execution fallback service.

---
*Architecture analysis: 2026-04-06*
