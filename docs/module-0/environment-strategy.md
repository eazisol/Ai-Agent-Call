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
- Object storage and Redis may be enabled; PostgreSQL remains the source of truth
- Frontend must not receive Twilio, OpenAI, or n8n secrets

## Variable ownership

| Group | Owned by |
| --- | --- |
| `POSTGRES_*`, `N8N_ENCRYPTION_KEY` | Root `.env.docker` (Compose) |
| Database, Redis, object storage, Twilio, OpenAI, stream signing | Backend `.env` / `.env.docker` |
| `INTERNAL_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL` | Frontend only |
