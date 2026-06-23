# Admin Panel Design

## Goal

Add a secure internal admin panel that exposes aggregate operational insight for CodeTogether without revealing private user content.

## Scope

The admin panel will show:
- current room activity
- room creation and destruction flow
- join request and moderation counts
- local agent and terminal activity
- backend and Redis runtime status

The admin panel will not show:
- file contents
- chat contents
- code execution payloads
- raw usernames in the dashboard
- any user-provided messages or documents

## Access Model

The panel will use a dedicated admin login that is completely separate from product users.

Authentication requirements:
- a dedicated admin access key from environment
- a dedicated admin password or secret from environment
- an HTTP-only session cookie set by the backend
- all admin APIs protected server-side regardless of frontend route discovery

## Architecture

### Backend

Add two new backend concerns:

1. Admin auth/session handling
- login endpoint
- logout endpoint
- session endpoint
- cookie parsing and in-memory session store

2. Admin metrics aggregation
- shared in-memory metrics service
- room lifecycle counters
- sanitized recent event feed
- room snapshot shaping for the dashboard

### Frontend

Add a dedicated admin page in the client app:
- login screen when not authenticated
- dashboard view when authenticated
- periodic polling for metrics

## Data Rules

Allowed room-level fields:
- room id
- room type
- room mode
- created timestamp
- last active timestamp
- active connection count
- waiting request count
- room status

Allowed aggregate fields:
- total rooms created
- total rooms destroyed
- active rooms now
- active client connections now
- total join requests
- approvals
- denials
- local agents active
- local terminal bridges active
- run requests by execution path

## Security

- Admin credentials must come from environment variables
- Session cookie must be HTTP-only
- Session cookie should be `Secure` in production
- Session cookie should use `SameSite=Lax`
- Unauthorized admin API access always returns 401
- Missing admin configuration returns a safe configuration error

## Testing and Verification

Verification should include:
- server syntax validation
- protected endpoints reject unauthorized requests
- login creates a session cookie
- logout clears the session
- metrics endpoint returns only sanitized aggregate data
- client build and lint still pass
