# Module 10 — Frontend surfaces (10.03)

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Submodule | 10.03 — Frontend & Integrations |
| Status | **Implemented** — 28 August 2026 |

## Surfaces

| Route | Purpose | Auth |
| --- | --- | --- |
| `/settings` | Settings hub with links | Org session |
| `/settings/integrations` | Twilio provider health + webhook URLs | Owner / admin only |

No business phone-number UI in M10 (M11).

## Integrations page

Shows server-side Twilio status from `GET /api/v1/telephony/provider-status`:

- Provider name
- Configured / credentials valid
- Webhook signature mode
- Expected webhook URLs (non-secret)
- Active provider mappings count
- Refresh with loading + error retry

Viewer/manager see a permission message instead of provider details.

## API client

`src/lib/telephony-api.ts` — credentials include, timeout handling, error envelope parsing.

## Component

`src/components/settings/telephony-provider-status-panel.tsx`

## Out of scope (10.03)

- Phone search/purchase UI (M11)
- Admin `/admin/system-health` (mock nav remains; live status is portal integrations)
- Twilio credential editing in browser (never)

## Navigation

Enabled in `portal-nav.ts`: `/settings/integrations`
