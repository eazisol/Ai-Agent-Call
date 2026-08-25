# M00 — Existing Project Audit & SaaS Foundation — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M00 — Existing Project Audit & SaaS Foundation |
| Phase | P00 — Foundation |
| Status | Implementation complete — 24 August 2026 |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M00 refactors the supplied EaziAiCall prototype into a **migration-first, multi-tenant-ready SaaS foundation** without rebuilding from zero. It establishes health checks, structured errors, provider abstraction folders, Docker/CI baselines, and documents tenant-key strategy for later modules.

**Role in product:** Everything after M00 (auth, orgs, team, businesses, calls) depends on this foundation.

## 2. Delivered scope

### In scope (verified)

- Git hygiene, env templates, typed config + Joi validation
- TypeORM migrations baseline; `synchronize: true` disabled
- Health endpoints (`/health/live`, `/health/ready`)
- Stable API error envelope with correlation IDs
- Provider ports for telephony and voice-agent (Twilio/OpenAI adapters preserved)
- Twilio webhook signature guard; HMAC stream tokens
- Redis + S3-compatible storage health connectors
- Frontend builds; dashboard/calls/settings routes load
- Docker Compose stack; CI workflow
- Documentation under `docs/module-0/`

### Out of scope (do not file as bugs)

- User authentication (M01)
- Organizations / tenant query scoping (M02)
- Team roles / invitations (M03)
- Business management (M04+)
- Live Twilio→OpenAI audio E2E (opt-in sandbox only)
- Production customer call details UI

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js | 22.x (see CI) |
| PostgreSQL | Running via Docker or local |
| Redis | Required for `/health/ready` |
| Env files | Copy from `.env.example` / `.env.docker.example` — **never commit secrets** |
| SMTP | Not required for M00 |
| Test accounts | None — M00 has no auth |

**Start stack:**

```bash
# Backend
cd ai-call-agent-backend && npm ci && npm run start:dev

# Frontend
cd ai-call-agent-frontend && npm ci && npm run dev

# Or Docker
docker compose --env-file .env.docker up --build
```

## 4. Roles and permissions

M00 has **no end-user roles**. Prototype call-read APIs are development-only and return **404 in production** (`PrototypeOnlyGuard`).

## 5. User-facing surfaces

| Route | Expected |
| --- | --- |
| `/dashboard` | Loads (legacy portal shell) |
| `/calls` | Loads |
| `/settings` | Loads |

No auth gate in M00 alone; combined with M01+ the portal requires session.

## 6. Backend / API surface

| Method | Path | Auth | Tester-visible behavior |
| --- | --- | --- | --- |
| GET | `/health/live` | Public | `{ status: "ok" }` |
| GET | `/health/ready` | Public | `ok` when DB, Redis, object storage up; degraded otherwise |
| * | `/api/v1/*` | Varies | M00 error shape: `{ error: { code, message, correlationId } }` |

## 7. Data and integrations

- Database: `ai_call_agent`; migration table `eazi_ai_call_migrations`
- Redis: connectivity checked on ready probe
- S3-compatible storage: config present; health connector only
- Twilio/OpenAI: code preserved under provider adapters; live call test deferred

## 8. End-to-end workflows

### WF-1 — Local developer stack

1. Start backend + frontend (or Docker).
2. Open `http://localhost:3001/dashboard`.
3. **Expected:** Page loads without build errors; API reachable from frontend.

### WF-2 — Health readiness

1. `curl http://localhost:3000/health/live`
2. `curl http://localhost:3000/health/ready`
3. **Expected:** Live always ok; ready ok when Postgres + Redis up.

### WF-3 — Production build smoke

1. Backend: `npm run build` / `npm test`
2. Frontend: `npm run build`
3. **Expected:** Both succeed.

## 9. Negative and edge cases

| Case | Steps | Expected |
| --- | --- | --- |
| DB down | Stop Postgres; hit `/health/ready` | Not fully ok / degraded |
| Invalid API body | POST malformed JSON to any validated route | `VALIDATION_ERROR` with correlation ID |
| Production prototype API | Set `NODE_ENV=production`; hit dev-only call read | 404 |

## 10. Security and tenant-isolation checks

- No secrets in git-tracked `.env` files
- Logs must not contain passwords or raw tokens
- CORS allowlist configured (not wide open in prod templates)
- Tenant isolation for product data documented as M02 deferral — **not an M00 bug**

## 11. UI state coverage

Portal pages: loading, error, and unavailable states for API failures (M00 frontend runtime behavior).

## 12. Manual test cases

| ID | Preconditions | Steps | Expected result | Pass/Fail | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-M00-01 | Stack running | Open `/dashboard`, `/calls`, `/settings` | HTTP 200, no console crash | | |
| TC-M00-02 | API up | GET `/health/live` | `ok` | | |
| TC-M00-03 | DB+Redis up | GET `/health/ready` | All dependencies ok | | |
| TC-M00-04 | — | Run backend + frontend production builds | Success | | |
| TC-M00-05 | `NODE_ENV=production` | Access prototype-only call endpoint | 404 | | |

## 13. Regression scope

N/A for prior modules. After M01–M03, re-check that health endpoints and portal shell still load when auth/org gates are active.

## 14. Known limitations

- Directory names remain `ai-call-agent-*` (intentional)
- Live Twilio/OpenAI audio not required to close M00
- Full tenant scoping arrives in M02+

## 15. Bug-reporting guide

Include: **title**, environment (local/Docker/staging), severity, steps, expected vs actual, screenshots, correlation ID from API errors, browser/OS, commit SHA. Do **not** attach `.env` files or SMTP/API keys.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M00-01 … TC-M00-05 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |
