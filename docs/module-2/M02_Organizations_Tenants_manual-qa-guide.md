# M02 — Organizations / Tenants — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M02 — Organizations / Tenants |
| Phase | P01 — SaaS Core |
| Status | Implementation complete — 25 August 2026 |
| Depends on | M01 |
| Audience | Manual QA Engineer / Tester |

---

## 1. Module overview

M02 introduces **workspaces (organizations)** as the tenant boundary. Users create organizations, belong via membership, switch active workspace, and edit org settings. Active workspace is stored in the `eazi_org` cookie.

## 2. Delivered scope

### In scope

- Create, list, read, update organization
- Organization membership (creator = owner)
- Active workspace cookie + switcher in portal
- Onboarding when user has zero orgs
- Tenant isolation on org APIs

### Out of scope

- Team invites / RBAC (M03)
- Business entities (M04)
- Billing per org

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M01 | Verified user with session |
| Test users | At least two accounts for cross-tenant tests (User A, User B) |

**Suggested test data:**

- User A: creates "Acme Health" (owner)
- User B: creates "Beta Clinic" (owner) — must not see Acme data

## 4. Roles and permissions (M02 baseline; extended in M03)

| Action | Owner | Other members |
| --- | --- | --- |
| Create org | Any authenticated user | — |
| List own orgs | Yes | Yes |
| View org details | Member | Member |
| Update name/slug | Owner (M03: owner + admin) | No |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/onboarding/organization` | Create first/additional workspace |
| `/settings/organization` | View/edit active org |
| Portal header | Workspace switcher |

**Zero-org behavior:** Authenticated user with no memberships → redirected to onboarding (unless M03 invite cookie present).

## 6. Backend / API surface

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/v1/organizations` | Create + set `eazi_org` |
| GET | `/api/v1/organizations` | List for current user |
| GET | `/api/v1/organizations/active` | Active org or null |
| POST | `/api/v1/organizations/active` | Switch workspace |
| DELETE | `/api/v1/organizations/active` | Clear active cookie |
| GET | `/api/v1/organizations/:id` | Member read |
| PATCH | `/api/v1/organizations/:id` | Update name/slug |

Cookie: `eazi_org` (HttpOnly). Cleared on logout.

See [api-contracts.md](./api-contracts.md).

## 7. Data and integrations

- Tables: `organizations`, `organization_members`
- Migration: `1756050000000-Organizations`
- No external providers

## 8. End-to-end workflows

### WF-1 — First workspace

1. Register + verify + login (M01).
2. Redirected to `/onboarding/organization`.
3. Enter name (slug optional) → **Create organization**.
4. Land in portal with workspace active; switcher shows org.

### WF-2 — Switch workspace

1. User member of Org A and Org B.
2. Use switcher → select Org B.
3. Settings and org-scoped pages reflect Org B.

### WF-3 — Edit settings

1. As owner, `/settings/organization`.
2. Change name/slug → save.
3. **Expected:** Updated in switcher and GET org.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| GET org id not a member | 404 `ORGANIZATION_NOT_FOUND` |
| PATCH as non-owner | 403 |
| Duplicate slug | 409 `ORGANIZATION_SLUG_TAKEN` |
| Unauthenticated org APIs | 401 |
| Switch to org not a member | Rejected |

## 10. Security and tenant-isolation checks

- User A cannot read/update User B's organization by UUID guessing
- List endpoint returns only memberships for current user
- Workspace switch does not leak foreign org names

## 11. UI state coverage

Onboarding: validation, loading, success. Switcher: empty (zero orgs), loading, list. Settings: read-only vs edit for non-privileged roles (post-M03).

## 12. Manual test cases

| ID | Preconditions | Steps | Expected | P/F | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-M02-01 | New verified user | WF-1 create org | Dashboard with active org | | |
| TC-M02-02 | Two orgs | WF-2 switch | Data scoped to selected org | | |
| TC-M02-03 | Owner | WF-3 edit settings | Changes persist | | |
| TC-M02-04 | User B | Request User A org UUID | 404 | | |
| TC-M02-05 | Member (viewer) | PATCH settings | 403 (with M03 roles) | | |
| TC-M02-06 | Logged in | Logout | `eazi_org` cleared | | |

## 13. Regression scope

- M01 auth flows still work
- Health endpoints unchanged

## 14. Known limitations

- Single owner model until M03 transfer
- No org deletion in MVP
- Invite flow bypasses zero-org onboarding (M03)

## 15. Bug-reporting guide

Include active org name/id (non-production), role, route, API status + `error.code`, screenshots of switcher state.

## 16. QA sign-off

| Item | Value |
| --- | --- |
| Tester / date / commit | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |
