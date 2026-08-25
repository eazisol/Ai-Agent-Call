# Module 01 — Domain logic

Auth domain lives in NestJS `AuthModule` (`ai-call-agent-backend/src/modules/auth`).

## Boundaries

| Component | Responsibility |
| --- | --- |
| `AuthService` | Register, login, logout, verify email, forgot/reset password, refresh, `me` from access token |
| `PasswordService` | bcrypt hash/verify (cost from `AUTH_BCRYPT_ROUNDS`, min 10) |
| `AuthTokenService` | Access JWT (HS256); opaque refresh/verify/reset tokens; SHA-256 storage hashes |
| `AuthCookieService` | HTTP-only access/refresh cookies |
| `AuthRateLimitService` / `AuthRateLimitGuard` | Fixed-window per-IP+route limiter on sensitive auth routes |
| `EmailDeliveryPort` | Provider-neutral send contract |
| `SmtpEmailAdapter` | Nodemailer SMTP implementation with one retry |

## Domain rules

- Emails are normalized with `trim().toLowerCase()` before persist/lookup.
- Unverified users cannot create a portal session (`login` / `refreshSession`).
- Forgot-password always returns `{ accepted: true }` (no account enumeration).
- Password reset consumes the token and revokes all refresh sessions.
- Refresh rotation: presenting a revoked refresh token revokes all sessions for that user.
- SMTP failures surface as `EMAIL_DELIVERY_FAILED` / `EMAIL_NOT_CONFIGURED` without logging secrets or message bodies.
- Application logs use user IDs / error names only — never passwords, raw tokens, or mail bodies.

## Config

See `.env.example`: `AUTH_*` (including `AUTH_RATE_LIMIT_*`) and `SMTP_*`.

## Related docs

- API / cookies / rate limits: [api-contracts.md](./api-contracts.md)
- Schema: [data-model.md](./data-model.md)
- Module index: [README.md](./README.md)
