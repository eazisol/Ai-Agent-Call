# M25 — Subscription Plans — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M25 — Subscription Plans & Entitlements |
| Phase | P09 — Commercial SaaS |
| Status | Complete — 15 September 2026 |
| Depends on | M02 Organizations, M03 Users / Roles |
| Blocks | M26 Usage Metering, M27 Billing, M28 Admin Portal (plan admin REST), marketing pricing |
| Audience | Independent Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M25 delivers the **commercial ownership chain**:

```text
Organization → Subscription → Plan → Plan Entitlements
```

It introduces plan catalog persistence, per-organization subscriptions (including trials), entitlement resolution, optional **server-side** enforcement of limits/feature gates, customer Plan UI, and a sanitized public plan catalog. **Stripe, usage metering, and marketing website pricing are out of scope.**

**Why M25 exists:** Product cannot safely sell, trial, or gate features without a first-party plan/subscription model owned by the organization (tenant), independent of providers.

---

## 2. Delivered scope

### In scope

- Tables: `plans`, `plan_entitlements`, `subscriptions`
- Migration: `SubscriptionPlans1756150000000` (`1756150000000-SubscriptionPlans.ts`)
- Internal plan `legacy_production` (compatibility for existing orgs; not public/selectable)
- APIs: `GET /api/v1/public/plans`, `GET /api/v1/plans`, `GET /api/v1/subscription`, `GET /api/v1/subscription/entitlements`
- `EntitlementsService` + hooks on business/agent/phone create and voice-clone create/submit
- Config: `SUBSCRIPTION_ENFORCEMENT_MODE=off|enforce` (default **`off`**)
- Portal: `/settings/plan`, `/settings/plan/compare`, `/billing` → redirect to Plan
- Commercial error mapping on frontend (`FEATURE_NOT_INCLUDED`, `PLAN_LIMIT_REACHED`, etc.)

### Explicit out of scope (do **not** file as M25 bugs)

- Stripe / checkout / invoices / payment methods (**M27**)
- Usage metering / overage billing (**M26**)
- Platform Admin REST for plan CRUD (**M28**) — mutations remain **internal service-only**
- Marketing website / public pricing pages
- Knowledge-base commercial limits
- Minute hard-stop vs soft overage policy (**PRODUCT DECISION REQUIRED**)
- Repeat-trial policy (**PRODUCT DECISION REQUIRED**)
- Final commercial plan names, prices, and limits (**PRODUCT DECISION REQUIRED**)
- Closing M12 Incoming AI Calls gate (unrelated; remains open)

---

## 3. Dependencies

| Dependency | Required for M25 |
| --- | --- |
| M02 Organizations | Active org cookie + membership |
| M03 Roles | owner / admin / manager / viewer |
| M04 / M05 / M09 / M11 | Enforcement hooks only (resources already exist) |
| Postgres migration applied | `1756150000000` |
| Frontend same-origin proxy | `/api/backend/*` → Nest `/api/v1/*` |

---

## 4. Required environment

| Variable | Values | Behavior |
| --- | --- | --- |
| `SUBSCRIPTION_ENFORCEMENT_MODE` | `off` (default) | Resolve entitlements/APIs; **do not** block creates |
| `SUBSCRIPTION_ENFORCEMENT_MODE` | `enforce` | Backend asserts limits/features/subscription activity |

Documented in `ai-call-agent-backend/.env.example`, `.env.docker.example`, and `docs/module-0/environment-strategy.md`.

**Do not** put secrets, Stripe keys, or production tenant data in QA notes.

---

## 5. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| View plans / subscription / entitlements | ✓ | ✓ | ✓ | ✓ |
| Create / edit / archive platform plans | ✗ | ✗ | ✗ | ✗ |
| Replace plan entitlements | ✗ | ✗ | ✗ | ✗ |
| Assign arbitrary plan to own org via API | ✗ | ✗ | ✗ | ✗ |
| Manage billing / Stripe | ✗ (deferred M27) | ✗ | ✗ | ✗ |

Plan mutations exist only on `PlansService` (seed/internal). Tenant HTTP mutation routes must **404**.

---

## 6. Customer-facing routes

| Route | Expected |
| --- | --- |
| `/settings/plan` | Current subscription from API; real plan name; entitlements; loading/empty/error/retry |
| `/settings/plan/compare` | Authenticated catalog; empty state when no commercial plans; no `legacy_production` |
| `/billing` | Redirect to `/settings/plan` (no checkout) |

Upgrade CTA: disabled **"billing setup coming soon"** — no payment action.

---

## 7. Backend APIs

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/public/plans` | None | Active + `billing_visibility=public` only; sanitized |
| GET | `/api/v1/plans` | Required + org | `public` + `authenticated`; `currentPlanMatch` |
| GET | `/api/v1/subscription` | Required + org | Org A data only |
| GET | `/api/v1/subscription/entitlements` | Required + org | Resolved map |
| POST/PUT/DELETE | `/api/v1/plans`, `/api/v1/admin/plans` | N/A | Must **404** |

### Commercial error contract

| Code | HTTP | Meaning |
| --- | --- | --- |
| `FEATURE_NOT_INCLUDED` | 403 | Boolean feature false under `enforce` |
| `PLAN_LIMIT_REACHED` | 403 | Projected count > limit |
| `SUBSCRIPTION_INACTIVE` | 403 | expired / suspended / canceled past period |
| `TRIAL_EXPIRED` | 403 | `trialing` with `trial_end` in the past |
| `ORGANIZATION_REQUIRED` | 400 | Missing active org cookie |
| `UNAUTHENTICATED` | 401 | No session |

Envelope: `{ error: { code, message, correlationId, details? } }` — no stacks, SQL, or secrets.

---

## 8. Data model

### `plans`

Catalog row: `code`, `name`, `status`, `billing_visibility` (`public` | `authenticated` | `internal`), trial flags, nullable price cents, `comparison_metadata`.

### `plan_entitlements`

Typed rows per plan. Unique `(plan_id, entitlement_key)`. No silent type coercion.

### `subscriptions`

One row per organization (`organization_id` unique). Statuses: `trialing`, `active`, `past_due`, `grace_period`, `canceled`, `expired`, `suspended`.

### `legacy_production`

- Internal visibility; never on public catalog; not customer-selectable
- Seeded entitlements: voice cloning on; analytics/automations off; **no** integer limit rows (unlimited)
- Existing orgs backfilled / ensured at read time
- With `enforcement=off`, current tenants are not locked

---

## 9. Entitlement resolution

| Key | Type | Missing semantics |
| --- | --- | --- |
| `businesses.max` | integer | `null` = unlimited |
| `agents.max` | integer | `null` = unlimited |
| `phone_numbers.max` | integer | `null` = unlimited |
| `minutes.monthly_included` | integer | Allowance display only (usage = M26) |
| `voice_cloning.enabled` | boolean | missing → `false` |
| `analytics.enabled` | boolean | missing → `false` |
| `automations.enabled` | boolean | missing → `false` |

Inactive subscription (resolved): booleans `false`, integers `0`.

### Subscription state behavior (documented)

| Status | Entitled? | Notes |
| --- | --- | --- |
| `trialing` | Yes if `trial_end` null or future | Past `trial_end` → `TRIAL_EXPIRED` under `enforce` |
| `active` | Yes | |
| `past_due` | Yes (currently) | **PRODUCT DECISION REQUIRED** — strictness TBD |
| `grace_period` | Yes (currently) | **PRODUCT DECISION REQUIRED** — `grace_period_end` not strictly enforced yet |
| `canceled` | Yes until `current_period_end` | Then inactive |
| `expired` / `suspended` | No | `SUBSCRIPTION_INACTIVE` |

---

## 10. Server-side enforcement

| Resource | Hook | Provider safety |
| --- | --- | --- |
| Business create | `assertCanCreateBusiness` | N/A |
| Agent create | `assertCanCreateAgent` | N/A |
| Phone purchase/import | `assertCanAddPhoneNumber` **before** Twilio | Provider invocations must be **0** when blocked |
| Voice clone draft + submit | `assertCanUseVoiceCloning` **before** provider clone | Provider `createClone` invocations must be **0** when blocked |

Frontend state is **never** authoritative.

---

## 11. Loading / empty / error / success UI

Verify on Plan and Compare:

- Loading skeleton/spinner while APIs in flight
- Empty commercial catalog message (no fake Starter/Growth/Scale inventory)
- Error + retry when API fails
- Success shows real plan code/name and entitlement map
- No fake `1820/2500` meters
- No fake checkout

---

## 12. Manual test cases

Each case: Preconditions → Steps → Expected → Pass/Fail → Evidence.

### QA-M25-01 — Open current Plan page

| | |
| --- | --- |
| Preconditions | Logged-in user; active organization |
| Steps | Open `/settings/plan` |
| Expected | Page loads; shows subscription section from API |
| Pass/Fail | |
| Evidence | Screenshot + network `GET .../subscription` 200 |

### QA-M25-02 — View subscription status

| | |
| --- | --- |
| Preconditions | Org has subscription (legacy or commercial) |
| Steps | Inspect status on Plan page |
| Expected | Status matches API (`active`, `trialing`, etc.) |
| Pass/Fail | |
| Evidence | Screenshot + response body `status` |

### QA-M25-03 — View entitlements

| | |
| --- | --- |
| Preconditions | Same as above |
| Steps | Open entitlements section / call entitlements API |
| Expected | Features + limits match plan rows; correct boolean/integer typing |
| Pass/Fail | |
| Evidence | `GET .../subscription/entitlements` JSON |

### QA-M25-04 — Open Compare Plans

| | |
| --- | --- |
| Preconditions | Authenticated session |
| Steps | Open `/settings/plan/compare` or Compare CTA |
| Expected | Catalog from `GET /api/v1/plans`; no payment |
| Pass/Fail | |
| Evidence | Screenshot + network |

### QA-M25-05 — No commercial plans empty state

| | |
| --- | --- |
| Preconditions | DB has no `public`/`authenticated` commercial plans (MVP default) |
| Steps | Open Compare |
| Expected | Empty/safe state; not a crash; no invented plans |
| Pass/Fail | |
| Evidence | Screenshot |

### QA-M25-06 — Trial subscription

| | |
| --- | --- |
| Preconditions | SAFE local DB; subscription `trialing` with future `trial_end`; `enforce` |
| Steps | Resolve entitlements / exercise allowed create within limits |
| Expected | Entitlements available per plan |
| Pass/Fail | |
| Evidence | DB row + API/assert log |

### QA-M25-07 — Expired trial

| | |
| --- | --- |
| Preconditions | `trialing` + past `trial_end`; `enforce` |
| Steps | Call assert / gated create |
| Expected | `TRIAL_EXPIRED` 403 |
| Pass/Fail | |
| Evidence | Error envelope |

### QA-M25-08 — Feature not included

| | |
| --- | --- |
| Preconditions | `voice_cloning.enabled=false`; `enforce` |
| Steps | Create/submit voice clone |
| Expected | `FEATURE_NOT_INCLUDED`; provider clone calls = 0 |
| Pass/Fail | |
| Evidence | Unit/local verify + API error |

### QA-M25-09 — Business limit reached

| | |
| --- | --- |
| Preconditions | Plan `businesses.max=1`; one active business; `enforce` |
| Steps | Create second business |
| Expected | `PLAN_LIMIT_REACHED` |
| Pass/Fail | |
| Evidence | Error `details.featureKey=businesses.max` |

### QA-M25-10 — Agent limit reached

| | |
| --- | --- |
| Preconditions | `agents.max=1`; one non-archived agent; `enforce` |
| Steps | Create second agent |
| Expected | `PLAN_LIMIT_REACHED` |
| Pass/Fail | |
| Evidence | Error envelope |

### QA-M25-11 — Phone-number limit reached

| | |
| --- | --- |
| Preconditions | `phone_numbers.max=1`; one active/provisioning number; `enforce` |
| Steps | Purchase/import second number |
| Expected | `PLAN_LIMIT_REACHED` **before** Twilio purchase; provider calls = 0 |
| Pass/Fail | |
| Evidence | Unit test `phone-numbers-entitlement` + local verify |

### QA-M25-12 — Cross-tenant subscription blocked

| | |
| --- | --- |
| Preconditions | Org A and Org B; user member of A only (or cookie org A) |
| Steps | Attempt to read B subscription / inject B org id |
| Expected | Reject / Org A data only; never B payload |
| Pass/Fail | |
| Evidence | e2e `cross-tenant subscription read is blocked` |

### QA-M25-13 — Unauthenticated subscription blocked

| | |
| --- | --- |
| Preconditions | No auth cookies |
| Steps | `GET /api/v1/subscription` and `/entitlements` |
| Expected | 401 `UNAUTHENTICATED`; public plans still 200 |
| Pass/Fail | |
| Evidence | e2e unauthenticated test |

### QA-M25-14 — Legacy production tenant remains usable

| | |
| --- | --- |
| Preconditions | Org on `legacy_production`; `enforcement=off` |
| Steps | Create business/agent; open Plan page |
| Expected | Flows work; UI does not expose internal implementation jargon as a sellable plan |
| Pass/Fail | |
| Evidence | Regression with mode `off` |

### QA-M25-15 — Public plans sanitization

| | |
| --- | --- |
| Preconditions | Mix of public + `legacy_production` + internal QA plan |
| Steps | `GET /api/v1/public/plans` |
| Expected | No legacy/internal; no org IDs, subscription rows, secrets, Stripe placeholders, provider IDs, enforcement config |
| Pass/Fail | |
| Evidence | Response JSON review |

### QA-M25-16 — Upgrade CTA performs no payment action

| | |
| --- | --- |
| Preconditions | Compare page with a non-current plan (or disabled CTA visible) |
| Steps | Click Upgrade |
| Expected | No Stripe/checkout; disabled / “billing setup coming soon” |
| Pass/Fail | |
| Evidence | Screenshot + confirm no billing network calls |

---

## 13. Negative / abuse cases (summary)

- Fake plan code from browser → ignored; backend resolves from DB subscription
- Fake entitlement payload → not accepted; client cannot set entitlements
- Guessed subscription/plan UUIDs → no cross-tenant leak
- Direct resource create despite UI hide → backend still enforces when `enforce`
- Organization Owner cannot mutate platform plans

---

## 14. Regression scope

With `SUBSCRIPTION_ENFORCEMENT_MODE=off`:

- M02 org flows
- M03 roles
- M04 business create
- M05 agent create
- M09 voice clone flows (no paid provider required for draft)
- M11 phone flows (do not purchase real numbers in QA unless authorized)
- M12 inbound path only where practical (gate remains open; no M12 closure)

---

## 15. Known limitations

- Default enforcement **off** for production compatibility until commercial launch decision
- No commercial public plans seeded yet → Compare empty state is expected
- `past_due` / `grace_period` strictness undecided
- Minutes are allowance metadata only until M26
- Admin plan REST deferred to M28

---

## 16. Unresolved product decisions

Document as **PRODUCT DECISION REQUIRED** (do not invent):

1. Commercial plan names / prices / final limits  
2. Repeat trial policy  
3. Minute overage vs hard stop  
4. Admin billing access model  
5. Knowledge limits  
6. Enterprise CTA behavior  
7. `past_due` / `grace_period` enforcement strictness  

---

## 17. Bug-reporting format

```text
Module: M25
Case ID: QA-M25-XX
Environment: local | staging (never paste secrets)
Enforcement mode: off | enforce
Org role: owner|admin|manager|viewer
Steps:
Expected:
Actual:
Evidence: screenshot / request id / correlationId
Severity: blocker|major|minor
```

---

## 18. QA evidence requirements

- Network traces for Plan APIs (no secrets)
- Screenshots of Plan / Compare / Billing redirect
- For enforce tests: error JSON with `code` + safe `details`
- Confirmation provider call counts = 0 on blocked phone/voice paths (unit or harness logs)

---

## 19. Final sign-off checklist

- [ ] All QA-M25-01…16 executed or waived with written reason  
- [ ] No tenant isolation failures  
- [ ] No plan mutation via customer roles  
- [ ] Public plans sanitized  
- [ ] Enforcement off regression OK  
- [ ] Docs/registry match runtime  
- [ ] M26/M27/Stripe/marketing not accidentally shipped  
- [ ] Tester name / date / commit SHA recorded  

**Sign-off:** _________________ Date: ________ SHA: ________

---

## 20. Agent verification evidence (15 September 2026)

| Area | Result |
| --- | --- |
| Local DB enforcement script `scripts/m25-enforcement-verify.cjs` | PASS (limits, feature, trial, isolation, public filter, off no-op) |
| Unit: entitlements / plans / phone entitlement / voice clone feature gate | PASS |
| e2e: subscriptions (public, tenant, unauth, no mutation routes) | PASS |
| Security fix | Voice clone **submit** now re-checks `assertCanUseVoiceCloning` before provider |
| Production / Stripe / metering / marketing | Unchanged (NO) |
