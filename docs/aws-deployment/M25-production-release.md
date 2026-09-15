# M25 Production Release — Subscription Plans

| Field | Value |
| --- | --- |
| Status | **PASS** (backend + DB) |
| Date (UTC) | 2026-09-15 |
| Scope | M25 schema + runtime only; enforcement **off**; no M26; M12 gates unchanged |
| Secrets in this doc | **None** |

## PRE_DEPLOY_BASELINE

| Item | Value |
| --- | --- |
| Region | `us-east-1` |
| Account | `812047028300` |
| ECS cluster / service | `eaziacall-prod-cluster` / `eaziacall-prod-backend-service` |
| Task definition | `eaziacall-prod-backend:12` |
| Image digest | `sha256:f2e9d84684bc90f84cdd8ac1636f2425c6460c7a5301ef4d66fecd824138a8a7` |
| Desired / running | 1 / 1 |
| ALB target | healthy |
| RDS | available (during snapshot: backing-up → available) |
| `GET /health/live` | 200 |
| `GET /health/ready` | 200 |
| `GET /api/v1/public/plans` | **404** (pre-M25 revision) |
| Migration count | **16** (latest `IncomingAiCalls1756140000000`) |
| Organizations | **1** — `EaziAICall Production` (`35e6178e-5d74-4188-85ac-bee124adc6d5`) |
| Businesses / users / calls | 1 / 2 / 12 |
| M25 tables present | no |

## Recovery point

| Item | Value |
| --- | --- |
| Snapshot ID | `eaziacall-prod-pre-m25-20260915-174038` |
| Created | 2026-09-15T12:40:43Z |
| Status | **available** (100%) |

## Release content

- Subscriptions module (plans, plan_entitlements, subscriptions)
- `EntitlementsService`, public + authenticated APIs
- Enforcement hooks with `SUBSCRIPTION_ENFORCEMENT_MODE`
- Migration `1756150000000-SubscriptionPlans.ts` / `SubscriptionPlans1756150000000`
- `synchronize: false` (unchanged)
- Pending migration pre-check: **only** `SubscriptionPlans1756150000000`
- Local gates before image: typecheck PASS, build PASS, unit 228 PASS, e2e 87 PASS

## Migration

| Item | Value |
| --- | --- |
| Method | ECS one-off on task definition `:13` (TypeORM `migration:run`) |
| Result | **PASS** (exit 0) |
| Count before / after | **16 → 17** |
| Record | `SubscriptionPlans1756150000000` exactly once |
| Pending after | 0 |

### Schema / backfill

| Check | Result |
| --- | --- |
| Tables `plans`, `plan_entitlements`, `subscriptions` | present |
| `uq_plans_code` | present |
| `uq_plan_entitlements_plan_key` | present |
| `uq_subscriptions_organization` | present |
| `legacy_production` plan count | **1** (internal, not recommended, prices null) |
| Public active plans | **0** |
| Legacy entitlements | `voice_cloning.enabled`, `analytics.enabled`, `automations.enabled` |
| Org subscriptions | 1 org → 1 subscription; duplicates **0** |
| Data preserved | businesses 1, users 2, calls 12 |

## Backend deployment

| Item | Value |
| --- | --- |
| Image tag | `2265406-20260915t124341z` |
| Image digest | `sha256:14977e428d3564376246961349d45730a68d36a32d05d30984a0a89613180df2` |
| ECR scan | COMPLETE — critical **0**, high **0** |
| Task definition | `eaziacall-prod-backend:13` |
| Running task | `.../e133abb1f648423d9884a8c5962bbdb1` (HEALTHY) |
| Service | desired 1, running 1, rollout **COMPLETED** |
| `SUBSCRIPTION_ENFORCEMENT_MODE` | **off** |
| `REDIS_ENABLED` | false |

## Post-deploy verification

| Check | Result |
| --- | --- |
| `/health/live` | 200 |
| `/health/ready` ×8 | 200 |
| ALB target | healthy (`10.20.1.160`) |
| RDS | available |
| `GET /api/v1/public/plans` | **200** `{"plans":[]}` |
| Public security | no `legacy_production`, org IDs, subscriptions, secrets |
| `GET /api/v1/plans` (owner session) | 200; catalog empty; legacy excluded |
| `GET /api/v1/subscription` | 200; plan `legacy_production`; org match |
| `GET /api/v1/subscription/entitlements` | 200 |
| Invalid Twilio signature | **403** `INVALID_WEBHOOK_SIGNATURE` |
| Invalid ElevenLabs HMAC | **401** |
| Critical M25 log errors post-deploy | **none** (pre-deploy 404 warn only) |

## Marketing Website

| Item | Value |
| --- | --- |
| Deployed with this release | **NO** (Vercel still pre-marketing: `/` → `/dashboard`; `/pricing` 404) |
| Backend contract for pricing | **READY** — public plans 200 + empty |
| Note | Approved P1 marketing code remains local/unpushed; deploy separately when frontend is released to Vercel with `INTERNAL_BACKEND_ORIGIN` / `INTERNAL_API_BASE_URL` |

## Gates

| Gate | Status |
| --- | --- |
| M25 COMPLETE | ✅ |
| COMMERCIAL-GATE-M25 | [x] (implementation; production evidence recorded here) |
| P05-M12-GATE | **OPEN** (unchanged) |
| MVP-GATE-M12 | **OPEN** (unchanged) |
| M26 | **NOT STARTED** |

## Rollback notes

- Application: restore service to `eaziacall-prod-backend:12` / prior image digest.
- Database: do **not** casually run migration DOWN; use snapshot `eaziacall-prod-pre-m25-20260915-174038` only if required.
