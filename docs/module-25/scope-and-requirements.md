# Module 25 — Subscription Plans: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M25 — Subscription Plans & Entitlements |
| Submodule | 25.01 — Scope & Technical Design |
| Phase | P09 — Commercial SaaS |
| Status | **COMPLETE** (25.01–25.05) — 15 September 2026 |
| Depends on | **M03** (roles); **M02** (organization tenant) |
| Blocks | M26 Usage Metering, M27 Billing, M28 Admin (plan ops), Marketing pricing pages |

## 1. Objective

Establish **Subscription Plans** as the canonical **commercial entitlement layer** for EaziAICall: which **Organization** is on which **Plan**, what **features and resource limits** that plan grants, how **trials and subscription states** affect access, and how **server-side enforcement** will gate product actions—without owning payment processing, usage measurement, or marketing site implementation.

```text
Organization → Subscription → Plan → Plan entitlements (key/value)
     └── Businesses → Agents / Phone numbers / Calls / Knowledge / Voices
```

M25 answers **what the tenant is allowed to do**. M26 answers **what they have consumed**. M27 answers **how they pay and how provider billing state maps to subscription state**.

## 2. Repo audit summary (25.01)

### Backend — present today

| Area | Finding | Classification |
| --- | --- | --- |
| `organizations`, `organization_members` | Tenant root + M03 roles (`owner` \| `admin` \| `manager` \| `viewer`) | **EXTEND** (subscription FK on org) |
| `businesses.organization_id` | Business under org; agents/numbers/calls hang off business | **KEEP** (limits aggregate at org via joins) |
| `ai_agents.business_id`, `phone_numbers.business_id` | Resource ownership unchanged | **KEEP** (enforcement counts org-wide) |
| Permission modules (`*-permissions.ts`) | Code-defined RBAC matrices per domain | **EXTEND** (subscription read permissions) |
| `ApplicationError` + M00 error envelope | Stable `{ error: { code, message, correlationId, details? } }` | **EXTEND** (entitlement error codes) |
| Provider ports (Twilio, ElevenLabs, email) | Replaceable adapters | **KEEP** |
| `BillingProvider` / Stripe | Documented in architecture registry only; **no** Nest module, entities, or migrations | **PARK** (M27) |
| `plans`, `subscriptions`, `plan_*` tables | **Not in codebase or migrations** | Greenfield in **25.02** |
| Rate limits / voice provider “paid plan” errors | Provider-account messaging (ElevenLabs API key tier), not SaaS entitlements | **KEEP** (separate concern) |

### Frontend — present today

| Area | Finding | Classification |
| --- | --- | --- |
| `mocks/portal-shell.ts` | Mock org `plan` string; **Monthly minutes** `1820/2500`; nav link `/billing` | **EXTEND** (replace with APIs in 25.03+) |
| `components/shell/usage-indicator.tsx` | Reads mock `usageSummary` | **EXTEND** (M25 limit + M26 usage) |
| `settings/*` | Organization + Integrations only; **no** plan/billing route | Greenfield in **25.03** |
| `(admin)/admin/*` | Placeholder admin shell; mock `/admin/billing`, `/admin/subscriptions` | **PARK** (M28) |
| No `/billing` page in App Router | Nav target is mock-only | **EXTEND** later |

### Docs / registry

| Area | Finding |
| --- | --- |
| M02, M03, M04, M05, M08, M10, M11 | Explicitly defer billing/limits to **M25+** |
| Master project schema sketch | `plans`, `plan_features`, `subscriptions`, `subscription_items` (conceptual) |
| Roadmap checklist M25 | Tables named `plan_features` in 25.02 items; APIs `GET /api/v1/plans`, `GET /api/v1/subscription` |

**Conflicts / debt:** No implementation debt to refactor—only **UX mocks** and **documentation naming drift** (`plan_features` vs `plan_entitlements`; resolved in [entitlement-model.md](./entitlement-model.md)). ElevenLabs “paid plan required” must not be confused with EaziAICall plan enforcement.

## 3. Boundaries

### In scope (M25 overall; 25.01 = design only)

| ID | Capability | 25.01 deliverable |
| --- | --- | --- |
| P09-M25-01-01 | Objective & boundaries | This document + [integration-boundaries.md](./integration-boundaries.md) |
| P09-M25-01-02 | Define plans | Catalog model; **PRODUCT DECISION REQUIRED** for commercial tier names/prices/limits |
| P09-M25-01-03 | Plan features / entitlements | [entitlement-model.md](./entitlement-model.md) |
| P09-M25-01-04 | Subscription assignment | Org-owned subscription — [architecture-and-domain-model.md](./architecture-and-domain-model.md) |
| P09-M25-01-05 | Trial foundation | State + fields; payment in M27 |
| P09-M25-01-06 | Limit enforcement design | Agents, businesses, minutes (policy hook), phone numbers |
| P09-M25-01-07 | Feature gates | Boolean + value keys; server-side service boundary |
| P09-M25-01-08 | Plan comparison metadata | Public-safe catalog fields |
| P09-M25-01-09 | Out of scope | §5 below |

**25.01 explicitly does not:** migrations, NestJS modules, frontend pages, Stripe, checkout, metering, production changes.

### Out of scope (entire M25 module must not pull forward)

| Item | Owner module |
| --- | --- |
| Stripe checkout, cards, invoices, webhooks, charges, refunds, tax | **M27** |
| Usage records, aggregates, reconciliation, sidebar “used” minutes | **M26** |
| Dashboard analytics data & charts | **M24** |
| Platform admin plan CRUD UI | **M28** (seed/migration MVP first) |
| Marketing website build | Post-M25; contract only here |
| Coupons, enterprise invoicing, outbound-call commercialization | Later / **DECISION REQUIRED** |
| Twilio/ElevenLabs cost reconciliation | **M26** / ops |
| Changing M12 call path | **Forbidden** in M25 |

## 4. Product questions (DECISION REQUIRED)

These must be confirmed by product/commercial before **25.02** seeds real catalog values:

1. **Plan ladder** — count, names, positioning (Starter / Growth / Scale or other).
2. **Numeric limits** — max businesses, agents, phone numbers, included monthly minutes per tier.
3. **Trial** — default length (e.g. 14 days), eligible plans, **one trial per organization ever** vs per plan.
4. **Minutes over included** — hard block vs allow with overage (M27); M25 only stores included allowance.
5. **Admin role** — read-only subscription vs co-manage with owner (see RBAC in [architecture-and-domain-model.md](./architecture-and-domain-model.md)).
6. **Voice cloning / premium voices** — which tiers include `voice_cloning.enabled`.
7. **Grandfathering policy** — when enforcement turns on for existing production orgs (technical default proposed in architecture doc).

**NON-CANONICAL EXAMPLE (do not ship):** three tiers with illustrative limits for engineering discussion only—see entitlement-model registry examples marked as non-canonical.

## 5. Checklist mapping (25.01)

| Checklist | Status in 25.01 |
| --- | --- |
| P09-M25-01-01 | ✓ |
| P09-M25-01-02 | ✓ (structure; prices/limits flagged PRODUCT DECISION) |
| P09-M25-01-03 | ✓ |
| P09-M25-01-04 | ✓ |
| P09-M25-01-05 | ✓ |
| P09-M25-01-06 | ✓ (design; minutes = policy interface to M26) |
| P09-M25-01-07 | ✓ |
| P09-M25-01-08 | ✓ |
| P09-M25-01-09 | ✓ |

## 6. Related documents

| Document | Purpose |
| --- | --- |
| [architecture-and-domain-model.md](./architecture-and-domain-model.md) | Ownership, services, states, RBAC, legacy strategy |
| [data-model.md](./data-model.md) | Tables, constraints, ERD |
| [entitlement-model.md](./entitlement-model.md) | Keys, types, resolution |
| [api-contracts.md](./api-contracts.md) | Future REST contracts |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal UX (no M27 payment UI) |
| [integration-boundaries.md](./integration-boundaries.md) | M26, M27, M24, marketing |
