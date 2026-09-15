# Module 25 — Subscription Plans

| Field | Value |
| --- | --- |
| Module | M25 — Subscription Plans & Entitlements |
| Phase | P09 — Commercial SaaS |
| Status | **COMPLETE** — 15 September 2026 |
| Depends on | M02, M03 |
| Blocks | M26, M27, M28, Marketing pricing pages |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Objective, boundaries, out of scope |
| [architecture-and-domain-model.md](./architecture-and-domain-model.md) | Ownership, states, enforcement, RBAC, legacy |
| [data-model.md](./data-model.md) | Tables, migration, seed |
| [entitlement-model.md](./entitlement-model.md) | Keys, resolution, enforcement mode |
| [api-contracts.md](./api-contracts.md) | REST endpoints |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal UX |
| [integration-boundaries.md](./integration-boundaries.md) | M26 / M27 / M28 / marketing |
| [M25_Subscription_Plans_manual-qa-guide.md](./M25_Subscription_Plans_manual-qa-guide.md) | Manual QA handoff |

## Deliverables (25.01–25.05)

- Design docs + runtime implementation aligned
- Migration `SubscriptionPlans1756150000000`
- Tables `plans`, `plan_entitlements`, `subscriptions`
- `EntitlementsService` + hooks (default enforcement **off**)
- APIs: public/authenticated plans, subscription, entitlements
- Internal `PlansService` mutations (no tenant/admin HTTP until M28)
- Portal Plan / Compare / Billing redirect
- Security & QA + Manual QA handoff complete

## Gate

`P09-M25-GATE` closed. **`P09-GATE` remains open** (M24/M26/M27 incomplete). Do not start M26/M27 until requested.

## Production release (2026-09-15)

| Item | Value |
| --- | --- |
| Evidence | [M25-production-release.md](../aws-deployment/M25-production-release.md) |
| Result | **PASS** (backend + DB) |
| Public plans | `GET /api/v1/public/plans` → **200** `{"plans":[]}` |
| Enforcement | `SUBSCRIPTION_ENFORCEMENT_MODE=off` |
| ECS | `eaziacall-prod-backend:13` |
| M12 gates | remain **OPEN** |
| M26 | **NOT STARTED** |
