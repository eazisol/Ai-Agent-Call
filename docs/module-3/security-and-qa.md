# Module 03 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M03 — Users, Team & Roles |
| Date | 25 August 2026 |
| Status | Verified |

## Controls verified

| Control | Evidence |
| --- | --- |
| Privilege escalation | Admin cannot assign/invite `admin`/`owner`; cannot manage owners/admins; self role-change blocked (`team-domain`, `organization-permissions`) |
| Last owner | `removeMember` → `LAST_OWNER` (409) until `transferOwnership` demotes previous owner |
| Tenant-scoped membership | Non-members get `ORGANIZATION_NOT_FOUND` (404) on member/invite routes |
| Cross-tenant isolation | Member of org A cannot list org B; remove from A does not affect B |
| Invite token hygiene | Only SHA-256 hash stored; raw token appears only in SMTP body (not logs) |
| Accept email match | Wrong signed-in email → `INVITATION_EMAIL_MISMATCH` |
| DTO validation | Invite role `owner` rejected at API (`VALIDATION_ERROR`) |

## Automated tests

| Suite | Coverage |
| --- | --- |
| `test/unit/organization-permissions.test.js` | Matrix helpers |
| `test/unit/team-domain.test.js` | Invite, accept, escalate, last-owner, remove, isolation |
| `test/unit/organizations-domain.test.js` | Admin may PATCH org; viewer cannot |
| `test/app.organizations.e2e-test.js` | Contract shapes + RBAC error envelope |

Commands (backend):

```bash
npm test
npm run test:e2e
```

Frontend regression: `npm run typecheck` in `ai-call-agent-frontend`.

## Manual QA journey (03.04-11)

Verified on local stack (API :3000, UI :3001) after restart with team routes:

1. Owner opens `/team` → sees self as owner  
2. Invite member → pending list updates; SMTP invite created (or `INVITATION_EMAIL_FAILED` with clear retry if SMTP down)  
3. Accept path `/invitations/accept?token=` requires matching signed-in email  
4. Role change / remove confirmations enforce UI + server RBAC  
5. Foreign org IDs return not-found, not data leaks  

## Regression

M01 auth and M02 organization unit/e2e suites remain green alongside M03 team suites.
