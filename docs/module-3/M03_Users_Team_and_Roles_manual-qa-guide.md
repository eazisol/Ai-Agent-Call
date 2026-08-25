# M03 — Users, Team & Roles — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M03 — Users, Team & Roles |
| Phase | P01 — SaaS Core |
| Status | Implementation complete — 25 August 2026 |
| Depends on | M01, M02 |
| Audience | Manual QA Engineer / Tester |

---

## 1. Module overview

M03 adds **team collaboration**: invite members by email, accept invitations, assign roles (owner/admin/manager/viewer), remove members, transfer ownership, and enforce RBAC on team and org settings actions.

## 2. Delivered scope

### In scope

- Invite, list pending, cancel invitations
- Accept invitation (logged-in, logged-out, new user journeys)
- Member list, role change, remove member
- Ownership transfer
- RBAC permission matrix (code-defined)
- SMTP invitation emails
- Invitation UX refinement (Join team, auth handoff cookie)

### Out of scope

- Fine-grained per-feature permissions beyond MVP matrix
- SSO domain allowlists
- Bulk import

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M01 + M02 | Owner account with workspace |
| SMTP | Required for invite emails |
| Test accounts | Inviter (owner), invitee existing, invitee new email |

**Roles:**

| Role | Team invite | Change roles | Remove | Org settings |
| --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Yes |
| admin | Yes* | Yes* | Yes* | Yes |
| manager | No | No | No | No |
| viewer | No | No | No | No |

\*Admin cannot manage owners/other admins or assign admin/owner.

## 4. User-facing surfaces

| Route | Access | Purpose |
| --- | --- | --- |
| `/team` | Portal + org | Members, invites, role changes, transfer |
| `/invitations/accept?token=` | Public | Preview + Join team |
| `/settings/organization` | owner/admin | Edit org |

Auth pages participate in invite handoff: `/login`, `/register`, `/verify-email` with `next` / `returnTo`.

## 5. Backend / API surface

| Area | Key endpoints |
| --- | --- |
| Members | `GET/PATCH/DELETE /organizations/:id/members[/:memberId]` |
| Invitations | `GET/POST/DELETE /organizations/:id/invitations[/:id]` |
| Accept | `GET /invitations/preview?token=`, `POST /invitations/accept` |
| Ownership | `POST /organizations/:id/transfer-ownership` |

See [api-contracts.md](./api-contracts.md) and [invitation-ux-refinement.md](./invitation-ux-refinement.md).

## 6. Data and integrations

- Migration `1756060000000-TeamRolesAndInvitations`
- Table `organization_invitations` (hashed tokens, TTL default 7d)
- SMTP via M01 email port
- Cookies: `eazi_org` set on accept; `eazi_invite_return` during auth handoff

## 7. End-to-end workflows

### WF-1 — Owner invites existing user

1. Owner → `/team` → Invite → enter email + role.
2. Invitee opens email link → `/invitations/accept?token=…`.
3. **Sign in to join** (if logged out) → **Join team**.
4. Redirect `/team`; appears in member list.

### WF-2 — Owner invites new user

1. Open invite link → **Create account to join** (email locked).
2. Register → verify email → login.
3. **Expected:** Return to invitation (not Create workspace) → **Join team**.

### WF-3 — Role change and remove

1. Owner changes manager → viewer.
2. Owner removes viewer.
3. Removed user loses access to org routes.

### WF-4 — Transfer ownership

1. Owner transfers to admin.
2. Former owner becomes admin; target becomes sole owner.

### WF-5 — Wrong account blocked

1. Logged in as wrong email on accept page.
2. **Expected:** Block + CTA to sign in with invited email.

## 8. Negative and edge cases

| Case | Expected |
| --- | --- |
| Expired invite | Preview `expired`; accept fails |
| Cancelled invite | Preview `cancelled` |
| Already accepted | Preview `accepted` |
| Email mismatch on accept | `INVITATION_EMAIL_MISMATCH` |
| Remove last owner | `LAST_OWNER` blocked |
| Viewer invites member | UI disabled / API 403 |
| Admin changes owner role | Blocked |
| SMTP failure on invite | `INVITATION_EMAIL_FAILED`; no orphan invite |
| Already member accepts | Idempotent success |

## 9. Security and tenant-isolation checks

- Cannot list members of org you don't belong to
- Cannot accept invite for different email while logged in
- Invite tokens opaque; only SHA-256 hash stored
- No email enumeration via preview for invalid tokens

## 10. UI state coverage

`/team`: loading, empty team, invite dialog validation, pending list, confirm remove. Accept page: all preview statuses, Join team loading/error.

## 11. Manual test cases

| ID | Preconditions | Steps | Expected | P/F | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-M03-01 | Owner + SMTP | WF-1 | Invitee joins org | | |
| TC-M03-02 | Owner | WF-2 new user invite | Join team after verify (not onboarding) | | |
| TC-M03-03 | Owner | WF-3 role + remove | Access revoked | | |
| TC-M03-04 | Owner | WF-4 transfer | Single owner swapped | | |
| TC-M03-05 | Wrong login | WF-5 | Blocked with clear CTA | | |
| TC-M03-06 | Viewer | Attempt invite | Forbidden | | |
| TC-M03-07 | Admin | Change owner role | Forbidden | | |
| TC-M03-08 | Owner | Cancel pending invite | Accept shows cancelled | | |

## 12. Regression scope

- M01 register/login/verify/logout
- M02 create org, switch workspace, settings
- Zero-org redirect respects invite cookie

## 13. Known limitations

- Permissions not persisted in DB (code matrix)
- Manager/viewer MVP capabilities limited to viewing team list
- Invite TTL configurable via `AUTH_INVITE_TTL_SECONDS`

## 14. Bug-reporting guide

Include invite role, preview `status`/`accountState`, signed-in email vs invited email, whether `eazi_invite_return` cookie present, API codes, redacted token prefix only.

## 15. QA sign-off

| Item | Value |
| --- | --- |
| Tester / date / commit | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Critical path verified by product owner:** WF-2 (new user invite → verify → login → Join team) — 25 August 2026.
