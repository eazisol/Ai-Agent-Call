# Marketing Website — P1.03 Frontend & Integrations (implemented)

| Field | Value |
| --- | --- |
| Status | **Implemented + verified** — 15 September 2026 |
| Gate | `COMMERCIAL-GATE-P1` remains **OPEN** (P1.04 / P1.05 not started) |
| App | `ai-call-agent-frontend` |

## Actual routes

| Path | Behavior |
| --- | --- |
| `/` | Marketing homepage (owns root; no dashboard redirect) |
| `/features` | Canonical feature registry |
| `/how-it-works` | Six-step product flow |
| `/solutions` | General use cases (not deep industry integrations) |
| `/pricing` | Server-side `fetchPublicPlans()` → M25 public plans |
| `/about` | Factual product/company copy |
| `/contact` | Launch-safe contact (no form, no invented email) |
| `/faq` | Canonical FAQ |
| `/privacy` | Non-final legal availability page (`LEGAL_COPY_REQUIRED`) |
| `/terms` | Non-final legal availability page (`LEGAL_COPY_REQUIRED`) |
| `/marketing-shell` | Redirects to `/` (legacy preview retired from canonical nav) |

Portal remains at `/dashboard`. Auth remains `/login`, `/register`. `(portal)` / `(admin)` / `(auth)` undisturbed.

## Component architecture

```text
(marketing)/layout.tsx          → MarketingShellHost → PublicShell
(marketing)/page.tsx            → MarketingHomePage + fetchPublicPlans
(marketing)/*/page.tsx          → route pages + buildMarketingPageMetadata
components/public/public-shell.tsx
components/public/marketing-shell-host.tsx
components/marketing/home-page.tsx
components/marketing/marketing-ui.tsx
components/marketing/pricing-plans-block.tsx
lib/marketing-routes.ts         → isEnabledMarketingRoute
lib/public-plans.ts             → server fetch helper (revalidate 300s)
content/marketing.ts            → copy / nav / FAQ / truth registry
content/marketing-seo.ts        → metadata builders
```

RSC-first. Client only for shell (mobile Sheet nav) and any interactive FAQ control.

## Pricing runtime

- Helper: `src/lib/public-plans.ts`
- Upstream: `GET {INTERNAL_API_BASE_URL}/public/plans` (server-side only)
- Live verify (15 Sep 2026): API returned `{"plans":[]}` → `/pricing` showed **Plans are being finalized**
- Error path: page-level “Pricing is temporarily unavailable” + Get Started / Contact
- Success path: cards from public DTO only (no Stripe IDs, no fake Starter/Pro tiers)
- Homepage pricing teaser reuses the same `fetchPublicPlans` result shape via `PricingPlansBlock`

## Contact limitation

- `marketingPublicContactEmail = null`
- **PUBLIC CONTACT EMAIL = DECISION REQUIRED**
- Page offers Get Started → `/register`, Login → `/login`, pending notice copy
- No backend contact form / endpoint added

## Legal limitation

- **LEGAL COPY = DECISION REQUIRED**
- `/privacy` and `/terms` are explicit non-final availability pages (dashed card + status label)
- Do not treat as counsel-approved policies

## SEO / sitemap / robots

- Per-route metadata via `buildMarketingPageMetadata(path)`
- `robots.ts`: allow `/`, disallow portal/admin-style prefixes from `MARKETING_ROBOTS_DISALLOW`
- `sitemap.ts`: **10** indexable marketing URLs (all launch paths); excludes `/dashboard`, `/login`, `/register`, `/api`, admin
- `MARKETING_SITEMAP_READY` all `true` for launch paths

## Responsive / a11y (P1.03 baseline)

- Sticky header + Sheet mobile menu (`lg` breakpoint)
- Footer multi-column grid collapses on small screens
- Semantic `header` / `main#main-content` / `footer` / labeled `nav`
- Single H1 per page pattern
- Visible focus rings on nav links
- Live local route check on production build (`next start -p 3010`)

## Known limitations

1. Contact email still undecided
2. Legal copy still undecided (placeholder availability pages only)
3. Public commercial plan catalog may be empty until M25 plans are published
4. No marketing trackers (intentional)
5. Authenticated users are **not** auto-redirected away from `/`
6. OG custom image still deferred if not present (P1.02 status)
7. Full Manual QA handoff deferred to **P1.04 + P1.05 combined**

## Verification evidence (15 September 2026)

- `npm run typecheck` PASS
- `npm test` PASS (86)
- `npm run build` PASS — route manifest includes all marketing paths
- Live: `/` 200 with H1 “Answer every business call…”; `/pricing` empty state; sitemap 10 URLs; `/marketing-shell` → `/`
- Backend/DB/production/tracking: unchanged for this slice
