# Testing Patterns

**Analysis Date:** 2026-04-06

## Test Framework

- **None**: The project currently does not use a formal testing framework (e.g., Vitest, Jest, Playwright).

## Manual Integration Tests

The project includes several manual integration scripts in the \`server/\` directory to verify core functionality:

- **Collaboration Sync**: \`server/test_sync.js\` – Verifies Yjs document synchronization between two providers on a common room.
- **Remote Execution**:
    - \`server/test_piston.js\` – Tests integration with the Piston API.
    - \`server/test_wandbox.js\` – Tests integration with the Wandbox API.

## Testing Practices

- **Manual Verification**: Features are manually tested within the browser during development.
- **Client-Side Debugging**: \`err3.txt\` and other log files are referenced for error tracing.
- **Server Logs**: Success and error messages are printed to the terminal console during room join, execution, and cleanup.

---
*Testing analysis: 2026-04-06*
