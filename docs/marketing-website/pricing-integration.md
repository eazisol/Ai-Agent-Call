# Marketing Website — Pricing Integration (P1.01)

| Field | Value |
| --- | --- |
| Status | **Runtime wired in P1.03** — 15 September 2026 |
| Canonical API | `GET /api/v1/public/plans` (M25) |

## 1. Contract

| Rule | Detail |
| --- | --- |
| Source | M25 `PublicPlansController` → sanitized `PublicPlanView[]` |
| Never | Hardcoded Starter/Pro/Business; invent prices; query DB from frontend; show `legacy_production`; expose entitlements table; use admin APIs |
| Zero plans | Valid MVP state — professional empty copy, CTA to `/contact` |
| PRODUCT DECISION REQUIRED | Commercial plan names, prices, limits, enterprise CTA (do not invent) |

## 2. Intended data flow (implemented helper in P1.02)

```text
Server Component (P1.03)
  → fetchPublicPlans() in src/lib/public-plans.ts
  → INTERNAL_API_BASE_URL + '/public/plans'
  → Nest GET /api/v1/public/plans
  → PublicPlansResult: success | empty | error
```

- Revalidate: **300** seconds (`PUBLIC_PLANS_REVALIDATE_SECONDS`)
- Empty `[]` → `status: "empty"` (not an error)
- Upstream failure → `status: "error"`, message safe, **no fake plans**
- Sanitizer drops `legacy_production` if ever present

## 3. UI states (P1.03)

| State | Behavior |
| --- | --- |
| Success | `PricingPlansBlock` cards from public DTO |
| Empty (`plans.length === 0`) | “Plans are being finalized” + Get Started / Contact |
| Error | “Pricing is temporarily unavailable” + Get Started / Contact; **no fake catalog** |
| Null prices | “Contact for pricing” / plan `ctaLabel` |

Live verify 15 Sep 2026: public API returned `{"plans":[]}` → empty state on `/pricing` and homepage teaser.

## 4. Homepage teaser

Same data source; smaller surface; link “See pricing” → `/pricing`. If empty, teaser becomes contact CTA.

## 5. Security

Public endpoint only. No org IDs, subscription rows, enforcement mode, provider IDs, Stripe placeholders, or secrets in marketing responses (already enforced by M25).
