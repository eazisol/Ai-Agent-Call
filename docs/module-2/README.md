# Module 02 — Organizations / Tenants

| Field | Value |
| --- | --- |
| Module | M02 — Organizations / Tenants |
| Status | Completed — 25 August 2026 |
| Depends on | M01 |
| Next | M03 — Users, Team & Roles |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, active workspace cookie, out of scope |
| [data-model.md](./data-model.md) | `organizations`, `organization_members`, FK / ownership keys |
| [domain-logic.md](./domain-logic.md) | Create/list/get/update, membership, owner rules |
| [api-contracts.md](./api-contracts.md) | `/api/v1/organizations*`, `eazi_org`, frontend routes |
| [M02_Organizations_Tenants_manual-qa-guide.md](./M02_Organizations_Tenants_manual-qa-guide.md) | Manual QA handoff — test cases, workflows, sign-off |

## Database changes

| Migration | Change |
| --- | --- |
| `1756050000000-Organizations` | Creates `organizations` and `organization_members` |

`business_id` unchanged (M04). Auth tables remain user-scoped.

## API changes

Authenticated routes: create, list, get, patch, active get/set/delete. Active workspace cookie `eazi_org` (`AUTH_ORG_COOKIE_NAME`).

## Provider changes

None — no SMTP/Twilio/external adapters in M02.

## Frontend surfaces

`/onboarding/organization`, `/settings/organization`, portal workspace switcher, zero-org redirect.

## Security & QA evidence

- Membership scoping + cross-tenant 404 + owner-only PATCH (unit)
- Workspace switch does not expose foreign orgs (unit)
- Unauthenticated list → 401; non-owner PATCH → 403 (e2e)
- Regression: `npm test`, `npm run test:e2e`, frontend `npm run typecheck`

## Acceptance

Checklist submodules 02.01–02.05 and `P01-M02-GATE` marked complete.
