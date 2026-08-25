# Module 03 — Users, Team & Roles

| Field | Value |
| --- | --- |
| Module | M03 — Users, Team & Roles |
| Status | Completed — 25 August 2026 |
| Depends on | M01, M02 |
| Next | M04 — Business Management |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, RBAC matrix, out of scope |
| [data-model.md](./data-model.md) | Roles on `organization_members`, `organization_invitations` |
| [domain-logic.md](./domain-logic.md) | Invite/accept, transfer, tenant isolation |
| [api-contracts.md](./api-contracts.md) | Members, invitations, transfer, accept/preview |
| [frontend-surfaces.md](./frontend-surfaces.md) | `/team`, `/invitations/accept`, org settings admin edit |
| [invitation-ux-refinement.md](./invitation-ux-refinement.md) | Post-acceptance invite journeys, auth handoff, security |
| [security-and-qa.md](./security-and-qa.md) | Escalation, last-owner, isolation evidence |

## Database changes

| Migration | Change |
| --- | --- |
| `1756060000000-TeamRolesAndInvitations` | `member` → `viewer`; roles `owner\|admin\|manager\|viewer`; creates `organization_invitations` |

Permissions are **not** persisted (code matrix only).

## API changes

- `GET/PATCH/DELETE /api/v1/organizations/:id/members[/:memberId]`
- `GET/POST/DELETE /api/v1/organizations/:id/invitations[/:invitationId]`
- `POST /api/v1/organizations/:id/transfer-ownership`
- `GET /api/v1/invitations/preview`, `POST /api/v1/invitations/accept`
- `PATCH /organizations/:id` allowed for **owner + admin**

## Provider changes

SMTP invite delivery via existing `EmailDeliveryPort` / `SmtpEmailAdapter` (M01). No new provider SDK.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `AUTH_INVITE_TTL_SECONDS` | `604800` (7d) | Opaque invite token TTL |

Documented in backend `.env.example`, `.env.docker.example`, and [environment-strategy](../module-0/environment-strategy.md).

## Frontend surfaces

`/team` (portal), `/invitations/accept?token=` (public session-aware), org settings editable by admin.

## Acceptance

Checklist submodules 03.01–03.05 and `P01-M03-GATE` marked complete.
