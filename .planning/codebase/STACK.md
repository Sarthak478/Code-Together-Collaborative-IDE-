# Technology Stack

**Analysis Date:** 2026-04-06

## Languages

**Primary:**
- JavaScript (ES Modules) - All application code (Client & Server)
- HTML/CSS - UI structure and styling

**Secondary:**
- Shell (Bash/Powershell) - Terminal executions within the IDE

## Runtime

**Environment:**
- Node.js (Server)
- Browser (Client)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present in `client/` and `server/`

## Frameworks

**Core:**
- React 18.2 - Client UI framework
- Express 5.2 - Server HTTP API
- Vite 8.0 (Beta) - Client build tool and dev server

**Collaboration:**
- Yjs & Hocuspocus - Shared state and CRDT-based collaboration

**Terminal:**
- Xterm.js - Client-side terminal emulator
- node-pty - Server-side pseudo-terminal spawn

**Styling:**
- TailwindCSS 4.2 - Utility-first CSS framework
- Framer Motion - UI animations

## Key Dependencies

**Critical:**
- `yjs` - Core CRDT library for collaboration
- `@hocuspocus/server` / `@hocuspocus/provider` - WebSocket-based sync for Yjs
- `@uiw/react-codemirror` - Code editor component
- `node-pty` - Enables real-time terminal interaction
- `peerjs` - P2P connection capabilities

**Infrastructure:**
- `express` - Main API server
- `ioredis` - Redis client for state persistence
- `simple-git` - Git integration features
- `chokidar` - File system watching for real-time updates

## Configuration

**Environment:**
- `.env` files (gitignored) - Stores `FRONTEND_URL`, `PORT`, etc.
- `dotenv` used to load variables

**Build:**
- `client/vite.config.ts` - Vite configuration
- `client/postcss.config.js` - CSS processing

## Platform Requirements

**Development:**
- Node.js environment
- Windows/Linux/macOS supported (specific handling for `node-pty` and shell paths)

**Production:**
- Node.js server (e.g., Docker, VPS)
- Static hosting for Vite client (e.g., Vercel, Netlify)

---
*Stack analysis: 2026-04-06*
