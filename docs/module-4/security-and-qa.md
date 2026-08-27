# Module 04 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Date | 27 August 2026 |
| Status | Verified |

## Controls verified

| Control | Evidence |
| --- | --- |
| Organization-scoped access | All business queries filter by active `organization_id` + membership; foreign business UUID → `BUSINESS_NOT_FOUND` (404) |
| Active org required | Missing `eazi_org` → `ACTIVE_ORGANIZATION_REQUIRED` (400) |
| RBAC create/update | Viewer forbidden; manager/owner/admin allowed (`business-permissions`, domain tests) |
| RBAC archive/delete | Manager forbidden; owner/admin allowed |
| Cross-tenant isolation | Org A member cannot get Org B business id (domain + e2e envelope) |
| Hours/timezone validation | Invalid IANA → `INVALID_TIMEZONE`; opens≥closes → `INVALID_BUSINESS_HOURS`; bad day → `VALIDATION_ERROR` |
| Archive vs hard delete | Dependents (`calls` / `ai_configs`) → `BUSINESS_HAS_DEPENDENTS` (409) |
| Archived active cookie | Cannot set archived business active → `BUSINESS_ARCHIVED`; archive clears `eazi_biz` when matched |
| Org switch clears business | `setActiveOrganization` / clear org also clears `eazi_biz` |
| Legacy unscoped rows | `organization_id IS NULL` never returned by API |

## Automated tests

| Suite | Coverage |
| --- | --- |
| `test/unit/business-permissions.test.js` | Matrix helpers |
| `test/unit/businesses-domain.test.js` | CRUD, RBAC, isolation, hours/timezone, delete dependents |
| `test/app.businesses.e2e-test.js` | Contracts, cookies, validation, FORBIDDEN / NOT_FOUND / DEPENDENTS |

Commands (backend):

```bash
npm test
npm run test:e2e
```

Frontend regression: `npm run typecheck` (+ `npm test`) in `ai-call-agent-frontend`.

## Manual QA journey (04.04-08)

Local stack (API :3000, UI :3001) after M04 migration:

1. Owner/admin creates business at `/businesses/new` → appears in list + switcher  
2. Edit settings + hours → persist on overview  
3. Viewer can open list/detail; create/settings save controls disabled or server returns 403  
4. Manager can edit hours; archive button absent / archive returns 403  
5. Switch org → business switcher refreshes; foreign business URLs 404  
6. Archive active business → cookie cleared; cannot switch to archived until reactivated  

## Regression

M01 auth, M02 organizations, and M03 team unit/e2e suites remain green alongside M04 business suites (47 unit / 27 e2e on 27 August 2026).
