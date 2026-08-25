# Module 01 — Authentication

| Field | Value |
| --- | --- |
| Module | M01 — Authentication |
| Status | Completed — 25 August 2026 |
| Depends on | M00 |
| Next | M02 — Organizations / Tenants |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, cookie session model, SMTP requirement, out of scope |
| [data-model.md](./data-model.md) | `users`, token tables, email uniqueness, migration isolation |
| [domain-logic.md](./domain-logic.md) | Auth services, password/token rules, email port |
| [api-contracts.md](./api-contracts.md) | `/api/v1/auth/*`, cookies, rate limiting, security notes |
| [M01_Authentication_manual-qa-guide.md](./M01_Authentication_manual-qa-guide.md) | Manual QA handoff — test cases, workflows, sign-off |

## Database changes

| Migration | Change |
| --- | --- |
| `1756040000000-AuthIdentity` | Creates `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens` |
| `1756041000000-UsersEmailCaseInsensitive` | Unique `LOWER(email)`; normalizes stored emails |

TypeORM migration history uses `eazi_ai_call_migrations` (isolated from n8n’s `migrations`). Bootstrap: `src/database/bootstrap-eazi-migrations.ts`.

## API changes

Routes under `/api/v1/auth`: `register`, `login`, `logout`, `forgot-password`, `reset-password`, `verify-email`, `refresh`, `me`.

HTTP-only cookies: `eazi_access`, `eazi_refresh`. CORS credentials required.

## Provider changes

| Port | Adapter | Purpose |
| --- | --- | --- |
| `EmailDeliveryPort` | `SmtpEmailAdapter` (Nodemailer) | Verification and password-reset mail; one retry |

## Frontend surfaces

`/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`; portal routes require session restore via `GET /auth/me`.

## Acceptance evidence

- Backend: `npm test`, `npm run test:e2e` (auth domain, security journey, rate limit, SMTP retry)
- Frontend: `npm run typecheck` (auth session gate + pages)
- Checklist: Submodules 01.01–01.05 and `P01-M01-GATE` marked complete
