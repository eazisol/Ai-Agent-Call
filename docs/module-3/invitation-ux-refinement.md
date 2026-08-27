# M03 Post-Acceptance — Invitation UX refinement

| Field | Value |
| --- | --- |
| Module | M03 — Users, Team & Roles |
| Change type | Post-acceptance UX/security refinement |
| Date | 25 August 2026 |
| M03 status | Remains **COMPLETE ✅** |
| M04 status | **COMPLETE ✅** (27 August 2026) |

## User journeys

### Existing account + logged in (matching email)

Email → `/invitations/accept?token=` → preview → **Join team** → membership → `/team` (active org cookie set).

### Existing account + logged out

Preview `accountState: existing` → **Sign in to join** → M01 login with `next=` return → preview → **Join team**.

### New account

Preview `accountState: new` → **Create account to join** → register (email locked) with `returnTo` → verify email (link includes `next`) → sign in → return → **Join team**.

### Wrong account

Logged-in email ≠ invite email → blocked → **Sign in with invited account** (logout + login `next=`).

## Preview API (`GET /invitations/preview?token=`)

Only after a matching invite token hash:

- `status`: `valid` \| `expired` \| `cancelled` \| `accepted` \| `invalid`
- `accountState`: `existing` \| `new` (null when invalid)
- `invitedEmail`, masked email, org, role, inviter display name, expiry

No general email-enumeration endpoint.

## Auth handoff

- Reuses login `next` (sanitized relative paths only).
- Register accepts optional `returnTo` (validated); verification email appends safe `next`.
- Invite return is also remembered in a short-lived `eazi_invite_return` cookie (accept path only) so verify → login still returns to **Join team** if `next` is dropped.
- Users with zero workspaces are sent to the invite return path instead of “Create your workspace” when that cookie is present.
- No auth tokens in `localStorage`; cookies remain the session model.
- Invitation pages set `referrer: no-referrer`.

## Security

Normalized email match on accept; cancelled/expired/consumed distinct errors; already-member idempotent; owner invites still rejected; opaque hashed tokens unchanged.

## Manual QA evidence

| Flow | Result |
| --- | --- |
| FLOW 1 Logged-in match → Join team | Covered by domain + UI |
| FLOW 2 Logged-out existing → Sign in → Join | `next` + accountState |
| FLOW 3 New → register → verify → sign in → Join | `returnTo` on register/verify |
| FLOW 4 Wrong account blocked | Client + `INVITATION_EMAIL_MISMATCH` |
| FLOW 5 Expired/cancelled/used | Preview statuses + accept errors |
