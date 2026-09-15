# Marketing Website — Manual QA Handoff Guide

| Field | Value |
| --- | --- |
| Product | EaziAICall Marketing Website |
| Gate | `COMMERCIAL-GATE-P1` |
| Audience | Independent tester / reviewer |
| Companion | [Marketing_Website_acceptance.md](./Marketing_Website_acceptance.md) |
| App | `ai-call-agent-frontend` |
| Verified baseline | 15 September 2026 (local production build) |

## 1. Objective

Confirm the public Marketing Website is production-ready for launch scope:

- truthful commercial messaging
- real navigation
- M25 public pricing only (no fake plans)
- public/private route separation preserved
- SEO foundations correct
- no secret/tenant leakage from marketing surfaces

## 2. Launch scope (in)

| Area | Routes / behavior |
| --- | --- |
| Public site | `/`, `/features`, `/how-it-works`, `/solutions`, `/pricing`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms` |
| Auth CTAs | `/login`, `/register` |
| Legacy | `/marketing-shell` → `/` |
| SEO | `/robots.txt`, `/sitemap.xml` |
| Pricing | Server `fetchPublicPlans()` → `GET {INTERNAL_API_BASE_URL}/public/plans` |

## 3. Out of scope

- Stripe checkout / billing UI invent
- Contact backend / CRM
- Counsel-approved Privacy/Terms prose
- Publishing commercial plan catalog values (product decision)
- Marketing trackers / cookie banners
- Portal redesign, M12 gate closure, other commercial modules
- Production deploy

## 4. Architecture (brief)

```text
(marketing)/layout.tsx → MarketingShellHost → PublicShell
(marketing)/*/page.tsx → RSC pages + buildMarketingPageMetadata
lib/public-plans.ts    → server-only public plans helper
content/marketing.ts   → canonical copy / nav / truth registry
```

Portal (`(portal)`) keeps `RequireAuth`. Marketing does not auto-redirect authenticated users away from `/`.

## 5. Environment (no secrets)

| Variable | Where | Purpose |
| --- | --- | --- |
| `INTERNAL_API_BASE_URL` | **Server only** | Base for `…/public/plans` fetch |
| `NEXT_PUBLIC_SITE_URL` or `AUTH_PUBLIC_APP_URL` | Optional | Absolute sitemap/robots/canonical base |
| `NEXT_PUBLIC_API_BASE_URL` | Existing portal client | Not used by marketing pricing helper |

Do not put secrets in `NEXT_PUBLIC_*`. Do not expose ALB/internal hosts in browser marketing HTML.

## 6. Preconditions for local QA

1. Backend reachable so `GET /api/v1/public/plans` responds (often `{"plans":[]}`).
2. Frontend `.env.local` has `INTERNAL_API_BASE_URL` (example: `http://localhost:3000/api/v1`).
3. Run:

```bash
cd ai-call-agent-frontend
npm run typecheck
npm test
npm run build
npx next start -p 3010
```

If port 3000 is occupied by the API, use **3010** (or another free port) for Next.

## 7. Pricing states

| State | How to observe | Expected |
| --- | --- | --- |
| Success | When API returns ≥1 public plan | Cards from public DTO only; no Stripe IDs |
| Empty | Current typical: `{"plans":[]}` | “Plans are being finalized” + Get Started / Contact |
| Error | Stop API or unset `INTERNAL_API_BASE_URL` and rebuild/restart | “Pricing is temporarily unavailable”; site usable; no fake tiers |

## 8. Known product decisions (not defects)

| Decision | Status |
| --- | --- |
| PUBLIC CONTACT EMAIL | **DECISION REQUIRED** (`null` — pending notice OK) |
| LEGAL COPY | **REQUIRED** — non-final availability pages approved for P1 |
| COMMERCIAL PLAN VALUES | **PRODUCT DECISION REQUIRED** |

## 9. Responsive matrix

Test at ~375 / ~768 / ~1024 / ~1440:

| Check | Pass criteria |
| --- | --- |
| Header / mobile menu | Opens, closes, real links, usable tap targets |
| Hero / CTAs | No clip, stack cleanly |
| Feature / solution / pricing cards | Stack; no overflow |
| Workflow visual | Readable |
| FAQ / footer / legal | Usable; no horizontal scroll |

## 10. Accessibility checks

- Landmarks: `header`, `main#main-content`, `footer`, labeled `nav`
- One logical `h1` per page
- Keyboard: tab to nav, CTAs, FAQ `<details>`/`<summary>`, mobile menu trigger
- Visible focus rings
- Decorative icons `aria-hidden`
- Mobile menu has accessible title/description

## 11. SEO / sitemap / robots

| Check | Expected |
| --- | --- |
| Titles | Unique per launch route |
| Descriptions | Present via metadata builder |
| Sitemap | Indexable marketing URLs only (baseline: **10**). No `/dashboard`, `/login`, `/register`, `/admin`, `/api`, `/marketing-shell` |
| Robots | Allow `/`; disallow portal/admin/api prefixes |

## 12. Security / public boundary

Marketing HTML/JS must not show:

- tenant/org/subscription data
- Twilio / ElevenLabs / JWT / DB secrets
- `INTERNAL_API_BASE_URL`
- `legacy_production`
- Stripe/provider IDs
- stack traces

Portal integrations copy that names env vars is **not** marketing scope.

## 13. Content truth

Fail if fake prices, testimonials, ratings, logos, uptime %, compliance badges, invented contact details, or unsupported features marketed as available (outbound, booking, CRM, analytics dashboards, Stripe checkout, etc.).

## 14. Manual test cases (QA-P1-01 … QA-P1-20)

Each case: Preconditions · Steps · Expected · Pass/Fail · Evidence.

### QA-P1-01 — Open `/`

- **Preconditions:** Production server running.
- **Steps:** Open `/`.
- **Expected:** Marketing homepage; H1 about answering business calls; **not** dashboard redirect.
- **Pass/Fail:** ___
- **Evidence:** screenshot / title / URL

### QA-P1-02 — Desktop header

- **Steps:** Click Features, How It Works, Solutions, Pricing, FAQ.
- **Expected:** Each navigates to correct route; Log in → `/login`; Get Started → `/register`.
- **Pass/Fail:** ___

### QA-P1-03 — Mobile menu (~375px)

- **Steps:** Open menu; navigate; close via control/overlay/Escape if available.
- **Expected:** Real links; focus usable; no toast-only nav.
- **Pass/Fail:** ___

### QA-P1-04 — Hero Get Started

- **Expected:** → `/register`
- **Pass/Fail:** ___

### QA-P1-05 — Login CTA

- **Expected:** → `/login`
- **Pass/Fail:** ___

### QA-P1-06 — Features

- **Expected:** Canonical features only; no outbound/CRM/booking-as-available claims.
- **Pass/Fail:** ___

### QA-P1-07 — How It Works

- **Expected:** Six steps; end CTA → `/register`
- **Pass/Fail:** ___

### QA-P1-08 — Solutions

- **Expected:** Use cases; no appointment booking / payments / CRM sync claims.
- **Pass/Fail:** ___

### QA-P1-09 — Pricing zero plans

- **Preconditions:** API returns `{"plans":[]}`.
- **Expected:** Empty state; no Starter/Pro fake tiers.
- **Pass/Fail:** ___

### QA-P1-10 — Pricing API failure

- **Preconditions:** Force helper error (API down / missing `INTERNAL_API_BASE_URL` + restart).
- **Expected:** Safe error copy; site usable; no fake plans; no stack trace.
- **Pass/Fail:** ___

### QA-P1-11 — FAQ

- **Expected:** Canonical Q&A; expand/collapse keyboard-accessible.
- **Pass/Fail:** ___

### QA-P1-12 — Contact no-email

- **Expected:** Pending notice; no guessed email; Get Started `/register`; Login `/login`.
- **Pass/Fail:** ___

### QA-P1-13 — Privacy non-final

- **Expected:** Explicit non-final / counsel-required wording; not a fake policy.
- **Pass/Fail:** ___

### QA-P1-14 — Terms non-final

- **Expected:** Same as privacy for terms.
- **Pass/Fail:** ___

### QA-P1-15 — Sitemap

- **Steps:** Open `/sitemap.xml`.
- **Expected:** Only valid marketing URLs; count matches policy (10 launch paths).
- **Pass/Fail:** ___

### QA-P1-16 — Robots

- **Expected:** Marketing allowed; `/dashboard`, `/calls`, `/settings`, `/admin`, `/api` disallowed for indexing guidance.
- **Pass/Fail:** ___

### QA-P1-17 — 404

- **Steps:** Open `/this-route-must-not-exist`.
- **Expected:** Next.js 404; marketing does not swallow private routes.
- **Pass/Fail:** ___

### QA-P1-18 — marketing-shell redirect

- **Expected:** `/marketing-shell` → `/` (307/308); no loop.
- **Pass/Fail:** ___

### QA-P1-19 — Private portal separation

- **Steps:** Unauthenticated visit `/dashboard` (and note `/admin` existing behavior).
- **Expected:** Portal still wrapped in `RequireAuth` (login/session gate). Marketing did not remove auth.
- **Pass/Fail:** ___

### QA-P1-20 — Responsive sweep

- **Steps:** 375 / 768 / 1024 / 1440 across home, pricing, solutions, legal.
- **Expected:** No horizontal overflow; usable nav/CTAs/cards/footer.
- **Pass/Fail:** ___

## 15. Automated checks (supporting evidence)

```bash
npm run typecheck
npm test
npm run build
```

Targeted: `test/marketing-foundation.test.mjs`, `test/marketing-pages.test.mjs`, `test/marketing-final-qa.test.mjs`.

## 16. Negative tests

- Dead CTAs `/book-demo`, `/start-free-trial` absent from live hrefs
- No `href="#"`, `javascript:void(0)` for primary nav
- No trackers (GA/GTM/Meta/TikTok/Hotjar/Clarity)
- Malformed pricing payload sanitized; `legacy_production` dropped

## 17. Regression

Confirm build still emits portal/auth/admin routes (`/dashboard`, `/login`, `/register`, `/calls`, `/settings`, `/settings/plan`, `/admin`). Marketing must not break app routing.

## 18. Evidence expectations

- Status codes / redirect headers
- Screenshots at key breakpoints
- Sitemap/robots excerpts
- Pricing empty/error screenshots
- Test/build command output

## 19. Bug report template

```text
Title:
Severity: blocker | major | minor
Route:
Viewport:
Steps:
Expected:
Actual:
Evidence:
Suspected area: security | content | pricing | a11y | seo | responsive | auth
```

## 20. Sign-off checklist

- [ ] QA-P1-01 … QA-P1-20 executed
- [ ] Security/public boundary acceptable
- [ ] Content truth acceptable
- [ ] Pricing empty/error acceptable; no fake plans
- [ ] Sitemap/robots acceptable
- [ ] Responsive + a11y baseline acceptable
- [ ] Automated typecheck/tests/build PASS
- [ ] Independent human tester: _________________ Date: _______

**Note:** Independent human sign-off may remain pending after engineering acceptance. Do not invent signatures.
