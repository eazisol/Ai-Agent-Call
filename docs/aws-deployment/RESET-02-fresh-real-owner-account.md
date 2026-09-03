# RESET-02 — Fresh Real Owner Account + Email Verification

**Status:** `PASS`

**UTC window:** 2026-09-03 (account created `08:05:16Z`, verified `08:07:11Z`)

## Auth flow used

| Step | Route / endpoint |
|---|---|
| Signup UI | `https://eazi-ai-call.vercel.app/register` |
| Register API | `POST /api/v1/auth/register` (via same-origin `/api/backend`) |
| Verify UI | `https://eazi-ai-call.vercel.app/verify-email?token=...` |
| Verify API | `POST /api/v1/auth/verify-email` |
| Login UI | `https://eazi-ai-call.vercel.app/login` |
| Login API | `POST /api/v1/auth/login` (sets HttpOnly cookies) |
| Session | `GET /api/v1/auth/me` via `https://eazi-ai-call.vercel.app/api/backend/auth/me` |

**Not used:** SQL inserts, D14 bootstrap, dummy email, direct ALB browser calls for the operator session.

## Owner account

| Field | Value |
|---|---|
| Display name | Ahmad Akram |
| Email | `ahmadg03025249091@gmail.com` (real accessible Gmail) |
| User ID | `1a8ad4ad-ffa3-4f8d-a611-463c45861e43` |
| Email verified | yes (`2026-09-03T08:07:11.353Z`) |
| Password hash | present, bcrypt-like (value not exposed) |
| Platform org role | **none yet** (no `organization_members` row) |

### Ownership architecture (existing product behavior)

Signup does **not** auto-create an organization or assign `owner`.

Owner role is assigned when the authenticated user creates a workspace via:

`POST /api/v1/organizations` → `organization_members.role = 'owner'`

That step is intentionally **RESET-03** (org + business setup). RESET-02 stops after verified login.

## Email + verification

| Check | Result |
|---|---|
| Real mailbox | YES |
| Dummy email avoided | YES |
| Verification email delivered | YES (operator opened Gmail and clicked link) |
| Link host | production app `https://eazi-ai-call.vercel.app` (`AUTH_PUBLIC_APP_URL`) |
| Token consumed | YES (open=no) |
| Manual DB verify bypass | NOT used |

## Login + `/auth/me`

| Check | Result |
|---|---|
| Production login | PASS (operator) |
| `/auth/me` | HTTP 200 authenticated (operator Network confirmation) |
| Same-origin | `/api/backend` — YES; no ALB hostname in browser |
| Unauthenticated `/api/backend/auth/me` probe | 401 (expected) |

## Database (read-only after login)

| Metric | Value |
|---|---:|
| users | 1 |
| duplicate users for email | 0 |
| organizations | 0 |
| organization_members | 0 |
| businesses | 0 |
| migration rows | 16 |

No automatically created org/business domain records.

## Security checks (non-destructive)

| Test | Result |
|---|---|
| Duplicate signup (same email via `/api/backend/auth/register`) | **409** `EMAIL_ALREADY_REGISTERED` |
| Invalid verification token (ALB `POST /api/v1/auth/verify-email`) | **400** rejected |
| Forgot password | **Inspected only** — `POST /auth/forgot-password` exists; targets real mailbox path via `AUTH_PUBLIC_APP_URL`; **not sent** (avoid unnecessary email) |
| Password / token exposure | NONE in docs/logs |

## Code / schema / providers

| Item | Result |
|---|---|
| Code changes | **NONE** |
| DB schema | **UNCHANGED** |
| Migrations | **NOT RUN** |
| External providers | **UNCHANGED** |
| M12 | **P05-M12-GATE = OPEN** |

## Acceptance checklist

- [x] real accessible email supplied by operator
- [x] no dummy email used
- [x] account created via supported auth flow
- [x] secure password hashing path used (bcrypt)
- [x] production verification email successfully delivered
- [x] operator clicked actual verification link
- [x] verification succeeded
- [x] same user remains
- [x] no duplicate user
- [x] user can log in
- [x] `/auth/me` = 200 authenticated
- [x] browser uses `/api/backend` same-origin
- [x] owner role mechanism uses supported architecture (org-create → owner; assignment deferred to RESET-03 by design)
- [x] no password exposed
- [x] no verification/reset token exposed
- [x] DB schema unchanged
- [x] migrations not run
- [x] external providers untouched
- [x] M12 remains OPEN

## Next phase

**RESET-03 — Fresh Organization + Business Setup**

**STOP.** Do not start RESET-03 / AWS-D15 / D16 until explicitly instructed.
