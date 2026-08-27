# M04 — Business Management — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Phase | P01 — SaaS Core |
| Status | Implementation complete — 27 August 2026 |
| Depends on | M01, M02, M03 |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M04 adds **businesses** as the operational unit inside an organization: list/create/view/update/archive, industry & contact info, timezone, language, address settings, weekly hours, and an active-business cookie (`eazi_biz`) for the portal switcher.

**Role in product:** Later modules (agents, numbers, knowledge, calls) attach to `business_id`. Org remains the security tenant (`organization_id` + membership).

## 2. Delivered scope

### In scope

- Business CRUD under active org
- Soft archive; hard delete only without dependents
- Settings (address) + 7-day hours editor
- Active business switcher (real API)
- Org-role RBAC (owner/admin/manager/viewer)

### Out of scope (do not file as bugs)

- AI agents / prompts (M05+)
- Phone numbers / Twilio (M10–11)
- Knowledge base (M07)
- Calls list tenant refactor (M12+)
- Billing, geocoding, split shifts, business-level roles

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M01–M03 | Verified user in an org with known role |
| Migration | `BusinessManagement1756070000000` applied |
| Cookies | `eazi_org` required; `eazi_biz` set on create/switch |
| SMTP | Not required for M04 |

**Suggested test accounts**

- Owner A in Org A  
- Viewer A in Org A  
- Manager A in Org A  
- Owner B in Org B (cross-tenant)

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / view / switch active | ✓ | ✓ | ✓ | ✓ |
| Create / update / hours | ✓ | ✓ | ✓ | ✗ |
| Archive / hard delete | ✓ | ✓ | ✗ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/businesses` | List |
| `/businesses/new` | Create |
| `/businesses/[id]` | Overview |
| `/businesses/[id]/settings` | Profile + archive |
| `/businesses/[id]/hours` | Hours editor |
| Sidebar BusinessSwitcher | Active business context |

## 6. Backend / API surface

Prefix `/api/v1` — session + active org required.

| Method | Path | Notes |
| --- | --- | --- |
| POST/GET | `/businesses` | Create / list (`?includeArchived=true`) |
| GET/PATCH/DELETE | `/businesses/:id` | Read / update / hard delete |
| POST | `/businesses/:id/archive` | Soft archive |
| GET/POST/DELETE | `/businesses/active` | `eazi_biz` cookie |

See [api-contracts.md](./api-contracts.md). **No secrets in responses.**

## 7. Data and integrations

- Tables: `businesses`, `business_settings`, `business_hours`
- FK: `organization_id` → organizations CASCADE
- No external providers in M04

## 8. End-to-end workflows

### WF-1 — Create first business

1. Sign in → ensure active org.  
2. `/businesses` → empty state → Create.  
3. Fill name, industry, email, timezone, optional hours → submit.  
4. Land on overview; switcher shows new business.

### WF-2 — Edit settings and hours

1. Open Settings → change phone/city → Save.  
2. Open Hours → set Mon–Fri open → Save.  
3. Overview reflects changes.

### WF-3 — Archive

1. As owner/admin, Archive.  
2. Status archived; if it was active, switcher no longer selects it.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| Viewer create | UI blocked / API 403 FORBIDDEN |
| Manager archive | 403 |
| Invalid timezone | 400 INVALID_TIMEZONE |
| opensAt ≥ closesAt | 400 INVALID_BUSINESS_HOURS |
| Foreign business UUID | 404 BUSINESS_NOT_FOUND |
| No `eazi_org` | 400 ACTIVE_ORGANIZATION_REQUIRED |
| Delete with dependents | 409 BUSINESS_HAS_DEPENDENTS |

## 10. Security and tenant-isolation checks

- Org B owner cannot open Org A `/businesses/{id}`  
- Org switch clears previous business context  
- Cookies HttpOnly; no tokens in localStorage for business context  

## 11. UI state coverage

List/create/detail: loading, empty, validation errors, success notices, API errors, disabled controls for viewers.

## 12. Manual test cases

| ID | Preconditions | Steps | Expected | P/F | Evidence |
| --- | --- | --- | --- | --- | --- |
| TC-M04-01 | Owner + org | WF-1 | Business created + active | | |
| TC-M04-02 | Owner | WF-2 | Settings/hours persist | | |
| TC-M04-03 | Owner | WF-3 | Archived; switcher updated | | |
| TC-M04-04 | Viewer | Attempt create | Forbidden | | |
| TC-M04-05 | Manager | Attempt archive | Forbidden | | |
| TC-M04-06 | Owner B | Open Org A business URL | 404 / error state | | |
| TC-M04-07 | — | Bad hours (17:00–09:00) | Validation error | | |
| TC-M04-08 | Two orgs | Switch org | Business list refreshes | | |

## 13. Regression scope

- M01 login/logout/session  
- M02 org create/switch/settings  
- M03 `/team` invite flows  
- Health endpoints unchanged  

## 14. Known limitations

- Single open interval per day (no split shifts)  
- Legacy `business_prompt` not editable in UI  
- Pre-M04 businesses without `organization_id` hidden from API  
- “All businesses” aggregate context not in MVP switcher  

## 15. Bug-reporting guide

Include: role, active org name, business id (non-prod), route, HTTP status, `error.code`, correlation ID, screenshots. Do **not** attach `.env` or cookies.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M04-01 … TC-M04-08 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Automated evidence (dev):** backend `npm test` + `npm run test:e2e`; frontend `npm run typecheck` — 27 August 2026.
