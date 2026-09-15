# Module 25 — Architecture & Domain Model

| Field | Value |
| --- | --- |
| Submodule | 25.01–25.05 (runtime + QA complete) |
| Status | **COMPLETE** — 15 September 2026 |

## 25.02 implementation notes

| Item | Actual |
| --- | --- |
| Nest module | `SubscriptionsModule` |
| Services | `PlansService`, `SubscriptionsService`, `EntitlementsService` |
| Controllers | `PublicPlansController`, `SubscriptionsController` |
| Enforcement config | `SUBSCRIPTION_ENFORCEMENT_MODE` = `off` \| `enforce` (default **off**) |
| Legacy | `legacy_production` + migration backfill + runtime `ensureLegacySubscription` |
| Admin HTTP | **Deferred to M28** — no platform-admin auth exists; `PlansService` mutations are internal-only |
| Hooks | Businesses / Agents / PhoneNumbers / VoiceClones (create **and** submit) — no-op when mode=`off` |

## 1. Commercial hierarchy (locked)

```text
Organization (tenant root, M02)
  └── Subscription (1:1 active commercial record per org — locked)
        └── Plan (platform catalog row)
              └── Plan entitlements (many rows: key + typed value)
  └── Business[] (M04)
        └── Agent[], PhoneNumber[], Knowledge, Voice assets/clones
```

### Why Organization owns the subscription (not Business)

| Evidence | Implication |
| --- | --- |
| M02 locks `organization_id` as tenant root; billing deferred to M25 at **org** level | Subscription attaches to org |
| M03 team/RBAC is **organization-scoped** | Commercial “account” matches team workspace |
| `businesses.organization_id` links locations; one org may run many businesses | Per-business subscriptions would fragment billing and limits unnaturally |
| Agents and phone numbers are **business-scoped** but counted for **org-wide** limits | Enforcement resolves org from active business cookie + membership |
| No existing `business_id` on any billing sketch | No architectural precedent for per-business plans |

**Decision (locked):** `subscriptions.organization_id` UNIQUE (one active subscription row per organization). Businesses **consume** the organization subscription; they do not own separate plans.

## 2. Domain concepts

| Concept | Responsibility |
| --- | --- |
| **Plan** | Provider-neutral product definition (code, marketing metadata, lifecycle). No Stripe IDs in core columns. |
| **Plan entitlement** | Extensible key/value entitlement attached to a plan. |
| **Subscription** | Organization’s commercial state: plan reference, status, period boundaries, trial windows, cancel intent. |
| **Resolved entitlements** | Effective map `key → value` after plan + subscription state (+ optional future overrides). |
| **Billing provider mapping** | External IDs (Stripe customer/subscription/price). **M27 only** — separate table/port. |

## 3. Subscription lifecycle states (internal, billing-neutral)

States needed for M25/M27 coordination:

| State | Grants product entitlements? | Notes |
| --- | --- | --- |
| `trialing` | **Yes** (plan entitlements) | Trial window active; payment method optional until M27 |
| `active` | **Yes** | Paid or comped active period |
| `past_due` | **Yes** (grace policy) | M27 failed payment; M25 defines default **continue access** until grace ends — **DECISION REQUIRED** for strictness |
| `grace_period` | **Yes** (reduced or full — **DECISION REQUIRED**) | Explicit grace after `past_due`; default design: **full entitlements** until `grace_period_end` |
| `canceled` | **Yes until `current_period_end`** | Cancel at period end; no new upgrades without M27 |
| `expired` | **No** (read-only / blocked mutations) | Trial ended without conversion or sub ended |
| `suspended` | **No** | Platform or billing suspension (M28/M27) |

M25 stores and exposes these states; **only M27** transitions them from Stripe/webhooks (plus platform admin in M28).

### Entitlement resolution by state

```text
resolve(orgId):
  subscription = load by organization_id
  if no row → legacy resolver (§7)
  if status in { trialing, active, past_due, grace_period, canceled (before period end) }
      → merge plan entitlements
  if status in { expired, suspended }
      → empty or minimal read-only entitlements (DECISION REQUIRED: allow view calls vs block login)
```

**Default (locked for MVP):** `expired` / `suspended` block **mutations** that require entitlements; **read** APIs for existing data follow M03 RBAC (no data deletion).

## 4. Trial foundation (M25 vs M27)

| Concern | M25 | M27 |
| --- | --- | --- |
| `trial_start`, `trial_end` on subscription | ✓ | reads/writes on conversion |
| Eligibility flags on plan (`trial_eligible`) | ✓ | |
| Default trial duration | Plan field `trial_days` or platform default | |
| One trial per organization | **DECISION REQUIRED** — recommended: **one ever** (`organizations.trial_consumed_at` or subscription history) | |
| Payment method during trial | **Not required** in M25 | Checkout before trial end |
| At trial expiry without pay | → `expired` (M27 job/webhook) | owns conversion |

## 5. Server-side enforcement architecture (25.02+ target)

Follow existing domain pattern (M05–M11): permissions file + service guards + `ApplicationError`.

### NestJS module shape (target)

```text
SubscriptionsModule (or PlansModule + SubscriptionsModule)
├── PlansController              GET catalog (authenticated + public variant)
├── SubscriptionsController      GET subscription, GET entitlements
├── EntitlementsService          resolve + assert (core)
├── SubscriptionResolverService  load subscription + legacy fallback
├── plan-permissions.ts          RBAC for reads
├── entities: Plan, PlanEntitlement, Subscription
└── imports: OrganizationsModule, TypeORM
```

### EntitlementsService API (conceptual)

| Method | Use |
| --- | --- |
| `getResolvedEntitlements(organizationId)` | Portal + internal |
| `getLimit(organizationId, key)` | Returns integer or null (unlimited) |
| `canUseFeature(organizationId, key)` | Boolean keys |
| `assertFeature(organizationId, key)` | Throws `FEATURE_NOT_INCLUDED` |
| `assertWithinLimit(organizationId, key, projectedCount)` | Throws `PLAN_LIMIT_REACHED` |
| `assertSubscriptionActive(organizationId)` | Throws `SUBSCRIPTION_INACTIVE` / `TRIAL_EXPIRED` |

**Source of truth:** PostgreSQL via NestJS only. Never trust frontend plan labels, Stripe metadata, or provider tiers for SaaS gating.

### Enforcement insertion points (locked)

| Action | Service | When |
| --- | --- | --- |
| Create business | `BusinessesService` | Before insert; count `businesses` where `organization_id` |
| Create agent | `AgentsService` | Before insert; count agents via join `ai_agents → businesses` |
| Purchase/import phone number | `PhoneNumbersService` | **Before** `TelephonyProviderPort` charge |
| Start voice clone job | `VoiceClonesService` | `voice_cloning.enabled` + optional clone count limit |
| Inbound/outbound call | **M26 + policy** | M25 defines `minutes.monthly_included`; M26 compares usage; block/warn policy **DECISION REQUIRED** |
| Analytics UI/API | Future M24 | `analytics.enabled` gate only |

Minutes: M25 **does not** meter. M25 exposes limit; M26 exposes `used`; shared helper in 26.02:

```text
MinutesPolicyPort (M26 implements, M25 defines interface):
  assertCanStartOrContinueCall(orgId) → ok | PLAN_LIMIT_REACHED | SUBSCRIPTION_INACTIVE
```

## 6. Limit & feature failure behavior

HTTP status follows existing patterns (`ApplicationError.statusCode`).

| Code | HTTP | When | `details` (examples) |
| --- | --- | --- | --- |
| `FEATURE_NOT_INCLUDED` | 403 | Boolean entitlement false | `{ featureKey, planCode }` |
| `PLAN_LIMIT_REACHED` | 403 | Count ≥ limit | `{ featureKey, limit, current, planCode }` |
| `SUBSCRIPTION_INACTIVE` | 403 | expired/suspended | `{ status }` |
| `TRIAL_EXPIRED` | 403 | trialing past `trial_end` | `{ trialEnd }` |

Frontend maps codes to Upgrade CTA (25.03); enforcement remains server-side.

**Unlimited sentinel:** integer entitlement value `-1` or `null` meaning no cap — **locked: use `null` in DB = unlimited**; API omits limit or sends `null`.

## 7. Legacy / production organizations (no subscription row today)

**Recommended strategy (locked):** **Dedicated legacy plan + backfill + phased enforcement**

1. Seed plan code `legacy_production` (internal, not public marketing) with entitlements **at or above** current production usage (high caps / all MVP features on).
2. Migration in **25.02** creates `subscriptions` row for **every** existing `organizations` id → `legacy_production`, status `active`.
3. Config flag `SUBSCRIPTION_ENFORCEMENT_MODE` (`off` \| `soft` \| `hard`) — default **`off`** until commercial launch; `hard` enables asserts in domain services.
4. Never block existing orgs on first deploy: backfill runs **before** enforcement default flips.

Alternatives rejected:

| Option | Why not |
| --- | --- |
| Unrestricted “no row” forever | Ambiguous; marketing tiers cannot roll out |
| Per-org manual assignment | Error-prone at scale |
| Business-level subscriptions | Conflicts with M02/M03 tenant model |

## 8. RBAC (aligned with M03)

Code-defined matrix extension — no new permissions table.

### Customer portal — subscription & plans

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| View current plan & status | ✓ | ✓ | ✓ | ✓ |
| View resolved entitlements / limits | ✓ | ✓ | ✓ | ✓ |
| View plan comparison (authenticated) | ✓ | ✓ | ✓ | ✓ |
| Initiate upgrade / change plan (M27 checkout) | ✓ | **DECISION REQUIRED** | ✗ | ✗ |
| Manage payment methods / invoices | ✗ (M27) | ✗ | ✗ | ✗ |

**Recommendation:** **Owner-only** for M27 billing mutations; **admin** read-only for subscription (matches sensitive telephony purchases: owner/admin for spend, but subscription/billing stays owner-only to reduce PCI/support risk).

### Platform plan mutations

| Action | Customer roles | Platform |
| --- | --- | --- |
| Create/update/archive plans | ✗ | M28 admin (future); until then **migrations/seeds only** |

## 9. Plan seeding & admin management (MVP path)

**Hybrid (locked recommendation):**

| Phase | Mechanism |
| --- | --- |
| 25.02 MVP | Idempotent **migration seed** for `plans` + `plan_entitlements` + `legacy_production` |
| Commercial launch | Product updates via new migration or seed script (reviewed PR) |
| M28 | Admin CRUD with audit log; customer tenants cannot mutate catalog |

Customer-facing orgs **never** PATCH platform plans.

## 10. Marketing website contract (summary)

Public-safe catalog derived from same `plans` rows as portal—see [api-contracts.md](./api-contracts.md) `GET /api/v1/public/plans`.

**Recommendation:** **DB-driven catalog** as canonical source; marketing site fetches at build time (ISR) to avoid pricing drift. Details in [integration-boundaries.md](./integration-boundaries.md).

## 11. Security threats (design)

| Threat | Mitigation |
| --- | --- |
| Cross-org subscription read | Scope all queries by `organization_id` from membership, never from body |
| Client tampering with plan/limit | Server resolves entitlements; DTOs read-only |
| Customer edits catalog | No customer APIs for plan mutation |
| Stripe IDs in plan table | Forbidden; use M27 mapping table |
| Leak internal cost/provider data | Public DTO strips internal fields |

Audit: plan/entitlement changes (M28) and subscription status changes (M27) → `audit_logs` (M29).
