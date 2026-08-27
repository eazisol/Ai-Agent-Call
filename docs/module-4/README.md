# Module 04 — Business Management

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Status | Completed — 27 August 2026 |
| Depends on | M02, M03 |
| Next | M05 — AI Agent Management (05.01 locked; 05.02 next) |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, RBAC, cookies, out of scope |
| [data-model.md](./data-model.md) | `businesses`, `business_settings`, `business_hours` |
| [domain-logic.md](./domain-logic.md) | Service rules, validation, archive/delete |
| [api-contracts.md](./api-contracts.md) | `/api/v1/businesses*`, `eazi_biz` |
| [frontend-surfaces.md](./frontend-surfaces.md) | Routes, session, switcher |
| [security-and-qa.md](./security-and-qa.md) | Isolation, RBAC, test evidence |
| [M04_Business_Management_manual-qa-guide.md](./M04_Business_Management_manual-qa-guide.md) | Manual QA handoff |

## Database changes

| Migration | Change |
| --- | --- |
| `1756070000000-BusinessManagement` | Org ownership + status/language/website; settings & hours tables |

## API changes

Authenticated, active-org-scoped CRUD + archive + active business cookie APIs under `/api/v1/businesses*`.

## Provider changes

None — no SMTP/Twilio/external adapters in M04.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `AUTH_BIZ_COOKIE_NAME` | `eazi_biz` | Active business cookie |

Documented in backend `.env.example`, `.env.docker.example`, and [environment-strategy](../module-0/environment-strategy.md).

## Frontend surfaces

`/businesses`, `/businesses/new`, `/businesses/[id]` (+ `/settings`, `/hours`), portal BusinessSwitcher.

## Security & QA evidence

See [security-and-qa.md](./security-and-qa.md). Backend unit + e2e and frontend typecheck green on 27 August 2026.

## Acceptance

Checklist submodules 04.01–04.05 and `P01-M04-GATE` marked complete.
