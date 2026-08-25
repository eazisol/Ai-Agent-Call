# Module 03 — API contracts (Users, Team & Roles)

All routes use prefix `/api/v1` and the M00 error envelope. Team mutations require M01 session cookies unless noted.

## Members

| Method | Path | Auth | Who | Behavior |
| --- | --- | --- | --- | --- |
| GET | `/organizations/:id/members` | Yes | Any member | List members for this org only |
| PATCH | `/organizations/:id/members/:memberId` | Yes | owner / admin* | Change role (`admin` \| `manager` \| `viewer`); no self-change; cannot assign `owner` |
| DELETE | `/organizations/:id/members/:memberId` | Yes | owner / admin* | Remove member; cannot remove last owner |

\*Admin cannot manage owners or other admins; cannot assign `admin` / `owner`.

## Invitations

| Method | Path | Auth | Who | Behavior |
| --- | --- | --- | --- | --- |
| GET | `/organizations/:id/invitations` | Yes | owner / admin | Pending, non-expired invites |
| POST | `/organizations/:id/invitations` | Yes | owner / admin* | Body `{ email, role }`; cancels prior pending for same email; SMTP via `EmailDeliveryPort`; stores SHA-256 token hash; TTL `AUTH_INVITE_TTL_SECONDS` (default 7d) |
| DELETE | `/organizations/:id/invitations/:invitationId` | Yes | owner / admin | Cancel pending invite |
| GET | `/invitations/preview?token=` | No | Public | Safe preview: `status`, org, invited email, role, inviter name, expiry, `accountState` (`existing`\|`new`) only when token hash matches; does not consume |
| POST | `/invitations/accept` | Yes | Invitee | Body `{ token }`; email must match; creates membership (idempotent if already member); sets `eazi_org`; returns `{ member, organizationId, alreadyMember }` |

Inviteable roles: `admin`, `manager`, `viewer` only.

## Ownership

| Method | Path | Auth | Who | Behavior |
| --- | --- | --- | --- | --- |
| POST | `/organizations/:id/transfer-ownership` | Yes | owner | Body `{ memberId }`; promote target to owner and demote actor to admin (single owner) |

## Organization settings (M02 + M03)

| Method | Path | Change in M03 |
| --- | --- | --- |
| PATCH | `/organizations/:id` | **owner and admin** may update name/slug |

## Roles

| Role | Notes |
| --- | --- |
| `owner` | Org creator; transfer via dedicated endpoint |
| `admin` | Team + settings; limited vs other admins/owners |
| `manager` | Member; list members only (MVP) |
| `viewer` | Read-only member; M02 `member` migrated to this |

Permission matrix is **code-defined** in `organization-permissions.ts` (not a DB table).

## Errors (team)

| Code | Status | When |
| --- | --- | --- |
| `FORBIDDEN` | 403 | RBAC denial / email mismatch on accept |
| `MEMBER_NOT_FOUND` / `INVITATION_NOT_FOUND` | 404 | Missing in tenant |
| `ORGANIZATION_NOT_FOUND` | 404 | Non-member accessing org-scoped route |
| `ALREADY_A_MEMBER` | 409 | Invite email already in org |
| `LAST_OWNER` | 409 | Remove sole owner without transfer |
| `INVALID_INVITATION_TOKEN` / `INVITATION_EXPIRED` | 400 | Bad/expired accept |
| `INVITATION_EMAIL_FAILED` | 502 | SMTP failure (invite rolled back/cancelled) |
| `INVITATION_CANCELLED` | 400 | Cancelled invite on accept |
| `INVITATION_ALREADY_ACCEPTED` | 400 | Consumed invite on accept |
| `INVITATION_EMAIL_MISMATCH` | 403 | Signed-in email ≠ invite email |
| `VALIDATION_ERROR` | 400 | DTO validation |

## Data

- Migration `1756060000000-TeamRolesAndInvitations`
- Tables: `organization_members` (roles expanded), `organization_invitations`
- FKs: invitation → organization **ON DELETE CASCADE**; `invited_by_user_id` → users **ON DELETE SET NULL**
