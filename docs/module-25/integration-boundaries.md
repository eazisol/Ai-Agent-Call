# Module 25 — Integration Boundaries

| Field | Value |
| --- | --- |
| Submodule | 25.01–25.05 |
| Status | **COMPLETE** — boundaries enforced — 15 September 2026 |

## Confirmation

| Boundary | Status |
| --- | --- |
| No Stripe / checkout / invoices | Confirmed — not implemented |
| No `usage_*` tables | Confirmed |
| No marketing website changes | Confirmed |
| Customer portal Plan UI | Delivered in 25.03 (`/settings/plan`, compare, `/billing` redirect) |
| Public plans API ready for marketing | `GET /api/v1/public/plans` |
| Minutes usage | Entitlement key only; metering = M26 |

## 1. Module map

```text
Marketing Website ──GET /public/plans──► M25 catalog (DB)
Customer Portal ──GET /plans, /subscription──► M25
Domain services ──EntitlementsService──► M25
M26 Usage ──consumption metrics──► compares to M25 limits
M27 Billing ──Stripe/webhooks──► updates M25 subscription state
M28 Admin ──plan CRUD──► M25 tables
M24 Analytics ──data──► gated by M25 analytics.enabled
```

## 2. M25 → M26 (Usage Metering)

| M25 owns | M26 owns |
| --- | --- |
| `minutes.monthly_included` (and other limit keys) | `used_minutes` per org + billing period |
| Subscription period boundaries (synced from M27 later) | `usage_records`, `usage_aggregates` |
| `EntitlementsService.getLimit(org, 'minutes.monthly_included')` | `UsageService.getCurrentPeriodUsage(org, 'minutes')` |
| Policy interface `MinutesPolicyPort.assert…` | Implementation reading aggregates from calls |

**Portal display:** `used / included` (e.g. 237 / 500).

**Enforcement:** M26 calls M25 limit; on exceed → **DECISION REQUIRED** (hard stop vs allow + M27 overage). M25 documents both codes; default hook returns `PLAN_LIMIT_REACHED` when hard block selected.

**No usage tables in M25 migrations.**

### Future interface (sketch)

```typescript
// M25 defines
interface UsageEntitlementPolicyPort {
  getIncludedMinutes(organizationId: string): Promise<number | null>;
}

// M26 implements consumption side
interface OrganizationUsageReader {
  getBillableMinutesInCurrentPeriod(organizationId: string): Promise<number>;
}
```

Compose in M26 `UsageEntitlementGuard` or call orchestrator pre-call (with M12).

## 3. M25 → M27 (Billing)

| M25 owns | M27 owns |
| --- | --- |
| Plan catalog & entitlements | `BillingProvider` port (Stripe) |
| Subscription row & internal status | Customer, payment method, checkout |
| Trial timestamps & eligibility flags | Trial conversion charging |
| `billing_provider_mappings` table | Webhook `/api/v1/webhooks/stripe` |
| Provider-neutral plan `code` | Stripe Product/Price IDs in mapping table |
| Cancel-at-period-end flag | Provider subscription cancel/sync |
| Grace / past_due **fields** | Transitions driven by invoice events |
| Overage rules reference entitlements | Overage charges |

**Rule:** Stripe metadata may **mirror** `plan.code` for debugging but **must not** be authoritative for entitlements — PostgreSQL subscription → plan → entitlements wins.

M27 checkout flow (future):

```text
User selects plan.code → M27 creates Stripe Checkout → webhook → M27 updates subscriptions.plan_id + status + periods
```

M25 does not import Stripe SDK.

## 4. M25 → M28 (Admin Portal)

| M28 capability | Touches M25 |
| --- | --- |
| Edit plan marketing copy | `plans` rows |
| Edit entitlements | `plan_entitlements` |
| Comp subscription / override | optional overrides table |
| View tenant subscription | read `subscriptions` |

Until M28: **migration seeds** + runbook for plan changes.

## 5. M25 → M24 (Analytics)

M24 implements dashboards and metrics APIs.

M25 exposes only `analytics.enabled` (and future tier keys). If false → 403 on analytics routes with `FEATURE_NOT_INCLUDED`.

No analytics storage in M25.

## 6. Marketing Website contract

**Goal:** Single canonical catalog — no drift between marketing, portal, checkout.

| Approach | Verdict |
| --- | --- |
| Build-time markdown only | Rejected — drift vs portal |
| DB-driven via `GET /api/v1/public/plans` | **Recommended** |
| Hybrid: DB + CMS copy | Optional later for blog content; prices/limits from DB |

Marketing site **must not** query `plan_entitlements` directly or use internal admin APIs.

**Implementation timing:** After M25.02 public endpoint exists; marketing build not in 25.01.

## 7. Provider systems (Twilio / ElevenLabs)

| System | Relation to M25 |
| --- | --- |
| Twilio number rental cost | M26 provider usage; not plan table |
| ElevenLabs quota errors | Provider account; separate from SaaS plan |
| Telephony purchase | M11 + M25 `phone_numbers.max` before purchase |

## 8. Existing code — integration touch list (25.02+)

| File / area | Change type |
| --- | --- |
| `businesses.service.ts` | EXTEND — limit assert |
| `agents.service.ts` | EXTEND |
| `phone-numbers.service.ts` | EXTEND — before provider |
| `voice-clones.service.ts` | EXTEND — feature + limit |
| `portal-shell.ts` | EXTEND — remove mocks (25.03) |
| `EaziAiCall_Architecture…` BillingProvider | PARK until M27 |

## 9. Environment configuration (future)

| Variable | Purpose |
| --- | --- |
| `SUBSCRIPTION_ENFORCEMENT_MODE` | `off` \| `soft` \| `hard` |
| `SUBSCRIPTION_DEFAULT_TRIAL_DAYS` | Fallback if plan null |

Document in M25.05 / env strategy — not added in 25.01.

## 10. Out of scope recap

Stripe, checkout, invoices, webhooks, metering tables, marketing site, M12 changes, production infra — see [scope-and-requirements.md](./scope-and-requirements.md).
