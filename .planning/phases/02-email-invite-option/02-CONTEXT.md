<decisions>
## Email Delivery Strategy
- **Provider**: Nodemailer (SMTP).
- **Configuration**: Placeholder environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) will be used in `.env`.
- **Note**: Mailtrap is recommended for development testing.

## UI & UX
- **Trigger**: A dedicated "Invite" icon in the `Navbar`.
- **Icon**: A unique, elegant icon (e.g., a paper plane or a glowing envelope) that fits the "Neon Luminary" theme.
- **Modal**: Clicking the icon will open a sleek `InviteModal` where users can input recipient email addresses.

## Join Flow
- **Mechanism**: The invite email will contain a link with a URL parameter (e.g., `https://liveshare.app/?room=ROOM_ID`).
- **Autofill**: The `Landing` page will parse this parameter and automatically populate the "Join Room" input field.

## Permissions & Logic
- **Collaborative Mode**: Any user in the room can send invites.
- **Interview Mode**: Only the room host has the "Invite" button enabled.
- **Email Content**: Minimalist, elegant, and creative HTML template including the Room ID and a direct join link.
</decisions>

<specifics>
- The invite modal should support sending to multiple emails (separated by commas or added one by one).
- The landing page should still require the user to pick a username after the room ID is autofilled.
</specifics>
