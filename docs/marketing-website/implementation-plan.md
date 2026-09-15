# Marketing Website — Implementation Plan (P1.01)

| Field | Value |
| --- | --- |
| Status | **Design locked** — 15 September 2026 |
| Execution order | P1.01 → P1.02 → P1.03 → **P1.04 + P1.05 combined** |

## P1.01 — Scope & Technical Design (this slice)

Docs + checklist only. **No runtime.**

## P1.02 — Public Data / Content / SEO Foundation

**Status:** complete 15 September 2026. See [p1-02-foundation.md](./p1-02-foundation.md).

- Launch content: `src/content/marketing.ts`
- SEO helpers: `src/content/marketing-seo.ts`
- Pricing helper: `src/lib/public-plans.ts` → `GET {INTERNAL_API_BASE_URL}/public/plans`, revalidate 300s
- `robots.ts` / `sitemap.ts` foundations (sitemap empty until pages ready)
- Contact: page + Get Started; **PUBLIC CONTACT EMAIL = DECISION REQUIRED**
- Legal: **LEGAL COPY REQUIRED**
- Structured data: deferred
- Tracking: none added

## P1.03 — Frontend & Integrations

**Status:** complete 15 September 2026. See [p1-03-implementation.md](./p1-03-implementation.md).

- `(marketing)` owns `/`; portal/admin/auth coexistence preserved
- `PublicShell` + `MarketingShellHost` use live launch + auth routes (dead CTAs blocked)
- Launch pages shipped: home, features, how-it-works, solutions, pricing, about, contact, faq, privacy, terms
- Homepage 12-section architecture with canonical copy + workflow visual
- Pricing via server `fetchPublicPlans()` — empty/error/success; no fake tiers
- Contact: page + Get Started/Login; email still DECISION REQUIRED
- Legal: non-final availability pages; LEGAL COPY REQUIRED
- Sitemap activated (10 marketing URLs); robots unchanged intent
- `/marketing-shell` redirects to `/`
- Typecheck / tests / production build / live local routes verified

## P1.04 + P1.05 — Security, QA, Documentation & Acceptance (combined)

**Status:** complete 15 September 2026.

- Public boundary / pricing security / auth separation verified
- Manual QA handoff: [Marketing_Website_manual-qa-guide.md](./Marketing_Website_manual-qa-guide.md)
- Acceptance: [Marketing_Website_acceptance.md](./Marketing_Website_acceptance.md)
- Env notes: [environment-and-config.md](./environment-and-config.md)
- `COMMERCIAL-GATE-P1` closed for Marketing Website launch scope
- Full Commercial Launch Gate and M12 remain open

## Open decisions (do not invent)

1. Contact/demo transport (mailto vs lightweight mail endpoint) — email still DECISION REQUIRED
2. Final legal Privacy/Terms copy — LEGAL COPY REQUIRED (non-final pages approved for P1)
3. M25 commercial plan names/prices/limits/enterprise CTA
4. Whether authenticated users on `/` should later auto-redirect to `/dashboard` (currently: no)
5. Any “Coming soon” feature callouts

## Explicit non-work in P1.01

No pages, components, homepage, pricing UI, auth, contact endpoint, analytics, deploy, production, backend, or DB changes.
