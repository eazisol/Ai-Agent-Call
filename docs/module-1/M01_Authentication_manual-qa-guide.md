# M01 — Authentication — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M01 — Authentication |
| Phase | P01 — SaaS Core |
| Status | Implementation complete — 25 August 2026 |
| Depends on | M00 |
| Audience | Manual QA Engineer / Tester |

---

## 1. Module overview

M01 delivers **identity and session management** for EaziAiCall: register, email verification, login, logout, password reset, and protected portal access via HTTP-only cookies.

## 2. Delivered scope

### In scope

- Register, login, logout, forgot/reset password, verify email
- `GET /api/v1/auth/me` session restore
- Frontend auth pages and portal session gate
- SMTP email delivery for verification and reset (real adapter)
- Rate limiting on sensitive auth routes
- bcrypt password hashing; refresh token rotation

### Out of scope

- Organizations / workspaces (M02)
- Team invitations (M03)
- OAuth / SSO / MFA
- Admin impersonation

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M00 | Health + API baseline |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` configured |
| Mail catcher | Mailpit/Mailhog recommended for local QA |
| Browser | Cookies enabled; third-party cookie blockers off for localhost |

**Test data:** Use disposable emails (e.g. `qa+m01-{timestamp}@example.com`). Never use production user passwords in reports.

## 4. Roles and permissions

Single user identity only — no org roles in M01. Unverified users **cannot** obtain portal session.

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/register` | Create account |
| `/login` | Sign in |
| `/forgot-password` | Request reset link |
| `/reset-password?token=` | Set new password |
| `/verify-email?token=` | Confirm email |
| `/dashboard` (and portal routes) | Protected — redirect to login if unauthenticated |

**Query params:** `next` / `returnTo` — safe relative paths only (used heavily by M03 invites).

## 6. Backend / API surface

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | No cookies until verified |
| POST | `/api/v1/auth/login` | Sets `eazi_access`, `eazi_refresh` |
| POST | `/api/v1/auth/logout` | Clears cookies |
| POST | `/api/v1/auth/forgot-password` | Always `{ accepted: true }` |
| POST | `/api/v1/auth/reset-password` | Body `{ token, password }` |
| POST | `/api/v1/auth/verify-email` | Body `{ token }` |
| POST | `/api/v1/auth/refresh` | Rotates cookies |
| GET | `/api/v1/auth/me` | Returns `{ user }` or 401 |

See [api-contracts.md](./api-contracts.md) for rate limits and cookie flags.

## 7. Data and integrations

- Tables: `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`
- Email via `EmailDeliveryPort` / `SmtpEmailAdapter`
- Sessions: HTTP-only cookies only — **no tokens in localStorage**

## 8. End-to-end workflows

### WF-1 — Register → verify → login → portal

1. `/register` with new email + password.
2. Open verification link from email → `/verify-email?token=…`.
3. `/login` → land on `/dashboard` (or `next` path).
4. Reload page — session persists.
5. Logout → protected routes redirect to login.

### WF-2 — Forgot password

1. `/forgot-password` for existing email.
2. Open reset link → set new password.
3. Login with new password; old sessions invalidated.

### WF-3 — Session restore

1. Login; close tab; reopen `/dashboard`.
2. **Expected:** Still authenticated via cookies + `/auth/me`.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| Duplicate email on register | Rejection with clear error |
| Login before verify | Blocked |
| Wrong password | Generic invalid credentials |
| Expired verify/reset token | Clear error; no session |
| Rate limit exceeded | HTTP 429 `RATE_LIMITED` |
| Open redirect in `next` | Blocked — stays on safe paths |
| Unauthenticated `/dashboard` | Redirect to login |

## 10. Security and tenant-isolation checks

- Passwords never appear in UI logs or network responses
- Auth cookies are HttpOnly
- Forgot-password does not reveal whether email exists
- `/me` returns only the authenticated user

## 11. UI state coverage

Each auth page: loading, validation errors, success, and API error states. Portal: session loading spinner before redirect.

## 12. Manual test cases

| ID | Preconditions | Steps | Expected | P/F | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-M01-01 | SMTP working | WF-1 full register flow | Verified user reaches dashboard | | |
| TC-M01-02 | Existing user | Register same email twice | Error | | |
| TC-M01-03 | Unverified user | Login | Blocked | | |
| TC-M01-04 | Verified user | Wrong password | Error, no cookies | | |
| TC-M01-05 | Verified user | WF-2 reset password | New password works | | |
| TC-M01-06 | Logged in | Logout + visit `/dashboard` | Redirect login | | |
| TC-M01-07 | — | 20+ rapid login attempts | 429 rate limit | | |
| TC-M01-08 | Logged in | Reload portal | Session restored | | |

## 13. Regression scope

- M00 health endpoints still ok
- Portal shell routes still load after auth gate

## 14. Known limitations

- Email delivery depends on SMTP config
- No social login
- Invitation `next` handoff extended in M03 (`eazi_invite_return` cookie)

## 15. Bug-reporting guide

Include route, email used (masked), HTTP status, `error.code`, correlation ID, cookie presence (yes/no — not values), SMTP log if email missing.

## 16. QA sign-off

| Item | Value |
| --- | --- |
| Tester / date / commit | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |
