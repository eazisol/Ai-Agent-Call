# Marketing Website — Final Acceptance (COMMERCIAL-GATE-P1)

| Field | Value |
| --- | --- |
| Date | 15 September 2026 |
| Gate | `COMMERCIAL-GATE-P1` |
| Result | **PASS** (engineering acceptance) |
| Independent human QA sign-off | **Pending** (handoff guide provided) |

## Slice results

| Slice | Result |
| --- | --- |
| P1.01 Scope & Technical Design | **PASS** |
| P1.02 Public Data / Content / SEO Foundation | **PASS** |
| P1.03 Frontend & Integrations | **PASS** |
| P1.04 Security & QA | **PASS** |
| P1.05 Documentation & Acceptance | **PASS** |

## Routes delivered

`/` · `/features` · `/how-it-works` · `/solutions` · `/pricing` · `/about` · `/contact` · `/faq` · `/privacy` · `/terms`  
Legacy: `/marketing-shell` → `/`  
Auth CTAs: `/login`, `/register` · Portal: `/dashboard`

## Pricing integration

- Endpoint: `GET /api/v1/public/plans` via server `fetchPublicPlans()`
- Live baseline: `{"plans":[]}` → empty state
- Error: safe copy; no fake catalog; no stack leak
- Fake plans: **NO**
- **Regression fix (15 Sep 2026):** local `INTERNAL_API_BASE_URL=http://localhost:3000/api/v1` resolved to IPv6 `::1` and hit a non-M25 listener → false ERROR UI. Fixed by preferring `127.0.0.1`, normalizing origin→`/api/v1`, and falling back to `INTERNAL_BACKEND_ORIGIN`.

## Security summary

- Marketing rendered HTML: no tenant/org/subscription/provider secrets; no `INTERNAL_API_BASE_URL`
- Marketing-specific client chunks: no secret assignments / no `INTERNAL_API` leak
- Portal continues to use `RequireAuth` / organization gates
- Admin shell unchanged by marketing work (pre-existing architecture)

## QA summary

- Typecheck / 93 frontend tests / production build: **PASS**
- Local `next start` route matrix: marketing 200; shell 307→`/`; unknown 404; sitemap 10 URLs
- Dead-link audit on homepage: **PASS**
- Content truth / tracker audits: **PASS**
- Responsive: structural + CSS breakpoint matrix verified; browser viewport matrix in Manual QA handoff for independent tester

## Documentation

| Doc | Role |
| --- | --- |
| [README.md](./README.md) | Index / status |
| [Marketing_Website_manual-qa-guide.md](./Marketing_Website_manual-qa-guide.md) | Independent tester handoff |
| [p1-03-implementation.md](./p1-03-implementation.md) | Runtime architecture |
| [pricing-integration.md](./pricing-integration.md) | Public plans contract |
| [seo-performance-accessibility.md](./seo-performance-accessibility.md) | SEO/a11y |
| This file | Gate acceptance |

## Known limitations

1. Public commercial plan catalog may be empty until product publishes plans
2. No approved public contact email
3. Privacy/Terms are non-final availability pages until counsel copy
4. No marketing trackers (intentional)
5. Authenticated users are not forced off `/`
6. Full visual breakpoint sign-off ideally confirmed by independent tester

## External / product decisions (unsolved)

- **PUBLIC CONTACT EMAIL = DECISION REQUIRED**
- **LEGAL COPY = REQUIRED** (external launch / legal sign-off dependency — **not** a P1 technical blocker given approved non-final pages)
- **COMMERCIAL PLAN NAMES/PRICES/LIMITS = PRODUCT DECISION REQUIRED**

## Gate result

- `COMMERCIAL-GATE-P1` → **CLOSED** when checklist marked `[x]`
- Full Commercial Launch Gate → **REMAINS OPEN**
- M12 gate → **REMAINS OPEN**
