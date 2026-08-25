# Module 02 — Organizations / Tenants: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M02 — Organizations / Tenants |
| Submodule | 02.01 — Scope & Technical Design |
| Status | Requirements locked — module Completed 25 August 2026 |
| Date | 25 August 2026 |
| Depends on | M01 Complete |
| Target | MVP |

## 1. Objective

Introduce the **organization** as the primary SaaS tenant boundary so an authenticated user can **create a workspace**, **list memberships**, **read and update their organization**, **switch the active workspace**, and so that **every organization query is membership-scoped** with demonstrable cross-tenant denial. No permanent mock org data in the portal chrome for these flows.

## 2. Boundaries

### In scope (M02)

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P01-M02-01-02 | Create organization/workspace | Authenticated user creates an org; creator becomes the initial **owner** member; returns the created org |
| P01-M02-01-03 | Read organization | Member can read org details for an org they belong to; non-members are denied |
| P01-M02-01-04 | Update organization settings | Owner (MVP) can update allowed settings fields; non-owners denied |
| P01-M02-01-05 | List organizations for current user | Returns only orgs where the current user has membership |
| P01-M02-01-06 | Switch active workspace | User selects an org they belong to as the active tenant context for the portal session |
| P01-M02-01-07 | Organization membership ownership | `organization_members` links `user_id` ↔ `organization_id` with a role; create path always inserts owner membership |
| P01-M02-01-08 | Tenant isolation | Org APIs never return or mutate another tenant’s data; automated proof Org A ≉ Org B |

### Decisions locked in 02.01

| Topic | Decision |
| --- | --- |
| Tenant key | `organization_id` is the primary security / membership boundary (per Module 0 tenant-key strategy) |
| Business key | `business_id` remains **M04**; M02 does not create businesses or attach `business_id` to orgs |
| Membership model | Table `organization_members` with roles **`owner`** and **`member`** only in M02 |
| First member | On create, the authenticated user is inserted as `owner` in the same transaction as the org |
| Settings (MVP) | Updatable: `name` (required), optional `slug` (unique, URL-safe). No billing, plan, or branding packs in M02 |
| Active workspace | Stored in HTTP-only cookie `eazi_org` (org UUID); set/cleared by an explicit switch/clear API; server always re-validates membership before trusting it |
| Client-supplied IDs | Path/body `organizationId` is never trusted without a membership check for the authenticated user |
| PostgreSQL RLS | **Deferred** — application-layer scoping + tests are mandatory in M02; RLS may be revisited later without blocking MVP |
| API prefix / errors | Existing `/api/v1` and M00 error envelope |
| Auth dependency | All org routes require a valid M01 session (`AuthGuard`); unverified/anonymous users cannot manage orgs |
| Prototype calls | `PrototypeOnlyGuard` / calls APIs stay as-is; M02 does **not** tenant-scope call history (later call modules) |
| External providers | **None** for M02 (no SMTP/Twilio/etc. in this module) |

### Planned API contracts (for 02.02; not implemented in 02.01)

- `POST /api/v1/organizations` — create org + owner membership
- `GET /api/v1/organizations` — list orgs for current user
- `GET /api/v1/organizations/:id` — read one org (membership required)
- `PATCH /api/v1/organizations/:id` — update settings (owner required in MVP)
- Supporting for active workspace:
  - `POST /api/v1/organizations/active` — body `{ organizationId }` → sets `eazi_org` cookie after membership check
  - `GET /api/v1/organizations/active` — returns current active org (or null) after membership re-check
  - `DELETE /api/v1/organizations/active` — clears active cookie (optional but recommended)

### Planned data (for 02.02)

- `organizations` — id, name, slug (nullable or required — choose in 02.02 with unique index), timestamps
- `organization_members` — id, `organization_id`, `user_id`, `role` (`owner` \| `member`), timestamps; unique (`organization_id`, `user_id`)

Foreign keys: member → organization **ON DELETE CASCADE**; member → user **ON DELETE CASCADE**. No `organization_id` added to M01 auth tables.

### Frontend surfaces (for 02.03)

- Organization creation / first-org onboarding
- Workspace selector (switch active org)
- Organization settings page (owner edit)
- No-organization empty state when the user has zero memberships
- Replace portal shell mock org switcher data with real APIs for these flows

### Security requirements (preview for 02.04)

- Every org query/mutation scoped to authenticated membership
- Cross-tenant read/update denied (403 or 404 — pick one consistent policy in 02.02; prefer **404** for non-members to avoid enumeration where practical, **403** for members lacking owner privilege on PATCH)
- Owner-only settings updates in MVP
- Isolation tests: create two orgs/users; A cannot read/update B; workspace switch does not leak B’s data into A’s context
- No secrets or cross-tenant identifiers in client logs

## 3. Out of scope (explicit — do not pull forward)

Documented for P01-M02-01-09:

- Team invitations, email invites, accept/decline flows (**M03**)
- Rich RBAC / custom roles / permissions matrix (**M03**)
- Removing/transferring ownership, multi-owner edge cases beyond single creator-owner (**M03** unless required for a bugfix)
- Businesses, industries, business switcher product (**M04**)
- Billing, plans, seats, usage limits on the org (**M25+**)
- Admin / support cross-tenant access (**M28**)
- Soft-delete / archive org product UX (may add `deleted_at` later; not required for M02 MVP)
- PostgreSQL RLS policies
- Tenant-scoping Calls, webhooks, or prototype APIs
- White-label / custom domains
- Organization-level SSO
- Changing auth cookie names or M01 identity schema beyond reading `users.id` for membership

## 4. Non-goals for this submodule

02.01 only locks scope and requirements. It does **not** create migrations, Nest organization modules, or UI pages. Those begin in 02.02+.

## 5. Definition of Done for Submodule 02.01

- [x] Objective and boundaries confirmed
- [x] In-scope capabilities listed (create through tenant isolation)
- [x] Tenant key, membership, active-workspace, and settings decisions recorded
- [x] Out of scope documented
- [x] Checklist items `P01-M02-01-01` … `P01-M02-01-09` marked complete after this document is accepted

## 6. Next submodule

**02.02 — Backend, Persistence & API** — migrations for `organizations` / `organization_members`, Nest module + domain rules, and the API contracts above.
