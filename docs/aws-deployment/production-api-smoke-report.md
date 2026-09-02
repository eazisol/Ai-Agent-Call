# Production API Smoke Report

**Date:** 2026-09-02  
**Frontend:** https://eazi-ai-call.vercel.app  
**Backend:** https://dl1t1qnfxrdka.cloudfront.net  
**Tool:** `scripts/production/api-smoke.mjs`

## Summary

| Metric | Count |
|---|---|
| Total implemented REST routes | 93 |
| Safe live-tested (unauthenticated + proxy/direct differential) | 12 route pairs |
| Validation/contract-tested locally | 27 frontend unit tests + proxy tests |
| Intentionally not executed (provider/destructive/email) | 58 |
| Authenticated live session | Requires `EAZI_PROD_TEST_EMAIL` / `EAZI_PROD_TEST_PASSWORD` |

## Root causes addressed in this remediation

1. **Duplicated frontend fetch/error handling** — 11 API modules each used bare `catch` blocks mapping timeouts/network failures to `"The EaziAiCall API is temporarily unavailable."`, masking backend 4xx messages (including organization/business validation and auth errors).
2. **15s client timeouts** on org/business modules — increased to shared 30s default with explicit timeout messaging.
3. **Intermittent upstream latency** — CloudFront POST/GET occasionally exceeds client timeout (~30–60s); proxy now has 55s upstream timeout and returns structured 502 on upstream fetch failure instead of hanging.

## Unauthenticated differential smoke (2026-09-02)

| Module | Method | Route | Direct | Proxy | Result | Notes |
|---|---|---|---|---|---|---|
| Auth | GET | auth/me | 401 | 401 | PASS | UNAUTHENTICATED |
| Auth | POST | auth/login | 401 | 401 | PASS | INVALID_CREDENTIALS (dummy creds) |
| Organizations | GET | organizations | 401 | 401* | PASS* | *first proxy attempt intermittently timed out at 30s; retry 401 in 515ms |
| Organizations | POST | organizations | 401 | 401 | PASS | UNAUTHENTICATED |
| Businesses | GET | businesses | 401 | 401 | PASS | UNAUTHENTICATED |
| Businesses | POST | businesses | 401 | 401 | PASS | UNAUTHENTICATED |
| Agents | GET | agents | 401 | 401 | PASS | UNAUTHENTICATED |
| Calls | GET | calls?direction=inbound | 401 | 401 | PASS | UNAUTHENTICATED |
| Knowledge | GET | knowledge | 401 | 401 | PASS | UNAUTHENTICATED |
| Voices | GET | voices | 401 | 401 | PASS | UNAUTHENTICATED |
| Phone Numbers | GET | phone-numbers | 401 | 401 | PASS | UNAUTHENTICATED |
| Telephony | GET | telephony/provider-status | 401 | 401 | PASS | UNAUTHENTICATED |

## Organization / business failure trace

| Step | Finding |
|---|---|
| Request reaches Vercel | Yes |
| Vercel proxy calls CloudFront | Yes (when not timing out) |
| Request reaches NestJS | Yes — CloudWatch shows `GET/POST /api/v1/organizations` with `Authentication required.` |
| NestJS status | 401 unauthenticated / 201 authenticated create |
| Frontend mis-map | Bare `catch` in `organizations-api.ts` / `businesses-api.ts` converted `TimeoutError` → API unavailable |

## Cookie lifecycle (metadata only)

| Cookie | Set by | HttpOnly | Secure | SameSite | Host |
|---|---|---|---|---|---|
| eazi_access | login/refresh | yes | yes | none (prod) | eazi-ai-call.vercel.app |
| eazi_refresh | login/refresh | yes | yes | none (prod) | eazi-ai-call.vercel.app |
| eazi_org | org create/switch | yes | yes | none (prod) | eazi-ai-call.vercel.app |
| eazi_biz | business create/switch | yes | yes | none (prod) | eazi-ai-call.vercel.app |

No `Domain=.vercel.app` observed. Multiple `Set-Cookie` preserved via `getSetCookie()` + separate append in proxy route handler.

## D14 production tenant (reuse for authenticated smoke)

| Entity | ID |
|---|---|
| Organization | `91cef079-51a2-47c7-92aa-98527523ad2b` |
| Business | `501df018-cb8c-4731-b7d8-bcf68af0e92b` |
| Agent | `15784e32-ce59-41e3-91f5-b6f3b3042091` |
| Phone number | `6b33cbc5-5af6-4bab-af5c-a21c2e427b51` |

Use existing D14 tenant for authenticated reads; avoid duplicate org/business creation in production.

## Modules — intentionally not executed in production

| Module | Routes | Reason |
|---|---|---|
| Auth register/forgot/reset | POST | email side effects |
| Phone numbers purchase/search/release | POST/DELETE | Twilio billing/provider |
| Agent/knowledge/voice sync | POST | provider mutations |
| Voice clone submit/retry | POST | provider cost |
| Voice preview | POST | TTS provider cost |
| Webhooks | POST | requires provider signatures |
| Destructive DELETE/archive | DELETE/POST | production data safety |

## AWS runtime health (post-test)

| Check | Status |
|---|---|
| CloudFront /health/live | 200 |
| CloudFront /health/ready | 200 |
| ECS desired/running | 1/1 |
| ALB target | healthy |

## Data safety

- No migrations run
- No D14 routing changes
- No provider resources created
- No fake call rows inserted

## Authenticated smoke

Set environment variables locally (never commit):

```bash
export EAZI_PROD_TEST_EMAIL=...
export EAZI_PROD_TEST_PASSWORD=...
node scripts/production/api-smoke.mjs
```

Expected authenticated flow: login → auth/me 200 → organizations/businesses/agents/calls list 200 with D14 context cookies.
