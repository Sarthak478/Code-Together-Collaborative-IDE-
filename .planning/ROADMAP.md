# Roadmap

## Milestone 1: Production Deployment & Reliability

### [DONE] Phase 1: Domain Migration & Infrastructure
- [x] Integrate `code-together.me` domain.
- [x] Consolidate `FRONTEND_URL` and `CLIENT_URL`.
- [x] Update CORS policies in `index.js` and `api.js`.

### [DONE] Phase 2: Production Cleanup
- [x] Remove test scripts (`test_*.js`).
- [x] Delete diagnostic utilities and temporary log files.

### [IN PROGRESS] Phase 3: Email Invitation System
- [ ] Configure production SMTP with Resend/SendGrid.
- [ ] Verify invite link generation in production emails.

### [PENDING] Phase 4: Git Integration Refinement
- [ ] Fix Push/Pull reliability issues.
- [ ] Improve Source Control UX and error reporting.

## Backlog
- [ ] Real-time cursor presence enhancements.
- [ ] Multi-file search.
- [ ] Admin dashboard for room management.
