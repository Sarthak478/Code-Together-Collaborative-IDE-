# Roadmap

## Milestone 1: Production Deployment & Reliability

### [DONE] Phase 1: Domain Migration & Infrastructure
- [x] Integrate `code-together.me` domain.
- [x] Consolidate `FRONTEND_URL` and `CLIENT_URL`.
- [x] Update CORS policies in `index.js` and `api.js`.

### [DONE] Phase 2: Production Cleanup
- [x] Remove test scripts (`test_*.js`).
- [x] Delete diagnostic utilities and temporary log files.

### [DONE] Phase 3: Email Invitation System & Security
- [x] Integrate Resend SDK for production email delivery.
- [x] Implement rate limiting for the invitation endpoint.
- [x] Fix WebSocket secure connection (WSS) issues for production.

### [PENDING] Phase 4: Git Integration Refinement
- [ ] Fix Push/Pull reliability issues.
- [ ] Improve Source Control UX and error reporting.

## Backlog
- [ ] Real-time cursor presence enhancements.
- [ ] Multi-file search.
- [ ] Admin dashboard for room management.
