# Module 25 — Entitlement Model (implemented)

| Field | Value |
| --- | --- |
| Submodule | 25.02 |
| Status | **Implemented** — 15 September 2026 |
| Registry | `ai-call-agent-backend/src/modules/subscriptions/entitlement-keys.ts` |

## Keys

| Key | Type | Notes |
| --- | --- | --- |
| `businesses.max` | integer | Org-wide active businesses |
| `agents.max` | integer | Org-wide non-archived agents |
| `phone_numbers.max` | integer | Org-wide active+provisioning numbers |
| `minutes.monthly_included` | integer | Allowance only; usage = M26 |
| `voice_cloning.enabled` | boolean | Gate on voice clone create |
| `analytics.enabled` | boolean | Future M24 |
| `automations.enabled` | boolean | Future M22 |

## Resolution

1. Load/ensure subscription for organization.
2. Load `plan_entitlements` for `plan_id`.
3. Missing boolean → `false`; missing integer → `null` (unlimited).
4. If status does not grant access → booleans false, integers `0`.

## Enforcement

`SUBSCRIPTION_ENFORCEMENT_MODE=off|enforce` (default **`off`**).

When `off`, `assertFeature` / `assertWithinLimit` / `assertSubscriptionActive` are no-ops.

## Legacy plan entitlements

`legacy_production` seeds:

- `voice_cloning.enabled` = true
- `analytics.enabled` = false
- `automations.enabled` = false
- **no** integer limit rows (unlimited while enforcement eventually on, without inventing commercial caps)

## Subscription status entitlement (runtime)

| Status | Grants access? |
| --- | --- |
| `trialing` | Yes if `trial_end` is null/future; else treated inactive (`TRIAL_EXPIRED` under `enforce`) |
| `active` | Yes |
| `past_due` | Yes currently |
| `grace_period` | Yes currently (`grace_period_end` not strictly enforced) |
| `canceled` | Yes until `current_period_end`; then no |
| `expired` / `suspended` | No |

Voice cloning is gated on **draft create and submit** (provider `createClone` never runs when feature blocked).

## PRODUCT DECISION REQUIRED

Commercial plan names, prices, numeric limits, trial repeat policy, minutes overage vs hard block, `past_due`/`grace_period` strictness, admin billing access, knowledge limits, enterprise CTA.
