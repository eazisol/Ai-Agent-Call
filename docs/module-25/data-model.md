# Module 25 — Data Model (implemented)

| Field | Value |
| --- | --- |
| Submodule | 25.02 — Backend, Persistence & API |
| Status | **Implemented** — 15 September 2026 |
| Migration | `1756150000000-SubscriptionPlans.ts` (`SubscriptionPlans1756150000000`) |
| Local verification | **PASS** — 15 September 2026 against `localhost:5434/ai_call_agent` (Docker Compose postgres). UP → constraint/idempotency checks → DOWN (orgs/businesses preserved) → UP again. **Not production.** |

## Tables

### `plans` (platform-owned)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `code` | varchar(64) UNIQUE | e.g. `legacy_production` |
| `name` | varchar(120) | |
| `description` | text nullable | |
| `status` | varchar(20) | `draft` \| `active` \| `archived` |
| `sort_order` | int | |
| `billing_visibility` | varchar(20) | `public` \| `authenticated` \| `internal` |
| `is_recommended` | boolean | |
| `trial_eligible` | boolean | |
| `trial_days` | int nullable | |
| `price_monthly_cents` | int nullable | **Display metadata only** |
| `price_annual_cents` | int nullable | **Display metadata only** |
| `currency` | char(3) | default `USD` |
| `comparison_metadata` | jsonb nullable | |
| `created_at` / `updated_at` | timestamptz | |

Indexes: `uq_plans_code`, `idx_plans_status_sort`.

**No Stripe / provider IDs.**

### `plan_entitlements`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `plan_id` | uuid FK → plans ON DELETE CASCADE | |
| `entitlement_key` | varchar(80) | Registry key |
| `value_type` | varchar(16) | `boolean` \| `integer` |
| `value_boolean` | boolean nullable | Required iff boolean |
| `value_integer` | int nullable | Required iff integer; `>= 0` |
| `created_at` / `updated_at` | timestamptz | |

Unique: `uq_plan_entitlements_plan_key` (`plan_id`, `entitlement_key`).

Typed CHECK ensures exactly one value column matches `value_type`.

**Unlimited integer limits:** omit the entitlement row (resolver returns `null`).

### `subscriptions` (tenant-owned via Organization)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid UNIQUE FK → organizations ON DELETE CASCADE | |
| `plan_id` | uuid FK → plans ON DELETE RESTRICT | |
| `status` | varchar(24) | `trialing` \| `active` \| `past_due` \| `grace_period` \| `canceled` \| `expired` \| `suspended` |
| `started_at` | timestamptz | |
| `trial_start` / `trial_end` | timestamptz nullable | |
| `current_period_start` / `current_period_end` | timestamptz nullable | |
| `cancel_at_period_end` | boolean | |
| `canceled_at` | timestamptz nullable | |
| `grace_period_end` | timestamptz nullable | |
| `created_at` / `updated_at` | timestamptz | |

**No `business_id`.** One subscription per organization.

## Seed / backfill (idempotent)

1. Insert plan `legacy_production` (`billing_visibility=internal`, not recommended, not public).
2. Seed boolean entitlements: `voice_cloning.enabled=true`, `analytics.enabled=false`, `automations.enabled=false`. No invented numeric caps.
3. Insert `subscriptions` for every `organizations` row missing a subscription.

Commercial catalog values: **PRODUCT DECISION REQUIRED** (not seeded).

## Not created (deferred)

- `subscription_entitlement_overrides` → M28
- `billing_provider_mappings` → M27
- `usage_*` → M26
