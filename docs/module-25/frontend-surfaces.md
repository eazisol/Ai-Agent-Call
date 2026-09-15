# Module 25 — Frontend Surfaces (implemented)

| Field | Value |
| --- | --- |
| Submodule | **25.03 — Frontend & Integrations** |
| Status | **Implemented** (25.03) — verified in 25.04/25.05 — 15 September 2026 |

## Routes

| Route | Purpose |
| --- | --- |
| `/settings/plan` | Current subscription + entitlements |
| `/settings/plan/compare` | Authenticated commercial catalog (empty-state safe) |
| `/billing` | Redirect → `/settings/plan` (no M27 UI) |

## API client

`src/lib/subscriptions-api.ts` → same-origin `/api/backend/*` via shared `apiRequest`.

## Shell changes

- Bottom nav **Plan** → `/settings/plan` (not Billing)
- Fake `1820/2500` usage removed; sidebar shows included minutes entitlement or metering placeholder
- Org switcher shows live plan name (or “Plan unavailable”)
- Mock org `plan: Growth|Scale|Starter` removed

## Upgrade CTA

Compare / non-current plans: disabled **“Upgrade — billing setup coming soon”** (no Stripe/checkout).

## Out of scope (confirmed)

No marketing site, M26 usage, M27 billing, no schema changes.
