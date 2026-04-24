# Phase 2: Email Invite Option - Plan

**Goal:** Implement an email-based invitation system that allows users to send formal invitations to join a room.

## Proposed Changes

### Server-Side (Nodemailer & Routes)

#### [MODIFY] [server/package.json](file:///c:/Users/pc/Downloads/LiveShare/server/package.json)
- Add `nodemailer` to dependencies.

#### [MODIFY] [server/.env](file:///c:/Users/pc/Downloads/LiveShare/server/.env)
- Add SMTP placeholder variables:
  ```env
  SMTP_HOST=smtp.mailtrap.io
  SMTP_PORT=2525
  SMTP_USER=your_user
  SMTP_PASS=your_pass
  ```

#### [NEW] [server/services/emailService.js](file:///c:/Users/pc/Downloads/LiveShare/server/services/emailService.js)
- Implement a `sendInviteEmail` function using Nodemailer.
- Create an elegant HTML template for the invitation.

#### [MODIFY] [server/api.js](file:///c:/Users/pc/Downloads/LiveShare/server/api.js)
- Add a new `POST /api/rooms/:roomId/invite` route.
- Implement permission logic:
  - Collaborative Mode: Anyone can call this.
  - Interview Mode: Only the host (verified via some token or session) can call this.
  - *Note*: If host verification isn't fully implemented yet, I'll add a placeholder or simple check against the room's host ID.

### Client-Side (UI & Join Flow)

#### [NEW] [client/src/components/editor/InviteModal.jsx](file:///c:/Users/pc/Downloads/LiveShare/client/src/components/editor/InviteModal.jsx)
- Create a sleek modal for inputting email addresses.
- Match the "Neon Luminary" aesthetic.
- Support sending to multiple emails.

#### [MODIFY] [client/src/components/editor/Navbar.jsx](file:///c:/Users/pc/Downloads/LiveShare/client/src/components/editor/Navbar.jsx)
- Add a dedicated "Invite" button with a unique icon (e.g., `Send` or `Mail` from Lucide).
- Pass necessary props (`isHost`, `roomType`) to handle visibility/disabling in Interview mode.

#### [MODIFY] [client/src/components/Landing.jsx](file:///c:/Users/pc/Downloads/LiveShare/client/src/components/Landing.jsx)
- Update `useEffect` to parse the `room` URL parameter.
- Automatically set the `joinId` state if the parameter exists.

#### [MODIFY] [client/src/App.jsx](file:///c:/Users/pc/Downloads/LiveShare/client/src/App.jsx)
- Ensure the `Landing` component can receive an initial room ID from the URL.

## Verification Plan

### Automated Tests
- Test the `/api/rooms/:roomId/invite` endpoint with a mock SMTP server (Mailtrap).
- Verify that the invite link generated contains the correct `?room=ID` parameter.

### Manual Verification
- Join a room, click the "Invite" button, send an email to a test address.
- Click the link in the email and verify that the `Landing` page has the Room ID autofilled.
- Test in both Collaborative and Interview modes to verify permission logic.
