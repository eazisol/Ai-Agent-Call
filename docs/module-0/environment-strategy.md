# Environment-variable strategy

Copy only `*.example` files. Never commit `.env`, `.env.local`, or `.env.docker`.

| Environment | How it runs | Env files | Notes |
| --- | --- | --- | --- |
| Local (Node) | `npm run start:dev` / `npm run dev` | `ai-call-agent-backend/.env`, `ai-call-agent-frontend/.env.local` | Postgres/Redis on host or Docker; `DATABASE_HOST=localhost` |
| Local (Compose) | `docker compose --env-file .env.docker up --build` | `.env.docker` (Compose interpolation), `ai-call-agent-backend/.env.docker`, `ai-call-agent-frontend/.env.docker` | Service DNS: `postgres`, `redis`, `backend` |
| Development / staging | Same images, hosted secrets | Secret manager or CI env, not git | `TWILIO_VALIDATE_SIGNATURES=true`, HTTPS `PUBLIC_BASE_URL` |
| Production | Same images | Secret manager only | `NODE_ENV=production`, `PROTOTYPE_API_ENABLED=false`, signature validation on, CORS allowlist, no `*` |

## Production invariants

- `PROTOTYPE_API_ENABLED=false`
- `TWILIO_VALIDATE_SIGNATURES=true`
- `VOICE_STREAM_SIGNING_SECRET` and `N8N_ENCRYPTION_KEY` ≥ 32 characters, unique
- `AUTH_JWT_ACCESS_SECRET` ≥ 32 characters
- SMTP configured (`SMTP_HOST`, `SMTP_FROM`) for verification/reset mail
- Optional tuning: `AUTH_RATE_LIMIT_MAX` (default 20), `AUTH_RATE_LIMIT_WINDOW_MS` (default 900000)
- Object storage and Redis may be enabled; PostgreSQL remains the source of truth
- Frontend must not receive Twilio, OpenAI, n8n, SMTP, or JWT secrets

## Variable ownership

| Group | Owned by |
| --- | --- |
| `POSTGRES_*`, `N8N_ENCRYPTION_KEY` | Root `.env.docker` (Compose) |
| Database, Redis, object storage, Twilio, OpenAI, stream signing, `AUTH_*`, `SMTP_*` | Backend `.env` / `.env.docker` |
| `INTERNAL_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL` | Frontend only |

## Auth / SMTP keys (M01)

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_JWT_ACCESS_SECRET` | Yes | ≥ 32 characters |
| `AUTH_ACCESS_TTL_SECONDS` | No | Default 900 |
| `AUTH_REFRESH_TTL_SECONDS` | No | Default 2592000 |
| `AUTH_VERIFICATION_TTL_SECONDS` | No | Default 86400 |
| `AUTH_RESET_TTL_SECONDS` | No | Default 3600 |
| `AUTH_BCRYPT_ROUNDS` | No | Default 12 (min 10) |
| `AUTH_PUBLIC_APP_URL` | No | Links in verify/reset emails (default first CORS origin / localhost:3001) |
| `AUTH_ACCESS_COOKIE_NAME` / `AUTH_REFRESH_COOKIE_NAME` | No | Defaults `eazi_access` / `eazi_refresh` |
| `AUTH_ORG_COOKIE_NAME` | No | Active workspace cookie; default `eazi_org` (M02) |
| `AUTH_COOKIE_SECURE` / `AUTH_COOKIE_SAME_SITE` | No | Secure defaults to production; SameSite `lax` locally |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS` | No | Defaults 20 / 900000 |
| `SMTP_HOST` / `SMTP_FROM` | Yes | Delivery required for verification and reset |
| `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_TIMEOUT_MS` | No | Defaults documented in `.env.example` |

See also [Module 01 docs](../module-1/README.md).
