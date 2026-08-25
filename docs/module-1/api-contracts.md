# Module 01 — API contracts

All routes are under `/api/v1` and use the M00 error envelope.

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public + rate limit | Creates user; sends verification email; **no** session cookies |
| POST | `/auth/login` | Public + rate limit | Verified users only; sets `eazi_access` + `eazi_refresh` HTTP-only cookies |
| POST | `/auth/logout` | Cookie optional | Revokes refresh token if present; clears cookies |
| POST | `/auth/forgot-password` | Public + rate limit | Always `{ accepted: true }`; emails reset link when account exists |
| POST | `/auth/reset-password` | Public + rate limit | Body `{ token, password }`; revokes sessions |
| POST | `/auth/verify-email` | Public + rate limit | Body `{ token }`; marks email verified |
| POST | `/auth/refresh` | Refresh cookie + rate limit | Rotates access/refresh cookies |
| GET | `/auth/me` | Access (or refresh rotation) | Returns `{ user }` |

## Cookies

| Name | Contents | Flags |
| --- | --- | --- |
| `eazi_access` | Access JWT | `HttpOnly`, `Secure` (prod), `SameSite` from config, `Path=/` |
| `eazi_refresh` | Opaque refresh token | same |

CORS uses `credentials: true`. Frontend must call with `credentials: 'include'`.

## Rate limiting (01.04)

Sensitive auth routes use a fixed-window per-IP+route limiter:

- `AUTH_RATE_LIMIT_MAX` (default `20`)
- `AUTH_RATE_LIMIT_WINDOW_MS` (default `900000` = 15 minutes)

Exceeded attempts return `429` with `error.code = RATE_LIMITED`. Logout and `/me` are not rate-limited.

## Validation

Request bodies use `class-validator` DTOs via the global `ValidationPipe`. Invalid input returns `VALIDATION_ERROR`.

## Security notes (01.04)

- Passwords hashed with bcrypt (`AUTH_BCRYPT_ROUNDS`, min 10)
- Access JWT and opaque refresh/verify/reset tokens expire via configured TTLs; refresh tokens are hashed at rest
- Logout revokes the presented refresh token; password reset revokes all refresh sessions for the user
- Auth tables are user-scoped (no `organization_id` in M01); `/me` returns only the token subject
- Application logs use user IDs / error names only — never passwords, raw tokens, or SMTP secrets
- Frontend `authApi` uses `credentials: 'include'` and does not log request bodies
