# Marketing Website — Environment & Config Notes

| Field | Value |
| --- | --- |
| Status | Updated 15 September 2026 (pricing regression fix) |
| Secrets in this doc | **None** |

## Required for pricing pages

| Variable | Runtime | Required | Notes |
| --- | --- | --- | --- |
| `INTERNAL_API_BASE_URL` | **Server only** | Recommended | Nest API v1 base. Prefer `http://127.0.0.1:3000/api/v1` locally — **do not use `localhost`** on Windows (often resolves to `::1` while Nest listens on IPv4). Helper calls `{base}/public/plans`. Origin-only values are normalized to append `/api/v1`. |
| `INTERNAL_BACKEND_ORIGIN` / `BACKEND_PROXY_ORIGIN` | **Server only** | Fallback | Same origin used by the Vercel→ALB proxy. If `INTERNAL_API_BASE_URL` is unset, public plans uses `{origin}/api/v1/public/plans`. |

If unset, helper falls back to `http://127.0.0.1:3000/api/v1`. Upstream non-2xx / network failure → “Pricing is temporarily unavailable” with **no fake catalog**. HTTP **200 + `{"plans":[]}`** → empty state (“Plans are being finalized”), **not** error.

## Optional SEO absolute URLs

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Preferred public site origin for sitemap/robots/canonical absolute URLs |
| `AUTH_PUBLIC_APP_URL` | Fallback origin if site URL unset |

## Not used by marketing pricing

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Portal/browser API client; marketing pricing must not call authenticated subscription endpoints from the browser |

## Deployed notes

- **M25 backend production (2026-09-15):** ALB `GET /api/v1/public/plans` → **200** `{"plans":[]}` on ECS `eaziacall-prod-backend:13`. See `docs/aws-deployment/M25-production-release.md`.
- **Marketing P1 production (same day):** `/pricing` → **200** empty state (“Plans are being finalized”); `/` is marketing home (**200**).

## Related

See also `docs/module-0/environment-strategy.md` and `ai-call-agent-frontend/.env.example`.
