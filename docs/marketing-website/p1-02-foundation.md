# Marketing Website — P1.02 implementation notes

| Field | Value |
| --- | --- |
| Status | **P1.02 complete** — 15 September 2026 |
| Runtime pages | Not built (P1.03) |

## Delivered foundations

| Artifact | Path |
| --- | --- |
| Launch content + feature registry | `ai-call-agent-frontend/src/content/marketing.ts` |
| Metadata helpers | `ai-call-agent-frontend/src/content/marketing-seo.ts` |
| Public plans helper | `ai-call-agent-frontend/src/lib/public-plans.ts` |
| robots | `ai-call-agent-frontend/src/app/robots.ts` |
| sitemap | `ai-call-agent-frontend/src/app/sitemap.ts` (empty until `MARKETING_SITEMAP_READY`) |
| Root metadata | `src/app/layout.tsx` uses product description + optional `metadataBase` |
| Tests | `test/marketing-foundation.test.mjs` |

## Decisions still open

| Item | Status |
| --- | --- |
| PUBLIC CONTACT EMAIL | **DECISION REQUIRED** (`marketingPublicContactEmail = null`) |
| LEGAL COPY (Privacy/Terms) | **DECISION REQUIRED** |
| COMMERCIAL PLAN VALUES | **PRODUCT DECISION REQUIRED** (M25 public catalog may be empty) |
| NEXT_PUBLIC_SITE_URL | Optional; documented in `.env.example` — do not invent domain |
| OG IMAGE | **OPTIONAL** (`OG_IMAGE_OPTIONAL`) |

## Contact strategy (recorded)

Mode: `/contact` page in P1.03 with **Get Started → /register**. Mailto only if an approved email is later configured. No CRM/contact backend in P1.

## Structured data

**Deferred** — no Organization/SoftwareApplication JSON-LD in P1.02 to avoid inventing ratings/offers while public plans may be empty.

## Tracking

**No new trackers** added.
