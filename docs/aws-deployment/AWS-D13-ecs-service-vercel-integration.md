# AWS-D13 — ECS Service Activation + Vercel Same-Origin Integration

Phase **AWS-D13** activates the production backend as a controlled ECS Fargate service (Part A) and completes the Vercel same-origin API proxy for browser auth cookies (Part B).

**Status:** PART A **PASS** | PART B **PASS** (temporary no-domain ALB HTTP upstream)

## Part A — ECS service (PASS)

| Field | Value |
|---|---|
| **Service** | `eaziacall-prod-backend-service` |
| **Cluster** | `eaziacall-prod-cluster` |
| **Task definition** | `eaziacall-prod-backend:5` |
| **Image** | `1553674-20260903t051135z` |
| **Desired / running** | 1 / 1 |
| **Launch type** | FARGATE |
| **Subnets** | `subnet-005de662efbe236f5`, `subnet-0df3643d8ad0501a8` (public) |
| **Security group** | `sg-02fe9d3a2c96b513f` |
| **assignPublicIp** | ENABLED (outbound only; app ingress via ALB SG) |
| **Deployment circuit breaker** | enable + rollback |
| **Health-check grace period** | 60s |

### Target health

- Target group: `eaziacall-prod-backend-tg` (IP, `/health/live`)
- Target state: **healthy**
- Direct ALB `/health/live` and `/health/ready` = **200**

### Runtime verification

- Normal startup (`dist/main.js`) — no migration command on boot
- `synchronize=false` unchanged
- Secrets injected via ECS task definition
- S3 via IAM task role (no static keys)
- Temporary `PUBLIC_BASE_URL=http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com`

## Part B — Vercel same-origin integration (PASS)

### Architecture (temporary no-domain)

```
Browser → https://eazi-ai-call.vercel.app/api/backend/*
       → Next.js Route Handler (fixed upstream)
       → http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com/api/v1/*
       → ALB → ECS
```

Health probes (`/health/live`, `/health/ready`) remain **outside** `/api/v1` and are not mapped through `/api/backend`.

Provider webhooks (Twilio, ElevenLabs) are **unchanged in this phase** and still point at historical CloudFront URLs until the next provider HTTPS finalization phase. CloudFront distribution `E1FWWKUHUKYF6J` remains **PRESENT / UNCHANGED**.

### Implementation choice

**Next.js Route Handler** (`src/app/api/backend/[...path]/route.ts`) — not a simple rewrite — because:

- Explicit forwarding of `Cookie` request headers
- Preservation of multiple `Set-Cookie` response headers (auth + refresh + context)
- Fixed upstream only (SSRF prevention; legacy CloudFront origins fall back to ALB)
- Temporary HTTP ALB origin allowed only for `*.elb.amazonaws.com`
- `cache-control: no-store` on proxied responses
- Connection: close + short upstream timeout + one safe GET retry

### Frontend API contract (production)

| Variable | Production value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api/backend` | Browser same-origin only; no secrets |
| `INTERNAL_BACKEND_ORIGIN` | `http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com` | Server-only proxy upstream |
| `INTERNAL_API_BASE_URL` | `http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com/api/v1` | SSR/server `apiRequest` base |

Path mapping: `/api/backend/<path>` → ALB `/api/v1/<path>` (single `/api/v1` prefix; no double prefix).

Code defaults and stale-CloudFront fallback already enforce the ALB origin if dashboard env still contains deleted CloudFront hosts.

### Vercel project

| Field | Value |
|---|---|
| **Canonical URL** | `https://eazi-ai-call.vercel.app` |
| **Deploy method** | Existing GitHub → Vercel integration (`vercel[bot]`) |
| **Regions** | `iad1` (`vercel.json`) |
| **Latest observed production deploy** | GitHub deployment `6224352007` on `main` @ `1553674` — state `success` |
| **CLI auth in this environment** | Logged out (no token). Env values confirmed by live traffic + code defaults; dashboard env names above are the contract. |

### Local verification

- `npm test` — PASS (38)
- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm run lint` — PASS (exit 0)

### Production verification (this phase)

| Check | Result |
|---|---|
| `GET /api/backend/auth/me` | **401** `UNAUTHENTICATED` (real backend; not 502) |
| `POST /api/backend/auth/login` (invalid) | **401** `INVALID_CREDENTIALS` |
| Reliability (8× GET + 8× POST) | **8/8** each |
| Browser bundle | Contains `/api/backend`; **no** ALB DNS; **no** CloudFront |
| `/calls` page | **200** |
| Authenticated portal login | **MANUAL_AUTH_QA_REQUIRED** (no production test credentials in environment) |

### ALB network path for Vercel

ALB SG `sg-098248934945d61d3` currently allows TCP **80 from 0.0.0.0/0** (temporary public HTTP ALB). Vercel → ALB path is reachable. No additional SG opening performed in this phase.

## Explicit non-goals (unchanged this phase)

- No Twilio/ElevenLabs webhook URL changes
- CloudFront **not** deleted/disabled
- Temporary RDS admin SG **not** removed
- No database migrations / schema changes
- No Redis enablement
- **P05-M12-GATE remains OPEN**

## Next phase

**Provider HTTPS Endpoint Finalization**

- Twilio + ElevenLabs production webhook cutover/QA
- Cleanup (CloudFront / temp RDS SG) only after provider path is proven
