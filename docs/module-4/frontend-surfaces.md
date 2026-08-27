# Module 04 — Frontend surfaces

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Submodule | 04.03 |
| Status | Implemented — 27 August 2026 |

## Routes

| Route | Purpose |
| --- | --- |
| `/businesses` | List businesses for active org |
| `/businesses/new` | Create business (+ hours/settings) |
| `/businesses/[id]` | Overview |
| `/businesses/[id]/settings` | Edit profile/contact/timezone; archive |
| `/businesses/[id]/hours` | Weekly hours editor |

## Client

- `src/lib/businesses-api.ts` — CRUD, active cookie APIs, RBAC helpers
- `src/components/businesses/business-session.tsx` — list + active business context (`eazi_biz`)
- `src/components/shell/business-switcher.tsx` — wired to real session (no mocks)

## Portal chrome

- Nav: **Businesses** enabled in main group
- `isEnabledPortalRoute` includes `/businesses*`
- Breadcrumbs for list / create / detail / settings / hours

## Providers / integrations

None — first-party Nest APIs only.
