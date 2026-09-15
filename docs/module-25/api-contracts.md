# Module 25 — API Contracts (implemented)

| Field | Value |
| --- | --- |
| Submodule | 25.02 — Backend, Persistence & API |
| Status | **Implemented** — 15 September 2026 |
| Prefix | `/api/v1` |

Error envelope: M00 `{ error: { code, message, correlationId, details? } }`.

## Implemented endpoints

### `GET /api/v1/public/plans`

| | |
| --- | --- |
| Auth | None |
| Cache | `Cache-Control: public, max-age=300` |
| Returns | `{ plans: PublicPlanView[] }` — active + `billing_visibility=public` only |

Empty list when no commercial public plans exist (current MVP). Never includes `legacy_production` or `internal` plans. No plan UUIDs, no tenant data.

### `GET /api/v1/plans`

| | |
| --- | --- |
| Auth | Required (`AuthGuard`) |
| Tenant | Active org cookie `eazi_org` + membership |
| Roles | owner, admin, manager, viewer |
| Returns | `{ plans: AuthenticatedPlanView[] }` — `public` + `authenticated` visibility |

Each plan includes `currentPlanMatch` relative to the org subscription.

### `GET /api/v1/subscription`

| | |
| --- | --- |
| Auth | Required |
| Tenant | Active org |
| Roles | all members |
| Returns | plan, status, trial, period, `cancelAtPeriodEnd`, capabilities |

Ensures legacy subscription if missing. `canManageBilling` always `false` until M27.

### `GET /api/v1/subscription/entitlements`

| | |
| --- | --- |
| Auth | Required |
| Tenant | Active org |
| Returns | `organizationId`, `planCode`, `status`, `entitlements`, `features`, `limits` |

## Admin / platform plan mutation (P09-M25-02-12)

**No platform-admin auth model exists in the repo.** Therefore:

- **No** insecure `/api/v1/admin/plans` HTTP routes.
- `PlansService.createPlan` / `updatePlan` / `archivePlan` / `replaceEntitlements` exist as **internal service** APIs for seeds/M28.
- MVP catalog management = migration seed only.
- Tenant Owner/Admin **cannot** mutate platform plans (no tenant mutation routes).

## Domain errors (enforcement)

| Code | HTTP | When |
| --- | --- | --- |
| `FEATURE_NOT_INCLUDED` | 403 | Boolean gate false (`enforce` mode) |
| `PLAN_LIMIT_REACHED` | 403 | Projected count > limit |
| `SUBSCRIPTION_INACTIVE` | 403 | expired / suspended / canceled past period |
| `TRIAL_EXPIRED` | 403 | trialing past `trial_end` |

`details` may include `featureKey`, `limit`, `current`, `planCode`, `required_plan_action`.

## Not implemented (correctly deferred)

| Path | Owner |
| --- | --- |
| `/api/v1/billing/*` | M27 |
| `/api/v1/webhooks/stripe` | M27 |
| `/api/v1/usage/*` | M26 |
| `/api/v1/admin/plans` REST | M28 |
