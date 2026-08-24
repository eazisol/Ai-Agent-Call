# EaziAiCall — Module 0 Cursor Audit & Foundation Refactor Brief

| Field | Value |
| --- | --- |
| Module | M0 — Existing Project Audit & SaaS Foundation Refactor |
| Status | Ready for Development |
| Implementation owner | Cursor / development team |
| UI support | Lovable is not required for Module 0 |
| Working branch | Recommended: `chore/m0-foundation-refactor` |
| Source baseline | `main` at `51736da` from the supplied archive |
| Product name | EaziAiCall |

## 1. Cursor instruction

Execute only Module 0. Preserve the working Twilio → WebSocket → OpenAI Realtime prototype while making the repository safe, reproducible, testable, and ready for vertical-slice development.

Do not implement Authentication, Organizations, ElevenLabs, billing, future product pages, or a full database redesign. Do not delete working code before characterization tests exist. Do not run destructive database operations against the only copy of any database.

Before changing frontend code, read and follow `ai-call-agent-frontend/AGENTS.md` and the relevant installed Next.js 16 documentation referenced by that file.

## 2. Required inputs before implementation

The developer must confirm:

- A recoverable copy of the current development database exists, or explicitly confirm no data needs preservation.
- The current working local startup commands and Node version. Dockerfiles use Node 22; use Node 22 LTS for validation.
- Whether the supplied Git commit is the latest code.
- Whether any configured development password has been reused outside a disposable local environment. Rotate it if yes.
- A Twilio test/sandbox number and OpenAI test credential are available only for the final opt-in smoke test. Default tests must use mocks.

If any item is unavailable, record it as a blocker; do not invent data or credentials.

## 3. Fixed architecture constraints

- Keep NestJS, Next.js, React, TypeScript, TypeORM, PostgreSQL, Redis, S3-compatible object storage, Docker, and n8n direction.
- Use a modular monolith; do not create microservices.
- Keep PostgreSQL authoritative and Redis non-authoritative.
- Keep n8n out of the realtime audio loop.
- Keep the existing custom OpenAI Realtime work as the future `OpenAIRealtimeProvider` asset.
- Introduce provider-neutral ports; do not implement ElevenLabs in M0.
- Do not add organization/business future schemas wholesale. M2 and M4 own them.
- Do not use provider IDs as primary business identity.
- Use migrations; production/staging must never use TypeORM automatic synchronization.
- No production/billable external call may run from ordinary tests.

## 4. Baseline findings Cursor must reproduce

| Check | Audit result to confirm |
| --- | --- |
| Backend build | Passes |
| Backend test startup | Fails because Jest 30.4.2 cannot load ts-jest 29.4.10 |
| Backend lint | 529 findings: 527 errors, 2 warnings |
| Frontend TypeScript | Passes |
| Frontend lint | Passes with one unused import warning |
| Frontend production build | Must be rerun after a clean Linux `npm ci`; audit archive contained Windows SWC binaries |
| Migrations | None |
| Frontend tests | None |

Record the exact before-results in `docs/module-0/baseline-validation.md`. If Cursor gets different results, stop and explain the environmental or code difference before refactoring.

## 5. Work packages

Complete these work packages in order. Each package should be a reviewable commit or checkpoint.

### M0-WP1 — Repository hygiene and EaziAiCall identity

#### Objective

Create a safe, documented repository baseline and apply the product’s working name without disruptive directory/database renames.

#### Tasks

1. Create a root `.gitignore` covering all backend/frontend `node_modules`, `dist`, `.next`, coverage, logs, local environment files, editor files, and OS files.
2. Stop tracking real/configured `.env.docker` files. Preserve sanitized `.env.docker.example` templates and local untracked copies.
3. Ensure ZIP/export guidance excludes `.git`, `node_modules`, `.next`, `dist`, coverage, `.env`, and `.env.local`.
4. Create a root `README.md` for EaziAiCall with architecture, prerequisites, safe setup, services, ports, validation commands, and links to Module 0 docs.
5. Replace generated backend/frontend README text with project-specific instructions.
6. Change user-facing metadata, sidebar, and top-bar text from “AI Call Agent” to **EaziAiCall**.
7. Do not rename `ai-call-agent-backend`, `ai-call-agent-frontend`, npm package names, database, or persistent volumes during this module. Record technical renaming as an optional later cleanup.

#### Files

Create:

- `.gitignore`
- `README.md`
- `.env.docker.example`
- `docs/module-0/baseline-validation.md`

Modify or safely replace:

- `.env.docker`
- `ai-call-agent-backend/.env.docker`
- `ai-call-agent-backend/.env.example`
- `ai-call-agent-backend/README.md`
- `ai-call-agent-frontend/README.md`
- `ai-call-agent-frontend/src/app/layout.tsx`
- `ai-call-agent-frontend/src/components/layout/Sidebar.tsx`
- `ai-call-agent-frontend/src/components/layout/Topbar.tsx`

#### Acceptance

- `git ls-files` contains no real `.env`, `.env.local`, or configured secret file.
- Example files contain placeholders only.
- No provider/database/n8n secret value appears in source or documentation.
- User-facing shell says EaziAiCall.

### M0-WP2 — Repair quality tooling and create the behavior safety net

#### Objective

Make all quality commands non-mutating by default and protect current call behavior before refactoring.

#### Tasks

1. Align Jest and its TypeScript transformer to a compatible supported pair. Prefer the least disruptive solution and record the decision in `docs/adr/ADR-011-test-tooling.md`.
2. Change backend `lint` so it checks only. Add a separate `lint:fix` command.
3. Fix formatting and substantive unsafe typing/promise lint findings. Do not silence rules globally merely to pass.
4. Replace generated DI-invalid “is defined” tests with providers/repository/provider-port mocks.
5. Add characterization tests for:
   - existing call creation is idempotent for the same Twilio Call SID;
   - call completion records status, duration, and ended time;
   - incoming Twilio payload produces TwiML with the correct stream destination;
   - Twilio `connected`, `start`, `media`, `stop`, close, and error events have defined outcomes;
   - OpenAI audio deltas are translated to Twilio media events;
   - provider errors do not crash the NestJS process.
6. Add integration tests using an isolated PostgreSQL test database or a documented container. Never use the developer database.
7. Add minimal frontend test tooling and tests for environment/API configuration and calls empty/error rendering. Keep it small; do not start feature UI work.

#### Primary files to modify

- `ai-call-agent-backend/package.json`
- `ai-call-agent-backend/package-lock.json`
- `ai-call-agent-backend/eslint.config.mjs`
- All current `*.spec.ts` files that lack required mocks
- `ai-call-agent-backend/test/app.e2e-spec.ts`
- `ai-call-agent-frontend/package.json`
- `ai-call-agent-frontend/package-lock.json`
- `ai-call-agent-frontend/src/components/layout/Sidebar.tsx`

Create test helpers under:

- `ai-call-agent-backend/test/helpers/`
- `ai-call-agent-backend/test/fixtures/`
- `ai-call-agent-frontend/src/test/`

#### Acceptance

- Backend lint, unit tests, integration tests, e2e tests, and build pass.
- Frontend lint, type-check, tests, and production build pass after clean install.
- Default tests contain no network calls to Twilio, OpenAI, ElevenLabs, n8n, or paid services.
- Characterization tests are committed before provider structural refactoring.

### M0-WP3 — Typed configuration, URLs, and secret boundaries

#### Objective

Make every runtime fail fast and safely with environment-specific, provider-aware configuration.

#### Tasks

1. Retain the existing configuration module but restructure it into typed groups for app, database, Redis, object storage, Twilio, active voice provider, OpenAI Realtime, and n8n.
2. Add required configuration:
   - `PUBLIC_BASE_URL` for external provider callbacks/media URLs;
   - `CORS_ORIGINS` allowlist;
   - `VOICE_AGENT_PROVIDER` with an explicit enabled adapter;
   - Redis host/port/optional authentication;
   - S3 endpoint, region, bucket, access mode, and credentials/reference;
   - log level and sensitive-log policy;
   - prototype read-API feature flag.
3. Separate frontend variables:
   - `INTERNAL_API_BASE_URL` for server-side calls inside Docker;
   - `NEXT_PUBLIC_API_BASE_URL` for browser calls only.
4. Remove all n8n credentials from frontend environment files.
5. Provider credentials are required only when their adapter is enabled; production must fail if the selected provider is missing required values.
6. Production/staging public URL validation requires HTTPS unless an explicitly documented development override is active.
7. Never print secret values in validation errors.

#### Files

Modify:

- `ai-call-agent-backend/src/config/configuration.ts`
- `ai-call-agent-backend/src/config/env.validation.ts`
- `ai-call-agent-backend/.env.example`
- `ai-call-agent-frontend/.env.docker`
- `ai-call-agent-frontend/.env.local` only as a local untracked file
- `docker-compose.yml`

Create:

- `ai-call-agent-frontend/src/lib/env.ts`
- Configuration unit tests in both projects

#### Acceptance

- Missing required variables fail startup with a safe, actionable message.
- Disabled providers do not require unused credentials.
- Docker server-side frontend requests use the backend service hostname, while browser requests use a browser-reachable URL.
- Twilio TwiML never contains `localhost`, `undefined`, or a non-WebSocket URL outside local tests.

### M0-WP4 — Database migration ownership and compatibility

#### Objective

Replace runtime schema mutation with reviewed migrations without losing prototype data.

#### Tasks

1. Inventory the actual current development schema and compare it with all six entities.
2. Add a TypeORM CLI datasource and migration scripts.
3. Set `synchronize: false` unconditionally for staging/production and preferably all normal modes. If a disposable local option remains, it must require two explicit safeguards and must never be the default.
4. Create a baseline migration matching the existing schema. Generate/hand-review it against a database copy.
5. Add explicit join-column names, indexes, nullability, and unique constraints where needed without silently destroying data.
6. Add a provider mapping for calls instead of treating `twilio_call_sid` as the permanent domain identifier:
   - platform UUID call identity remains `calls.id`;
   - mapping includes provider key, external call ID, synchronization/status metadata, and timestamps;
   - unique constraint on provider plus external call ID;
   - backfill existing Twilio IDs;
   - keep the old column during Module 0 if removal would create unnecessary risk; mark it deprecated and schedule removal through a later migration.
7. Document migration, rollback/restore, and data verification commands.
8. Do not create the full Organizations, Users, Roles, Agents, Knowledge, Subscription, or Billing schema here.

#### Files

Create:

- `ai-call-agent-backend/src/database/data-source.ts`
- `ai-call-agent-backend/src/database/migrations/<timestamp>-baseline-existing-schema.ts`
- `ai-call-agent-backend/src/modules/calls/entities/call-provider-mapping.entity.ts`
- A follow-up additive migration for provider mappings if separated from the baseline
- `docs/module-0/database-baseline.md`

Modify:

- `ai-call-agent-backend/src/app.module.ts`
- `ai-call-agent-backend/package.json`
- `ai-call-agent-backend/src/modules/calls/entities/call.entity.ts`
- `ai-call-agent-backend/src/modules/calls/calls.module.ts`
- `ai-call-agent-backend/src/modules/calls/calls.service.ts`

#### Acceptance

- A fresh test database reaches the target schema through migrations only.
- A representative copy of the existing schema migrates without unapproved data loss.
- Existing Twilio calls resolve through the mapping after backfill.
- Staging/production startup cannot run schema synchronization.

### M0-WP5 — Provider ports and incremental adapters

#### Objective

Remove concrete-provider dependencies from core/application logic while preserving current behavior.

#### Design rule

Create focused capabilities, not one giant provider interface. Provider-specific controllers and media codecs may remain in infrastructure; business/application services must depend on ports/tokens.

#### Create

- `ai-call-agent-backend/src/providers/provider.tokens.ts`
- `ai-call-agent-backend/src/providers/providers.module.ts`
- `ai-call-agent-backend/src/providers/telephony/telephony-provider.port.ts`
- `ai-call-agent-backend/src/providers/telephony/telephony.types.ts`
- `ai-call-agent-backend/src/providers/telephony/twilio-telephony.adapter.ts`
- `ai-call-agent-backend/src/providers/voice-agent/voice-agent-provider.port.ts`
- `ai-call-agent-backend/src/providers/voice-agent/voice-session.port.ts`
- `ai-call-agent-backend/src/providers/voice-agent/openai-realtime-provider.adapter.ts`
- Provider error categories and adapter tests

#### Modify

- `ai-call-agent-backend/src/modules/twilio/twilio.module.ts`
- `ai-call-agent-backend/src/modules/twilio/twilio.service.ts`
- `ai-call-agent-backend/src/modules/openai-realtime/openai-realtime.module.ts`
- `ai-call-agent-backend/src/modules/openai-realtime/openai-realtime.service.ts`
- `ai-call-agent-backend/src/modules/voice-stream/voice-stream.module.ts`
- `ai-call-agent-backend/src/modules/voice-stream/voice-stream.gateway.ts`
- `ai-call-agent-backend/src/app.module.ts`

#### Requirements

- Keep compatibility wrappers if renaming existing services would make the change risky.
- OpenAI session creation receives a normalized session configuration rather than a hard-coded business prompt/voice.
- Do not add ElevenLabs SDK calls, entities, endpoints, or UI.
- Do not pretend Twilio media streaming and managed ElevenLabs call routing have identical infrastructure. Abstract shared product capabilities and allow adapter-specific execution.
- Use provider mocks in tests.

#### Acceptance

- Core/application services have no direct imports from `twilio`, `openai`, or raw provider SDK clients.
- Existing Twilio/OpenAI characterization tests still pass.
- A mock telephony/voice provider can run tests without credentials.
- Provider errors map to stable internal codes without exposing raw secrets.

### M0-WP6 — Secure webhook and voice-stream boundaries

#### Objective

Prevent forged callbacks, arbitrary billable WebSocket connections, duplicate effects, and sensitive logging.

#### Tasks

1. Enable raw request body support required by Twilio signature validation.
2. Validate Twilio signatures using the public callback URL and official validation utilities.
3. Replace `any` webhook bodies with DTOs and a global validation pipe using whitelist/transform rules.
4. Add a provider-event identity/idempotency record or equivalent durable mechanism for callbacks. A duplicate callback must return a safe success without repeating effects.
5. Add state-transition rules so completed calls cannot move backward due to delayed events.
6. Generate a short-lived signed media-stream token tied to the platform call/provider mapping and include it as a Twilio stream custom parameter.
7. Do not create an OpenAI connection until the Twilio `start` message and token are verified.
8. Apply connection timeout, maximum message size, maximum call/session duration, and cleanup behavior.
9. Redact phone numbers according to the logging policy and never log full audio/provider events.
10. Add negative tests for invalid signatures, missing/expired stream tokens, malformed JSON/media, repeated events, and provider timeouts.

#### Create

- `ai-call-agent-backend/src/modules/twilio/dto/incoming-call.dto.ts`
- `ai-call-agent-backend/src/modules/twilio/dto/call-ended.dto.ts`
- `ai-call-agent-backend/src/modules/twilio/twilio-signature.guard.ts`
- `ai-call-agent-backend/src/modules/voice-stream/stream-token.service.ts`
- `ai-call-agent-backend/src/modules/calls/entities/provider-event.entity.ts` if the idempotency ledger is owned by Calls
- Corresponding tests and migration

#### Modify

- `ai-call-agent-backend/src/main.ts`
- `ai-call-agent-backend/src/modules/twilio/twilio.controller.ts`
- `ai-call-agent-backend/src/modules/twilio/twilio.service.ts`
- `ai-call-agent-backend/src/modules/voice-stream/voice-stream.gateway.ts`
- `ai-call-agent-backend/src/modules/calls/calls.service.ts`

#### Acceptance

- Invalid Twilio signatures are rejected before business logic.
- An untrusted WebSocket cannot create a provider session.
- Repeating the same webhook/event does not create duplicate calls or side effects.
- Logs contain correlation/provider reference IDs but not raw credentials, full phone numbers, or audio payloads.

### M0-WP7 — Errors, correlation, health, CORS, and temporary prototype protection

#### Objective

Provide a stable operational/API foundation without implementing product authentication early.

#### Create

- `ai-call-agent-backend/src/common/filters/global-exception.filter.ts`
- `ai-call-agent-backend/src/common/interceptors/correlation-id.interceptor.ts`
- `ai-call-agent-backend/src/common/logging/redaction.ts`
- `ai-call-agent-backend/src/common/errors/application-error.ts`
- `ai-call-agent-backend/src/common/guards/prototype-only.guard.ts`
- `ai-call-agent-backend/src/health/health.module.ts`
- `ai-call-agent-backend/src/health/health.controller.ts`
- `ai-call-agent-backend/src/health/health.service.ts`
- Unit/integration tests for each boundary

#### Modify

- `ai-call-agent-backend/src/main.ts`
- `ai-call-agent-backend/src/app.module.ts`
- `ai-call-agent-backend/src/app.controller.ts`
- `ai-call-agent-backend/src/modules/calls/calls.controller.ts`
- `ai-call-agent-backend/src/modules/calls/calls.service.ts`

#### Requirements

- Use `/api/v1` for application routes and document final webhook URLs.
- Add `/health/live` and `/health/ready`; readiness checks PostgreSQL and enabled critical infrastructure.
- Return stable errors containing code, safe message, correlation ID, and permitted details.
- Restrict CORS to validated configured origins.
- Until M1/M2/M14 provide real authorization, protect `GET /calls` and `GET /calls/:id` with a development-only feature guard. In production they must be disabled rather than publicly exposing all calls.
- Return typed 404 for missing calls.
- Add pagination limits to any retained list endpoint even though full Call Management belongs to M14.

#### Acceptance

- Health behavior distinguishes live process from ready dependencies.
- Errors never reveal stack traces/secrets in production.
- Retained call-read endpoints are unavailable in production without future authorization.
- Correlation IDs flow through request, webhook, provider, and error logs.

### M0-WP8 — Redis and object-storage foundations

#### Objective

Provide health-checked infrastructure ports without creating future business workflows.

#### Create

- `ai-call-agent-backend/src/infrastructure/redis/redis.module.ts`
- `ai-call-agent-backend/src/infrastructure/redis/redis.service.ts`
- `ai-call-agent-backend/src/infrastructure/object-storage/object-storage.port.ts`
- `ai-call-agent-backend/src/infrastructure/object-storage/s3-object-storage.adapter.ts`
- Infrastructure tests using mocks/local-compatible services

#### Requirements

- Redis may support short-lived locks, rate counters, and later queues; it is never the only durable record.
- Object storage is S3-compatible and has an isolated test/local bucket.
- Do not implement knowledge upload, recordings migration, queues, or n8n workflows in M0.
- Readiness checks only dependencies required by the enabled runtime role.

#### Acceptance

- Startup/configuration and health tests prove PostgreSQL, Redis, and object-storage responsibility boundaries.
- No future domain table or UI is added.

### M0-WP9 — Frontend runtime foundation

#### Objective

Keep existing screens buildable and predictable without redesigning the product.

#### Tasks

1. Follow `AGENTS.md` and Next.js 16 local documentation before edits.
2. Use a server-safe API client based on `INTERNAL_API_BASE_URL` and a browser client based only on `NEXT_PUBLIC_API_BASE_URL`.
3. Ensure `/calls` is runtime data, not a production-build dependency.
4. Add explicit loading, empty, safe error/retry, and missing-record states for retained calls pages.
5. Wire call detail to the existing retained endpoint only if it does not expand M14 scope; otherwise keep the placeholder but provide a safe state.
6. Preserve dashboard/settings as clearly labeled prototype placeholders; do not invent data or forms.
7. Ensure responsive overflow for the calls table and basic mobile behavior of the current shell; no full redesign.

#### Create

- `ai-call-agent-frontend/src/lib/api.server.ts`
- `ai-call-agent-frontend/src/lib/api.client.ts` only if client requests are required
- `ai-call-agent-frontend/src/app/calls/loading.tsx`
- `ai-call-agent-frontend/src/app/calls/error.tsx`
- Small tests for API URL selection and states

#### Modify

- `ai-call-agent-frontend/src/lib/api.ts` or replace it with the split clients
- `ai-call-agent-frontend/src/app/calls/page.tsx`
- `ai-call-agent-frontend/src/app/calls/[id]/page.tsx`
- `ai-call-agent-frontend/src/components/calls/CallsTable.tsx`
- Current layout/metadata files for EaziAiCall branding
- `ai-call-agent-frontend/Dockerfile`

#### Acceptance

- Clean Linux install, lint, type-check, test, and production build pass.
- Backend downtime produces a controlled page state rather than an unhandled render failure.
- No n8n/provider secret is present in browser or frontend-server configuration.
- No Authentication/Organization/Agent UI is added.

### M0-WP10 — Docker, n8n isolation, CI, and runbooks

#### Objective

Make local and CI execution reproducible and production progression safe.

#### Tasks

1. Pin supported PostgreSQL, Redis, Node, and n8n versions; do not use `latest`.
2. Add container health checks and dependency conditions.
3. Correct frontend container metadata/port assumptions and internal API URL.
4. Keep n8n credentials outside Compose source and remove them from frontend configuration.
5. Give n8n a separate database or explicitly isolated schema/user. It must not own or directly mutate EaziAiCall business tables.
6. Add a backend runtime role convention for API/realtime/worker without splitting the codebase into microservices.
7. Add CI for clean install, lint, type-check, tests, builds, and migration verification.
8. Document local start, migrations, health verification, provider sandbox smoke, backup, restore, and rollback.

#### Create

- `.github/workflows/ci.yml`
- `docs/runbooks/local-development.md`
- `docs/runbooks/migrations.md`
- `docs/runbooks/provider-smoke-test.md`
- `docs/runbooks/rollback.md`

#### Modify

- `docker-compose.yml`
- Backend/frontend Dockerfiles and `.dockerignore` files
- Root/backend/frontend README files

#### Acceptance

- `docker compose --env-file <local-env> config` succeeds without missing-variable warnings.
- A clean `docker compose up --build` reaches healthy PostgreSQL, Redis, backend, and frontend; n8n is healthy when enabled.
- CI runs without production provider credentials and without paid calls.
- Runbooks are sufficient for another developer to reproduce the baseline.

## 6. Required migrations and data safeguards

Cursor must follow this sequence:

1. Back up or clone the current database.
2. Inspect actual table/column/index/constraint names generated by `synchronize`.
3. Create a baseline migration that matches reality rather than assumptions.
4. Test a fresh migration path.
5. Test the upgrade path against the copy.
6. Verify row counts and key call records before/after.
7. Only then disable automatic synchronization in normal development/staging/production.

No column/table may be dropped in Module 0 without a separate migration review and demonstrated restore.

## 7. Authorization and security boundary

Product Authentication and multi-tenant authorization belong to M1–M3. Module 0 must still prevent accidental exposure:

- Webhooks use provider verification, not user authentication.
- Voice streams use short-lived signed call tokens.
- Prototype call-read APIs are development-only until proper user/tenant guards exist.
- Health liveness can be public but must reveal no dependency secrets/details.
- Health readiness should be restricted at the deployment/network layer if it exposes operational state.

Do not create a temporary customer-auth system that must be thrown away in M1.

## 8. Verification commands

Run from a clean checkout with Node 22 and sanitized local environment files.

### Backend

```bash
npm ci
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
npm run migration:run
```

### Frontend

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

### Stack

```bash
docker compose --env-file .env.docker config
docker compose --env-file .env.docker up -d --build
docker compose ps
```

Then verify documented liveness, readiness, frontend, database migration, Redis, object storage, invalid Twilio signature, duplicate webhook, unauthorized stream, and one explicit sandbox call.

Do not paste command output containing secret values into reports.

## 9. Mandatory test scenarios

| ID | Scenario | Expected result |
| --- | --- | --- |
| M0-T01 | Same incoming Twilio event twice | One platform call and one provider mapping |
| M0-T02 | Completed event delivered twice/out of order | Idempotent final state; no backward transition |
| M0-T03 | Invalid/missing Twilio signature | Rejected before database/provider work |
| M0-T04 | Unauthenticated WebSocket client | Closed before OpenAI connection |
| M0-T05 | Expired/mismatched stream token | Closed and safely logged |
| M0-T06 | OpenAI connection error/timeout | Resources closed; stable internal error; process remains healthy |
| M0-T07 | Malformed media message | Connection handled safely; no sensitive payload logging |
| M0-T08 | Missing required production config | Startup fails safely |
| M0-T09 | Database unavailable | Liveness stays meaningful; readiness fails |
| M0-T10 | Redis unavailable when required | Readiness fails; no false success |
| M0-T11 | Fresh database migration | Schema created without synchronize |
| M0-T12 | Existing database-copy migration | Data preserved and mapping backfill verified |
| M0-T13 | Production call-read endpoint | Disabled pending M1/M2/M14 authorization |
| M0-T14 | Frontend backend failure | Controlled error/retry state |
| M0-T15 | Default test suite | No paid/provider network call |

## 10. Explicitly out of scope

- M1 Authentication implementation or UI.
- Organization, membership, invitation, tenant-switching, or RBAC product flows.
- Complete Business CRUD.
- Agent builder/wizard.
- ElevenLabs provider implementation.
- Knowledge upload/synchronization.
- Voice library or cloning.
- Phone-number purchase/assignment.
- New incoming/outbound call product features.
- Transcript, summary, recording, CRM, appointments/reservations, automation workflows, notifications, analytics, plans, usage, billing, or Admin Portal.
- Full UI redesign.
- Microservices, Kafka, Kubernetes, multi-region, or premature scalability work.
- Deleting the OpenAI Realtime prototype.

## 11. Required handback from Cursor

At completion, return:

1. Commit/checkpoint list mapped to M0-WP1 through M0-WP10.
2. Files created, modified, renamed, or deliberately left unchanged.
3. Before/after validation table with exact safe commands and results.
4. Database migration and data-verification evidence.
5. Characterization and security test results.
6. Docker/health results.
7. Remaining findings with severity and owning future module.
8. Any architecture conflict requiring Work approval.
9. Confirmation that no out-of-scope module was implemented.
10. Proposed Module 0 status: `Testing`, `Blocked`, or `Completed`; never self-mark `Completed` without all Definition of Done evidence and product-owner approval.

## 12. Definition of Done gate

Cursor must use the full M0 Definition of Done in `EaziAiCall_Architecture_Module_Registry_Module_0.md`. The minimum gate is:

- clean reproducible startup;
- migration-owned schema with no unsafe production synchronization;
- provider ports with OpenAI/Twilio behavior retained;
- verified webhooks and authorized voice streams;
- redacted structured logs, correlation IDs, stable errors, CORS, validation, and health;
- Redis/object-storage foundations;
- backend/frontend lint, type-check, tests, builds, and migration checks passing;
- Docker/runbooks/CI verified;
- no secret exposure, no paid default tests, no unapproved data loss;
- all deferred work assigned to the Master Module Registry;
- product-owner approval.

Only after this gate passes may Work prepare the detailed Module 1 Authentication plan.
