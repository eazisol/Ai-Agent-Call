# AWS-D15 — Real Phone End-to-End M12 QA

**Result:** **BLOCKED** (real phone not yet placed)  
**Mapping remediation:** **PASS** — see `AWS-D15-blocker-remediation.md`  
**Date (UTC):** 2026-09-03  
**M12 gate:** `P05-M12-GATE = OPEN` (unchanged)

## Why blocked (original)

Canonical phone → business → agent assignment is present and active, but the assigned agent’s ElevenLabs ConvAI mapping **previously** pointed at a **non-existent** external agent:

| Field | Value |
|---|---|
| Phone | `+18314809958` (`PN955403bd40b0708ec33ab960a1b7886b`) |
| Phone ID | `6b33cbc5-5af6-4bab-af5c-a21c2e427b51` |
| Business | EaziAICall Production Line (`501df018-cb8c-4731-b7d8-bcf68af0e92b`) |
| Org | EaziAICall Production (`91cef079-51a2-47c7-92aa-98527523ad2b`) |
| Assignment | active (`6bd7ae82-e369-4470-95f4-231c19cec607`) |
| Agent | Production Receptionist (`15784e32-ce59-41e3-91f5-b6f3b3042091`) — **active** |
| DB mapping | `provider=elevenlabs`, `sync_status=synced`, `external_agent_id=agent_6501m1gemh0bfxg8dk41mwhny9yf` |
| Live ElevenLabs GET | **404** for `agent_6501m1gemh0bfxg8dk41mwhny9yf` |

Live ElevenLabs account currently exposes agent:

- `agent_7101m1gta10mf2nba3gb7c7tz50y` — **HR Agent** (mapped in DB to a different agent id `8ac4c94c-7bf0-4e28-9faf-e317d1dfe23e`)

A real inbound call would reach Twilio → Vercel → Nest routing, then fail at ElevenLabs handoff (`UNSYNCED_AGENT` / `HANDOFF_FAILED` / provider 404). Per D15 rules, **no real phone call was placed**.

## Preflight that passed

| Check | Result |
|---|---|
| ECS `:6` desired/running | 1 / 1, rollout COMPLETED |
| Target health | healthy (`10.20.0.209:3000`) |
| `/health/live` | 200 |
| `/health/ready` | 200 (database/objectStorage/telephony up) |
| `PUBLIC_BASE_URL` | `https://eazi-ai-call.vercel.app` |
| `VOICE_AGENT_PROVIDER` | `elevenlabs` |
| `TWILIO_VALIDATE_SIGNATURES` | `true` |
| `REDIS_ENABLED` | `false` |
| Vercel `/api/backend/auth/me` | 401 (real backend) |
| Vercel `/api/v1` provider proxy | reachable |
| Twilio incoming/status URLs | exact Vercel `/api/v1/webhooks/twilio/*`, POST |
| ElevenLabs post-call URL | exact Vercel `/api/v1/webhooks/elevenlabs/conversation-events`, HMAC |
| Twilio unsigned | **403** `INVALID_WEBHOOK_SIGNATURE` |
| ElevenLabs invalid HMAC | **401** |
| CloudFront | DELETED (count 0) |
| DB schema / migrations | UNCHANGED / NOT RUN |

## Baseline (read-only ECS SQL)

Captured via one-off Fargate task (public subnets + public IP; no SSM/NAT):

| Metric | Value |
|---|---|
| `calls` count | **0** |
| `call_events` count | **0** |
| Latest call ID | none |

Temporary DB-access EC2 `i-063eef61082c18699` remains **SSM ConnectionLost** (private subnet, no NAT). Not modified (no cleanup).

## Real phone QA

**Not performed** — blocked before manual dial.

## Mapping remediation (2026-09-03)

**PASS.** New live agent `agent_6401m1k0r28fevcr9q3fxcvevyzk` (GET 200, name Production Receptionist). DB `sync_status=synced`. HR Agent untouched. Phone assignment unchanged.

Retry this D15 document with a **real inbound call**. Do **not** close M12 until that pass. Do **not** start AWS-D16.

## Explicit non-actions this phase

- No real phone call
- No DB schema change / migration
- No CloudFront recreation
- No ALB/SG topology change
- No temporary RDS admin SG removal
- No Redis enablement
- No provider credential rotation
- No signature validation disable

---

## Attempt 2 — post RESET-01…05 fresh dataset (2026-09-14 UTC)

**Result:** **BLOCKED** at **pre-call preflight** (real phone **not** placed)  
**M12 gate:** `P05-M12-GATE = OPEN` (unchanged)  
**Dataset:** org `35e6178e-5d74-4188-85ac-bee124adc6d5`, business `3c0680ed-320d-48ae-bf57-c129c03676b1`, agent `12d9775c-4939-402c-84e0-ffae1e6da207`, ElevenLabs `agent_5801m1k86tc7ewdbtq36s94dfw6d`, phone `+18314809958` / SID `PN80a9e2d52f491f05ff461b523359eec0`.

### Preflight summary

| Check | Result |
|---|---|
| ECS `:10` desired / running / pending | 1 / 1 / 0, rollout **COMPLETED** |
| ALB target | **healthy** (`10.20.1.12:3000`) |
| ALB `GET /health/live` | **200** |
| ALB `GET /health/ready` | **503** (consistent; handler ~5.0–5.1s in CloudWatch) |
| Vercel `GET /health/live` or `/health/ready` | **404** (no Next route; health is on backend origin) |
| Runtime env (task def `:10`) | `PUBLIC_BASE_URL=https://eazi-ai-call.vercel.app`, `VOICE_AGENT_PROVIDER=elevenlabs`, `TWILIO_VALIDATE_SIGNATURES=true`, `REDIS_ENABLED=false` |
| Twilio live (ECS one-off, read-only) | **PASS** — E.164 `+18314809958`, SID `PN80a9e2d52f491f05ff461b523359eec0`, incoming + status URLs exact Vercel POST; old SID absent |
| Twilio invalid signature (Vercel) | **403** `INVALID_WEBHOOK_SIGNATURE` |
| ElevenLabs invalid HMAC (Vercel) | **401** |
| DB baseline (`calls` / `call_events`) | **Not re-read** — ECS one-off SQL **ETIMEDOUT** to RDS from Fargate; operator verified **0 / 0** at handoff |
| ElevenLabs external agent GET | **200** (per RESET-04 / handoff state) |

### Blocker

Per D15 §2, **`/health/ready` must be 200**. It is **503** on the production ALB origin. Real inbound QA was **not** started (no manual dial, no post-call verification).

### Dependency probe (ECS one-off, non-secret)

| Dependency | From one-off task |
|---|---|
| S3 `HeadBucket` (task role) | **ok** (~142ms) |
| Twilio account fetch | **ok** (~225ms) |
| PostgreSQL `SELECT 1` | **fail** (connect timeout from one-off; service task still serves traffic) |

### Watermark

- Baseline UTC recorded: **2026-09-14T07:45:11Z**
- CloudWatch log group: `/ecs/eaziacall-prod-backend`

### Next step (when ready is 200)

Place **one** real inbound call to `+1 (831) 480-9958`, complete voice QA (3+ turns), then run post-call Twilio/ElevenLabs/DB/portal verification. **Do not** start AWS-D16 until D15 **PASS**.

---

## Attempt 2 — readiness remediation (2026-09-14 UTC)

**D15 READY REMEDIATION:** **PASS**  
**Real-phone D15:** still **BLOCKED** (no call placed)  
**M12 gate:** `P05-M12-GATE = OPEN`

### Readiness implementation (unchanged)

`GET /health/ready` runs sequential checks: **PostgreSQL** (`SELECT 1`), **Redis** (skipped when disabled), **S3** `HeadBucket` (2s timeout), **Twilio** credential validation. Failure on any required check → **503**. No semantics changed.

### Root cause

**G — database unavailable:** RDS instance `eaziacall-prod-postgres` was **`stopped`** (not a SG mismatch or stale `DATABASE_HOST`).

| Evidence | Value |
|---|---|
| Pre-fix RDS status | **stopped** |
| `DATABASE_HOST` (task def `:10`) | `eaziacall-prod-postgres.c6hi80sou31r.us-east-1.rds.amazonaws.com` (matches current endpoint) |
| RDS SG `sg-04a82007df199beff` TCP 5432 sources | `sg-02fe9d3a2c96b513f` (ECS), `sg-06f3441372adb33dd` (temp admin — **not removed**) |
| Running ECS task SG | **sg-02fe9d3a2c96b513f** on ENI `eni-05c9ac8d2e18f51dd` |
| ECS SG vs RDS source | **MATCH YES** |
| VPC | `vpc-079b83cf9f1f2135b`; task subnet `subnet-0df3643d8ad0501a8` (us-east-1b), private IP `10.20.1.12` |
| Service network | public subnets, `assignPublicIp=ENABLED`, SG `sg-02fe9d3a2c96b513f` |

Pre-fix `/health/ready` **503** ~5.0–5.1s (database check timeout). S3 and Twilio probes passed; PostgreSQL **ETIMEDOUT** until RDS was started.

### Minimal change applied

**Only:** `aws rds start-db-instance --db-instance-identifier eaziacall-prod-postgres`  
Wait until **`available`**. No SG edits, no task-definition change, no credential rotation, RDS remains **`PubliclyAccessible=false`**.

### Post-fix probes (exact service `networkConfiguration`, task def `:10`)

| Step | Result |
|---|---|
| DNS `DATABASE_HOST` | **PASS** → `10.20.11.202` |
| TCP `:5432` | **PASS** (~8ms) |
| PostgreSQL auth | **PASS** (~96ms) |
| `SELECT 1` | **PASS** |
| Read-only counts | `calls=0`, `call_events=0` |

### Post-fix health (ALB origin)

| Check | Result |
|---|---|
| `/health/live` | **200** |
| `/health/ready` body | `{"status":"ok","checks":{"database":"up","redis":"up","objectStorage":"up","telephony":"up"}}` |
| `/health/ready` ×10 consecutive | **10/10 HTTP 200** (~518–795ms; no 503) |

### Production safety (post-fix)

| Item | State |
|---|---|
| ECS | 1/1/0, rollout **COMPLETED**, task def **:10** unchanged |
| ALB target | **healthy** |
| RDS | **available**, private |
| Redis | `REDIS_ENABLED=false` |
| Twilio / ElevenLabs guards | unchanged (`TWILIO_VALIDATE_SIGNATURES=true`, HMAC on) |

### Next

**Retry AWS-D15 pre-call §2** (full preflight). Then **stop** for operator before placing the real inbound call. **Do not** start AWS-D16.

---

## Attempt 3 — Expect header proxy remediation (2026-09-14 UTC)

**D15 EXPECT HEADER REMEDIATION:** **PASS**  
**Real-phone D15:** still **not started** (no call placed)  
**M12 gate:** `P05-M12-GATE = OPEN`

### Proven root cause

Shared Vercel proxy (`buildForwardedRequestHeaders`) forwarded inbound `Expect: 100-continue` into undici `fetch` against the HTTP ALB. That throw is mapped to **502 `UPSTREAM_UNAVAILABLE`**. Direct ALB with `Expect` still reached Nest. `/api/backend/*` and `/api/v1/*` share the same transport — dashboard GETs looked healthy because they do not send `Expect`.

### Minimal code change

In `ai-call-agent-frontend/src/lib/backend-proxy.mjs`, add **`expect`** to `PROXY_REQUEST_HEADERS_TO_STRIP` (case-insensitive via existing lowercasing). No raw-body change. Provider signature headers (`X-Twilio-Signature`, ElevenLabs signature headers) and `Content-Type` remain forwarded.

### Tests

`npm run check` + `npm run build` in frontend: **PASS** (45 unit tests). New coverage strips `Expect` / case variants, preserves Twilio + ElevenLabs signature headers + raw body, preserves 401/403 assembly, keeps `UPSTREAM_UNAVAILABLE` shape for true fetch failures.

### Deployment

| Item | Value |
|---|---|
| Git SHA | **`05fc39a`** |
| Path | GitHub `main` → Vercel production |
| ECS rebuild | **not required** for proxy fix; task def remains `:10` |
| Ops note | After prior RDS stop/start, running task had stale readiness (**503**); **force-new-deployment** recycled the service task (no task-def change). Post-recycle target `10.20.0.211` **healthy** |

### Production verification (curl)

| Probe | Result |
|---|---|
| Twilio incoming **without** Expect | **403** `INVALID_WEBHOOK_SIGNATURE` (5/5) |
| Twilio incoming **with** Expect | **403** × **10/10** (0×502) |
| ElevenLabs events **without** Expect | **401** invalid HMAC |
| ElevenLabs events **with** Expect | **401** × **10/10** (0×502) |
| `GET /api/backend/auth/me` | **401** |
| `POST /api/backend/auth/login` plain + Expect | **429 RATE_LIMITED** (backend reached; not 502) |

### Health / DB (post-recycle)

| Check | Result |
|---|---|
| ECS | 1/1/0, rollout **COMPLETED**, `:10` |
| ALB target | **healthy** |
| `/health/live` | **200** |
| `/health/ready` ×10 | **10/10 × 200** (all checks up) |
| DB DNS/TCP/auth/`SELECT 1` | **PASS** |
| `calls` / `call_events` | **0 / 0** |

### Security (unchanged)

`PUBLIC_BASE_URL=https://eazi-ai-call.vercel.app`, `TWILIO_VALIDATE_SIGNATURES=true`, ElevenLabs HMAC enabled, RDS private, Redis false, schema unchanged, migrations not run.

### Next

**Re-run AWS-D15 pre-call gate.** Then **STOP** for operator before any real inbound call. **Do not** start AWS-D16.
