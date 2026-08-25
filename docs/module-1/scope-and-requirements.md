# Module 01 — Authentication: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M01 — Authentication |
| Submodule | 01.01 — Scope & Requirements |
| Status | Completed — 25 August 2026 |
| Date | 24 August 2026 |
| Depends on | M00 Complete |
| Target | MVP |

## 1. Objective

Deliver end-to-end identity for EaziAiCall so a person can **register**, **verify email**, **sign in**, **restore a session**, **access protected portal routes**, **sign out**, and **recover a forgotten password** — against real NestJS APIs and a real SMTP mail path. No permanent mock auth.

## 2. Boundaries

### In scope (M01)

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P01-M01-01-02 | Register account | Email + password (+ display name); unique email; hashed password; verification email sent |
| P01-M01-01-03 | Login | Credentials validated; verified users receive session cookies |
| P01-M01-01-04 | Logout | Refresh session invalidated; auth cookies cleared |
| P01-M01-01-05 | Forgot password | Always returns a non-enumerating success response; reset email sent when account exists |
| P01-M01-01-06 | Reset password | Valid token sets a new password; invalidates reset token and existing refresh sessions |
| P01-M01-01-07 | Email verification | Token from email marks user verified; unverified users cannot obtain a portal session |
| P01-M01-01-08 | Current-user session | `GET /api/v1/auth/me` returns the authenticated user (or 401) |
| P01-M01-01-09 | Protected routes / session restoration | Portal app shell routes require a valid session; unauthenticated users redirect to login; cookies restore session on reload |

### Decisions locked in 01.01

| Topic | Decision |
| --- | --- |
| Session model | Access JWT + refresh tokens |
| Token transport | **Both** access and refresh tokens in **HTTP-only, Secure, SameSite** cookies |
| Password hashing | Adaptive hash (bcrypt or argon2) — chosen in 01.03/01.07 implementation |
| Email delivery | **Real SMTP required in M01** via generic SMTP env (`SMTP_*`) and a Nodemailer-style adapter |
| Email port | `EmailDeliveryPort` (or equivalent) so core auth does not hard-code SMTP internals |
| API prefix | Existing `/api/v1` |
| Error shape | Existing M00 `error.code` / `message` / `correlationId` envelope |
| Prototype calls API | Remains `PrototypeOnlyGuard` until a later authenticated call module replaces it; M01 does not redesign Calls |

### Planned API contracts (for later submodules; not implemented in 01.01)

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/me`
- Optional supporting: `POST /api/v1/auth/refresh` if access-cookie rotation is not done transparently on `/me` or middleware (implementation choice in 01.03–01.04)

### Planned data (for 01.02)

- `users`
- `refresh_tokens` (or equivalent session/refresh store)
- `email_verification_tokens`
- `password_reset_tokens`

No `organization_id` ownership on these tables in M01 (identity is user-scoped). Tenant isolation for product data remains M02+.

### Frontend surfaces (for 01.05)

- Register, Login, Forgot password, Reset password, Email-verification success/error states
- Portal layout: session loading, redirect unauthenticated users to login, restore session from cookies

### Security requirements (preview for 01.07)

- Secure password hashing
- Access and refresh expiry; refresh rotation/reuse detection where practical
- Auth endpoint rate limiting
- Logout invalidates refresh token(s)
- No passwords, raw tokens, or SMTP secrets in client or application logs
- CSRF posture appropriate for cookie-based auth (SameSite + documented CSRF approach)

## 3. Out of scope (explicit — do not pull forward)

Documented for P01-M01-01-10:

- Organizations / workspaces / tenant switching (M02)
- Team invites, roles, RBAC (M03)
- Business / agent / phone / knowledge / billing screens as product features
- OAuth / social login / SSO / SAML
- MFA / WebAuthn / passkeys
- Magic-link-only auth (email links are for verify/reset only)
- Admin portal authentication product (M28)
- Replacing Twilio webhook auth or voice-stream HMAC with user JWT
- Full Calls authorization / tenant-scoped call queries (later call modules)
- Marketing homepage / public pricing auth CTAs beyond the auth pages themselves
- SendGrid / Resend / SES **API** adapters (generic SMTP is the M01 adapter; other vendors may be added later behind the same port)
- Changing production package/directory names from `ai-call-agent-*`

## 4. Non-goals for this submodule

01.01 only locks scope and requirements. It does **not** create migrations, Nest auth modules, or UI pages. Those begin in 01.02+.

## 5. Definition of Done for Submodule 01.01

- [x] Objective and boundaries confirmed
- [x] In-scope capabilities listed (register through protected routes)
- [x] Session, cookie, and SMTP decisions recorded
- [x] Out of scope documented
- [x] Checklist items `P01-M01-01-01` … `P01-M01-01-10` marked complete after this document is accepted

## 6. Next submodule

**01.05 — Frontend / UX** — Auth pages and protected portal session restore. Submodule 01.04 delivered `/api/v1/auth/*` contracts and HTTP-only cookies.
