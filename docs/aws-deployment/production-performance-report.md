# Production Performance Report

**Date:** 2026-09-02  
**Frontend:** https://eazi-ai-call.vercel.app  
**Backend:** https://dl1t1qnfxrdka.cloudfront.net (CloudFront → ALB → ECS us-east-1)  
**Harness:** `scripts/production/api-performance.mjs`

## Executive summary

**Root bottleneck:** Vercel same-origin proxy hop (CASE A), not ECS/PostgreSQL saturation.

| Path | p50 | p95 | max |
|---|---|---|---|
| Direct CloudFront `GET /auth/me` (before) | 446 ms | 1142 ms | 1142 ms |
| Vercel proxy `GET /auth/me` (before, 25 req) | 344 ms | **25004 ms** | 25005 ms (3 timeouts) |
| Direct CloudFront `GET /auth/me` (before, 25 req) | 446 ms | 1044 ms | 1273 ms |

**Diagnosis refinement:** Median proxy latency is good (~344 ms), but tail latency hits the upstream timeout (25s then 12s). This pattern matches **stale pooled TLS connections** between Vercel iad1 and CloudFront, not ECS/DB saturation. ALB `TargetResponseTime` occasionally spikes (max 33.6s in the test window) when upstream connections stall.

**Second fix (commit after d0221a4):** shorten keep-alive idle to 4s, 12s per-attempt timeout, **one retry without pooled agent** on timeout/reset.

ECS CPU ~1–2% avg (max 11%), memory ~7%. RDS not CPU-bound during tests. NestJS request handling is fast when reached directly.

## Vercel investigation

| Item | Finding |
|---|---|
| Execution region | `X-Vercel-Id` shows `bom1::iad1::…` — function executes in **iad1** (Washington DC), aligned with AWS us-east-1 |
| Cold vs warm | Intermittent 10s+ proxy latency on warm routes suggests **new TLS connection per request** to CloudFront, not backend slowness |
| Change applied | `ai-call-agent-frontend/vercel.json` pins `"regions": ["iad1"]` |
| Proxy optimization | `undici` keep-alive `Agent` reused across invocations in `/api/backend/[...path]` |
| Upstream timeout | Reduced from 55s emergency bound to **25s** (`UPSTREAM_FETCH_TIMEOUT_MS`) |

Route Handler retained (not rewrite) — required for HttpOnly cookie forwarding and multiple `Set-Cookie` headers.

## CloudFront / ALB

| Metric | Finding |
|---|---|
| Direct CF latency | Consistent sub-1.5s p95 on unauthenticated reads |
| Intermittent CF 504 | Observed on some direct POST paths after ~60s (rare); separate from dominant Vercel proxy issue |
| ALB | Target healthy; no evidence ALB is primary bottleneck for fast direct CF responses |

## ECS

| Metric | Value |
|---|---|
| CPU avg | ~1.5% |
| CPU max | ~11.7% |
| Memory | ~7% of 1 GiB |
| desired/running | 1 / 1 |
| Resize decision | **Not justified** — no CPU/memory pressure |

## RDS (db.t4g.micro)

CloudWatch CPU datapoints sparse in test window; direct API latency indicates DB is not the dominant delay for simple auth reads. Conservative pool tuning added in backend config (max 5 connections, 5s connect timeout) — requires ECS redeploy to apply.

## Database optimization

| Change | Status |
|---|---|
| Connection pool (`max: 5`, idle 30s, connect 5s) | Code ready; **ECS deploy pending** |
| N+1 query fixes | Not required for measured bottleneck |
| New indexes | **Not required** — no migration |

## Backend observability

Added `HttpRequestLoggingInterceptor` logging:

```
HTTP_REQUEST method=… path=… status=… durationMs=… correlationId=…
```

Requires ECS redeploy to appear in CloudWatch.

## Frontend client changes

| Change | Detail |
|---|---|
| Default timeout | 15s (was 30s) for ordinary reads |
| GET retry | One bounded retry on 502/503/504 or transient network error |
| Business detail UX | Timeouts show "Request timed out", not "Business not found" |

## Fixes applied (this remediation)

1. **undici keep-alive** upstream agent in proxy route handler  
2. **vercel.json** `regions: ["iad1"]`  
3. **25s** upstream fetch timeout (down from 55s)  
4. **15s** client timeout + safe GET retry  
5. **HTTP_REQUEST** timing logs (backend, deploy pending)  
6. **DB pool** conservative tuning (backend, deploy pending)  
7. **Business detail** semantic error states  

## Pass criteria (post-deploy verification required)

After Vercel deploy, re-run:

```bash
PERF_ITERATIONS=10 node scripts/production/api-performance.mjs
```

Targets (warm, ordinary DB-backed reads):

| Path | p50 target | p95 target |
|---|---|---|
| Direct CloudFront | < 500 ms | < 1500 ms |
| Vercel proxy | < 800 ms | < 2000 ms |

Authenticated full matrix requires `EAZI_PROD_TEST_EMAIL` / `EAZI_PROD_TEST_PASSWORD`.

## D15 gate

**BLOCKED** until post-deploy benchmark confirms proxy p95 ≤ 2000 ms on representative portal reads and authenticated org/business flows succeed without timeout.
