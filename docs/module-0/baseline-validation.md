# Module 0 baseline and validation

## Supplied snapshot (before)

| Check                     | Result                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Backend build             | Passed                                                                                        |
| Backend tests             | Could not start: Jest 30 / ts-jest 29 incompatibility                                         |
| Backend lint              | 529 findings (527 errors, 2 warnings), largely generated formatting/scaffold debt             |
| Frontend TypeScript       | Passed                                                                                        |
| Frontend lint             | Passed with one unused-import warning                                                         |
| Frontend production build | Blocked in the audit environment by Windows-only SWC binaries in the uploaded dependency tree |
| Database migrations       | None; runtime `synchronize: true`                                                             |
| Frontend tests            | None                                                                                          |

## Module 0 result (after)

| Check                  | Result on 24 August 2026 |
| ---------------------- | ------------------------ |
| Backend compile        | Passed (`nest build` / `npm run typecheck`) |
| Backend unit tests     | Passed: 5/5 |
| Backend API smoke test | Passed: 1/1 |
| Frontend check         | Passed (`npm run check`: lint, typecheck, 2/2 URL tests) |
| Frontend production build | Passed (`next build`) |
| Docker Compose         | `docker compose --env-file .env.docker config` passed; postgres/redis/n8n started healthy. Host ports 3000/3001 were already in use by the local API/portal, which is the verified runtime. |
| Health                 | `GET /health/live` and `GET /health/ready` returned `ok` with `database`, `redis`, and `objectStorage` up |
| Portal routes          | `GET /dashboard`, `/calls`, `/settings` returned HTTP 200 |
| Live Twilio/OpenAI     | Not run; opt-in sandbox procedure is in `docs/module-0/security-runbook.md` (deferred billable smoke to M10/M12) |

## Acceptance checks

- Only `.example` environment templates are tracked in git (`.env.docker` untracked).
- TypeORM runtime synchronization is disabled.
- Production cannot expose the unauthenticated prototype call-read API.
- Twilio webhooks can require official request signatures.
- Media streams require a short-lived, call-bound HMAC token before provider audio is opened.
- API errors carry stable codes and correlation IDs; request DTOs use `ValidationPipe`.
- Tenant isolation for product data is documented as an M00 accepted deferral to M02 (`docs/module-0/tenant-key-strategy.md`).

## Re-run

```bash
cd ai-call-agent-backend
npm ci
npm run typecheck
npm test
npm run test:e2e

cd ../ai-call-agent-frontend
npm ci
npm run check
npm run build

docker compose --env-file .env.docker up --build
curl http://localhost:3000/health/ready
```
