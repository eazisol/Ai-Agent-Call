# Marketing Website — SEO, Performance & Accessibility (P1.01)

| Field | Value |
| --- | --- |
| Status | **P1 complete** — SEO foundations live; sitemap active (10 URLs) as of 15 September 2026 |

## 1. SEO foundation (P1.02 delivered)

| Item | Status |
| --- | --- |
| Per-route titles/descriptions | `marketingRouteMetadata` in `src/content/marketing.ts` |
| Metadata builder | `buildMarketingPageMetadata` in `marketing-seo.ts` |
| Root description | Product proposition (not “dashboard-only”) |
| metadataBase | Only if `NEXT_PUBLIC_SITE_URL` or `AUTH_PUBLIC_APP_URL` set |
| robots.ts | Allow `/`; disallow portal/admin/api prefixes |
| sitemap.ts | **Active** — 10 launch marketing URLs (`MARKETING_SITEMAP_READY` all true) |
| OG image | **OG_IMAGE_OPTIONAL** — icons only for now |
| Structured data | Deferred (avoid fake offers/ratings) |
| Trackers | None |

## 2. Performance

| Constraint | Recommendation |
| --- | --- |
| RSC | Prefer Server Components for marketing pages |
| Client JS | Limit to header mobile Sheet / interactive bits |
| Images | `next/image`; optimize; lazy below-fold |
| Animation | No heavy libraries; use existing CSS |
| Video | No huge default hero video |
| CLS | Reserve space for media/skeletons |
| Pricing fetch | Server-side + revalidate ~300s; no client polling |
| Bundle | Do not import portal shell into marketing layout |

## 3. Accessibility

- Landmarks: `header`, `main`, `footer`, labeled `nav`
- Keyboard: focus-visible rings (Button already); Sheet focus trap via Radix
- Contrast: use design tokens (oklch palette)
- Labels on form controls (contact)
- Mobile menu usable with screen readers (`SheetTitle` / `SheetDescription` pattern already present)
- `prefers-reduced-motion` for optional motion

## 4. Analytics / privacy

| Topic | P1 stance |
| --- | --- |
| GA / Meta Pixel / etc. | **OUT OF SCOPE** — integration points only if later approved |
| Cookie banner | Not introduced for decoration when no marketing trackers |
| Future tracking | Consent review required before enablement |

## 5. Public security boundary

Marketing must never expose: internal APIs, tenant data, provider credentials, internal plans, `legacy_production`, admin data, org IDs, logs, env secrets. Pricing = public endpoint only.
