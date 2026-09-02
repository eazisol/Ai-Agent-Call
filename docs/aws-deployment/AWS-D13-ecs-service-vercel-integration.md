# AWS-D13 — ECS Service Activation + Vercel Same-Origin Integration

Phase **AWS-D13** activates the production backend as a controlled ECS Fargate service (Part A) and adds a Vercel same-origin API proxy for browser auth cookies (Part B).

**Status:** PART A **PASS** | PART B **BLOCKED** (`VERCEL_DEPLOYMENT_ACCESS_REQUIRED`)

## Part A — ECS service (PASS)

Applied with `scripts/aws/d13-ecs-service.ps1`.

| Field | Value |
|---|---|
| **Service** | `eaziacall-prod-backend-service` |
| **Cluster** | `eaziacall-prod-cluster` |
| **Task definition** | `eaziacall-prod-backend:3` |
| **Desired / running** | 1 / 1 |
| **Launch type** | FARGATE |
| **Subnets** | `subnet-0fc38aac1eef37201`, `subnet-039f9969241c4bd23` |
| **Security group** | `sg-02fe9d3a2c96b513f` |
| **assignPublicIp** | DISABLED |
| **Deployment circuit breaker** | enable + rollback |
| **Health-check grace period** | 60s |

### Target health

- Target group: `eaziacall-prod-backend-tg` (IP, `/health/live`)
- ECS auto-registers task ENI IP (no manual registration)
- Target state: **healthy**

### CloudFront health

| Endpoint | Status | Body (summary) |
|---|---|---|
| `/health/live` | 200 | `{"status":"ok","service":"EaziAiCall"}` |
| `/health/ready` | 200 | DB, object storage, telephony up; Redis reported up (disabled/deferred in production) |

### Runtime verification

- Normal startup (`dist/main.js`) — no migration command on boot
- `synchronize=false` unchanged
- Secrets injected via ECS task definition
- S3 via IAM task role (no static keys)

## Part B — Vercel same-origin integration (BLOCKED — deployment access)

### Architecture

```
Browser → https://eazi-ai-call.vercel.app/api/backend/*
       → Next.js Route Handler (fixed upstream)
       → https://dl1t1qnfxrdka.cloudfront.net/api/v1/*
       → ALB → ECS
```

Server-side Next.js fetches continue to use `INTERNAL_API_BASE_URL` (direct CloudFront).

### Implementation choice

**Next.js Route Handler** (`src/app/api/backend/[...path]/route.ts`) — not a simple rewrite — because:

- Explicit forwarding of `Cookie` request headers
- Preservation of multiple `Set-Cookie` response headers (auth + refresh + context)
- Fixed HTTPS upstream (SSRF prevention)
- `cache-control: no-store` on proxied responses

Provider webhooks (Twilio, ElevenLabs) remain **CloudFront-direct** (D14).

### Frontend API contract

| Variable | Production value |
|---|---|
| `INTERNAL_API_BASE_URL` | `https://dl1t1qnfxrdka.cloudfront.net/api/v1` |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/backend` |
| `INTERNAL_BACKEND_ORIGIN` | `https://dl1t1qnfxrdka.cloudfront.net` (server-only, proxy upstream) |

Path mapping: `/api/backend/auth/login` → CloudFront `/api/v1/auth/login` (single `/api/v1` prefix).

### Local verification

- `npm run test` — PASS (16 tests including proxy/cookie tests)
- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm run lint` — 1 pre-existing error in `voices/clones/new/page.tsx` (unrelated hook rule)

### Vercel deployment

Vercel CLI is not installed/linked in this environment.

**Required to complete Part B:**

1. Install/authenticate Vercel CLI or deploy via Git integration
2. Set production env vars above on `eazi-ai-call.vercel.app`
3. Deploy frontend with proxy route
4. Verify same-origin auth + Calls portal against production backend

Do **not** roll back the healthy ECS service if Vercel deployment is pending.

## Explicit non-goals (unchanged)

- No Twilio/ElevenLabs webhook URL changes (D14)
- No database migrations
- No Redis enablement
- **P05-M12-GATE remains OPEN**

## Next phase

**AWS-D14** — Twilio + ElevenLabs Production Webhook Finalization (only after D13 fully PASS)
