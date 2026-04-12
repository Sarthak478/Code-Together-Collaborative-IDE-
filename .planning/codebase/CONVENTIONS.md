# Coding Conventions

**Analysis Date:** 2026-04-06

## General Styles

- **ES Modules**: The project uses modern ES Modules (\`import\`/\`export\`) on both the client (Vite/React) and server (Node.js).
- **Naming Conventions**:
    - **Components**: PascalCase (e.g., \`IDERoom.jsx\`).
    - **Variables/Functions**: camelCase (e.g., \`activeConnections\`, \`runCode\`).
    - **Constants**: UPPER_SNAKE_CASE (e.g., \`API_URL\`, \`FRONTEND_URL\`).

## React/Frontend Patterns

- **Functional Components**: All components are written as functional components with hooks.
- **Component-Hook Separation**: Each major feature or page has a corresponding hook (e.g., \`useIDERoom.js\`) containing the business logic and shared states. This is a core pattern in this codebase.
- **Hooks API**: Standard \`useEffect\`, \`useRef\`, \`useState\`, and \`useCallback\` are used extensively.
- **UI Framework**: Lucide React for icons, Framer Motion for animations.

## Server-side Patterns

- **Sanitization**: Paths are sanitized before being used in file system operations (e.g., \`sanitizePath\`).
- **Rate Limiting**: \`express-rate-limit\` is applied to the main API routes.
- **Resource Cleanup**: Automated deletion timers for empty rooms (60s delay) ensure server memory and disk space are cleared.

## Error Handling

- **Try-Catch**: Used in almost all asynchronous operations and REST API endpoints.
- **Graceful Failure**: Fallback mechanisms (e.g., switching from local to remote execution) are implemented.

---
*Conventions analysis: 2026-04-06*
