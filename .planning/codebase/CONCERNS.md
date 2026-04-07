# Technical Concerns

**Analysis Date:** 2026-04-06

## Security Focus

- **Shell Injection**: Commands are dynamically constructed for code execution (e.g., \`python "${filepath}"\`). While \`sanitizePath\` is used, any bypass could lead to shell injection.
- **File System Access**: The server writes user code to the local \`tmpdir()\`. Although room-level isolation and cleanup exists, a malicious user might try to escape the room's directory or cause a denial-of-service by filling the disk.
- **Rate Limiting**: Currently applied via \`express-rate-limit\` in \`api.js\`, but might need adjustment for high-traffic collaborative sessions.

## Tech Debt

- **Testing Infrastructure**: Lack of automated unit or E2E tests. Current tests are manual scripts.
- **Dependency Management**: Using Vite 8.0 (Beta) in the client might introduce stability risks.
- **Code Duplication**: Logic for file syncing and execution is somewhat overlapping between different endpoints.

## Fragile Areas

- **PTY Terminal**: Dependency on \`node-pty\` and local OS shells (powershell/bash) makes the environment setup sensitive.
- **Browser Compatibility**: Heavy use of modern JS features and frameworks (Vite 8, Tailwind 4) may exclude older browsers.
- **PeerJS Connectivity**: P2P connections can be fragile depending on NAT/Firewall configurations.

## Performance & Scalability

- **Queue Bottlenecks**: Per-room execution queues prevent simultaneous runs within a room, but a global surge in executions across many rooms could still strain the server.
- **Memory Usage**: Hocuspocus/Yjs state in memory for all active rooms could grow significantly. Redis persistence is present but needs to be verified for large workspaces.

---
*Concerns analysis: 2026-04-06*
