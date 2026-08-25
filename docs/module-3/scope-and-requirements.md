# Module 03 — Users, Team & Roles: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M03 — Users, Team & Roles |
| Submodule | 03.01 — Scope & Technical Design |
| Status | Requirements locked — module Completed 25 August 2026 |
| Date | 25 August 2026 |
| Depends on | M01 Complete, M02 Complete |
| Target | MVP |

## 1. Objective

Extend the organization tenant with **team collaboration**: owners/admins can **invite** people by email (real SMTP), invitees can **accept** into membership, members can be **listed**, **role-changed**, and **removed**, with **pending invitations** visible and **RBAC checks** that prevent privilege escalation and cross-tenant access. No permanent mock team data.

## 2. Boundaries

### In scope (M03)

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P01-M03-01-02 | Invite team member | Authenticated privileged user invites by email + role; invitation row created; email sent via `EmailDeliveryPort` |
| P01-M03-01-03 | Accept invitation | Valid token (authenticated matching email, or register-then-accept path) creates/updates `organization_members` and consumes the invite |
| P01-M03-01-04 | List members | Members of the org can list memberships for that org only |
| P01-M03-01-05 | Owner / Admin / Manager / Viewer roles | Four roles enforced in membership + invite; M02 `member` migrated to `viewer` (or equivalent mapping locked in 03.02) |
| P01-M03-01-06 | Change role | Privileged actor changes another member’s role within policy (no self-escalation; cannot demote last owner without transfer) |
| P01-M03-01-07 | Remove member | Privileged actor removes a non-final-owner member; removed user loses that tenant’s access |
| P01-M03-01-08 | Pending invitations | List/cancel pending invites for the org (privileged); invitee can see invite via token link |
| P01-M03-01-09 | RBAC permission checks | Server-side permission matrix for invite/list/change/remove/org settings; UI mirrors but never trusts alone |

### Decisions locked in 03.01

| Topic | Decision |
| --- | --- |
| Roles (MVP) | **`owner`**, **`admin`**, **`manager`**, **`viewer`** — exactly these four |
| M02 migration | Existing `organization_members.role = 'member'` becomes **`viewer`**. Org creators remain **`owner`**. DB check constraint updated in a migration |
| Who can invite | `owner` and `admin` only |
| Inviteable roles | Invites may assign `admin`, `manager`, or `viewer`. **Cannot invite as `owner`** (ownership transfer is a separate flow) |
| Who can change roles | `owner` can set any role except creating a second owner without transfer; `admin` can set `manager` / `viewer` only (not promote to admin/owner) |
| Who can remove | `owner` can remove admin/manager/viewer; `admin` can remove manager/viewer; nobody can remove the **last remaining owner** |
| Ownership transfer | MVP: `POST …/transfer-ownership` (or equivalent) — current owner promotes another member to owner and demotes self to admin in one transaction. Required before removing the sole owner |
| Invitation delivery | **Real SMTP** via existing `EmailDeliveryPort` / `SmtpEmailAdapter` (same port as M01) |
| Invitation token | Opaque token; store **SHA-256 hash** only; TTL from config (default 7 days); single-use (`consumed_at`) |
| Accept path | Link lands on frontend `/invitations/accept?token=…`. User must be signed in with the **same email** (normalized). If no account: register/verify first, then accept |
| Email uniqueness | Same M01 rule: invites normalize email with `trim().toLowerCase()` |
| Pending cancel | Privileged users can cancel pending invites; expired invites are rejected on accept |
| Resend | Optional in MVP: cancel+recreate or dedicated resend that rotates token — choose in 03.02; must not leave multiple active tokens for same email+org without policy |
| Permission model | **Code-defined matrix** (no separate permissions table in MVP). Checklist “roles/permission mapping if persisted” → document matrix; persist only `role` on members/invites |
| Tenant scope | All member/invite APIs require membership in `:organizationId` (404 for non-members) |
| Org settings (M02) | Update org settings remains **owner-only** unless explicitly expanded: **admin may also PATCH org name/slug** in M03 (align with “admin manages team/settings”). Locked: **owner + admin** may PATCH organization settings |
| API prefix / errors | `/api/v1` + M00 error envelope |
| Auth | `AuthGuard` on all team routes except public accept-token introspection if needed (prefer authenticated accept only) |

### MVP permission matrix (RBAC)

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List members | ✓ | ✓ | ✓ | ✓ |
| List pending invites | ✓ | ✓ | ✗ | ✗ |
| Invite (admin/manager/viewer) | ✓ | ✓* | ✗ | ✗ |
| Change role (within policy) | ✓ | ✓* | ✗ | ✗ |
| Remove member (within policy) | ✓ | ✓* | ✗ | ✗ |
| Cancel invite | ✓ | ✓ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ |
| PATCH organization settings | ✓ | ✓ | ✗ | ✗ |

\*Admin cannot invite/change/remove **owners** or other **admins**; cannot assign `admin` or `owner`.

### Planned API contracts (for 03.02; not implemented in 03.01)

Checklist-required:

- `GET /api/v1/organizations/:id/members`
- `POST /api/v1/organizations/:id/invitations`
- `PATCH /api/v1/organizations/:id/members/:memberId`
- `DELETE /api/v1/organizations/:id/members/:memberId`

Supporting (required for accept/pending UX):

- `GET /api/v1/organizations/:id/invitations` — pending list
- `DELETE /api/v1/organizations/:id/invitations/:invitationId` — cancel
- `POST /api/v1/invitations/accept` — body `{ token }` (authenticated)
- `GET /api/v1/invitations/preview?token=` — optional safe preview (email masked / org name) without consuming
- `POST /api/v1/organizations/:id/transfer-ownership` — body `{ memberId }`

### Planned data (for 03.02)

- Extend `organization_members.role` check constraint to `owner | admin | manager | viewer`; migrate `member` → `viewer`
- `organization_invitations` — id, `organization_id`, email (normalized), role, `token_hash`, `invited_by_user_id`, `expires_at`, `consumed_at`, `cancelled_at`, timestamps; unique pending (org + email) where not consumed/cancelled

Foreign keys: invitation → organization **ON DELETE CASCADE**; invited_by → users **ON DELETE SET NULL** (or RESTRICT — choose in 03.02).

### Frontend surfaces (for 03.03)

- Team list page (e.g. `/team` or `/settings/team`)
- Invite member modal/page (email + role)
- Pending invitations list + cancel
- Role selector on members
- Remove-member confirmation
- Accept-invitation page
- Replace portal “Team” coming-soon toast with real route where applicable

### Security requirements (preview for 03.04)

- Prevent privilege escalation (self-promote, admin→owner, etc.)
- Prevent removing final owner without transfer
- Tenant-scoped membership/invite checks
- Isolation tests across two orgs
- No raw invite tokens or passwords in logs

## 3. Out of scope (explicit — do not pull forward)

Documented for P01-M03-01-10:

- Custom roles / per-permission UI editor / policy engine product
- Business-scoped roles (businesses are **M04**)
- SCIM / directory sync / SSO group mapping
- Seat billing / plan limits on invites (**M25+**)
- Admin portal impersonation (**M28**)
- Soft-delete audit trail product (beyond timestamps needed for invites)
- Changing M01 auth cookies or identity tables beyond reading `users` for membership
- Multi-owner simultaneous ownership without transfer flow (exactly one owner after transfer completes unless product later allows multi-owner — MVP: **single owner** after transfer)

## 4. Non-goals for this submodule

03.01 only locks scope and requirements. It does **not** create migrations, Nest team modules, or UI pages. Those begin in 03.02+.

## 5. Definition of Done for Submodule 03.01

- [x] Objective and boundaries confirmed
- [x] In-scope capabilities listed (invite through RBAC)
- [x] Roles, SMTP invite, permission matrix, and ownership-transfer decisions recorded
- [x] Out of scope documented
- [x] Checklist items `P01-M03-01-01` … `P01-M03-01-10` marked complete after this document is accepted

## 6. Next module

**M04 — Business Management** — only after `P01-M03-GATE` (this module Complete).
