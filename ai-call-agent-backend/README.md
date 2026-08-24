# EaziAiCall backend

NestJS 11 modular API for calls, Twilio webhooks/media streams, the OpenAI
Realtime adapter, persistence, health checks, and future asynchronous integrations.

## Run locally

```bash
cp .env.example .env
npm ci
npm run migration:run
npm run start:dev
```

The API listens on port `3000`. Product routes use `/api/v1`; health routes are
`/health/live` and `/health/ready`. Set `PUBLIC_BASE_URL` to the externally visible
HTTPS origin for verified Twilio requests. Do not enable the prototype call-read
API in production.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Tests use Node's built-in test runner against compiled output, avoiding the former
Jest/ts-jest major-version mismatch. No test contacts Twilio or OpenAI.

## Database changes

`synchronize` is disabled. Create and review a TypeORM migration for every schema
change, back up shared databases, then run `npm run migration:run`. See the root
Module 0 migration runbook before using `migration:revert`.
