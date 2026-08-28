# Module 11 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Submodule | 11.04 |
| Status | Verified — 28 August 2026 |

## Security controls

| Control | Evidence |
| --- | --- |
| Business ownership (`phone_numbers.business_id`) | All service methods resolve active business cookie + `requireActiveBusiness`; cross-business IDs return `PHONE_NUMBER_NOT_FOUND` — `phone-numbers-service.test.js` |
| Organization derived via business | No `organization_id` on `phone_numbers`; membership checked before every use case |
| RBAC purchase/import/release | Owner/admin only — `phone-number-permissions.test.js` + `phone-numbers-service.test.js` |
| RBAC assign/unassign/search | Owner/admin/manager — permissions unit tests |
| Viewer read-only | List/view allowed; mutate actions `FORBIDDEN`; `providerNumberId` omitted for viewer — service + permissions tests |
| Destructive release confirmation | API requires `{ confirm: true }`; UI requires typing E.164 — DTO validation + `phone-numbers-service.test.js` + e2e |
| Release with active assignment | `PHONE_NUMBER_HAS_ASSIGNMENT` unless `unassignFirst: true` — service test + e2e |
| Cross-business assignment blocked | Agent lookup scoped to active `businessId`; inconsistent rows → `AGENT_NOT_FOUND` / `PHONE_ASSIGNMENT_CROSS_BUSINESS` — service + e2e |
| Provider abstraction | `PhoneNumbersService` injects `TELEPHONY_PROVIDER_PORT` only — no Twilio SDK in domain module |
| Credentials server-side | Twilio secrets remain in backend env (M10); phone APIs never return auth tokens |
| Duplicate inventory prevention | Partial unique indexes + `PHONE_NUMBER_ALREADY_EXISTS` pre-check before provider calls |
| Idempotent unassign | Second unassign succeeds with `assignment: null` — service test |
| Idempotent release | Already `released` row returns current state without re-calling provider — service design |
| Provider error normalization | M10 adapter maps REST failures; M11 surfaces `TELEPHONY_*`, `PROVIDER_*`, `PHONE_*` codes only |

## Automated QA (executed 28 August 2026)

| Suite | Result |
| --- | --- |
| Backend `npm run build` | Pass |
| `test/unit/phone-numbers-domain.test.js` | Pass — RBAC matrix, viewer provider SID hiding |
| `test/unit/phone-numbers-service.test.js` | Pass — tenant isolation, purchase/release confirm, search→purchase→assign, unassign, provider gate |
| `test/app.phone-numbers.e2e-test.js` | Pass — REST contracts, confirm flags, cross-tenant errors, viewer field redaction |
| Frontend `npm run typecheck` | Pass |
| Frontend `test/phone-numbers-api.test.mjs` | Pass — client RBAC helpers + E.164 validation |
| Regression | M10 telephony suites unchanged; agents/knowledge/voices unit counts stable |

## Manual QA mapping (11.04 checklist)

| Item | Covered by |
| --- | --- |
| P04-M11-04-01 Tenant owns number record | Service list isolation + manual TC-M11-SEC-01 |
| P04-M11-04-02 Role-based purchase/release | Permissions + service + manual TC-M11-SEC-02 |
| P04-M11-04-03 Confirm destructive release | Service + e2e + manual TC-M11-04 |
| P04-M11-04-04 Tenant isolation | Service cross-business tests + manual TC-M11-SEC-03 |
| P04-M11-04-05 Search→purchase→assign | Service flow test + manual WF-2 |
| P04-M11-04-06 Unassign | Service idempotent test + manual WF-3 |
| P04-M11-04-07 Release | Service release tests + manual WF-4 |
| P04-M11-04-08 Cannot assign another tenant's number | Service NOT_FOUND + manual TC-M11-SEC-03 |
| P04-M11-04-09 Regression | Full backend `npm test` + `npm run test:e2e` |
| P04-M11-04-10 End-to-end journey | Manual QA guide WF-1–WF-5 |

## Residual risk / known limits

- Live Twilio purchase/import/release not exercised in CI (requires billing + credentials).  
- Manager/viewer RBAC on live portal depends on organization session role — verify manually once per release.  
- Inbound call routing to assigned agent is **M12**, not M11.  
- `telephony_provider_mappings` (M10) and `phone_numbers` (M11) are separate; reconciliation on failed DB writes may leave provider-only rows — see manual guide edge cases.  
- Keep committed `.env.example` free of real secrets.

## Regression scope

Run before M12 starts:

- `cd ai-call-agent-backend && npm test && npm run test:e2e`  
- `cd ai-call-agent-frontend && npm run typecheck && npm run test`  
- Spot-check `/phone-numbers` list as owner with active business  
- Spot-check `/settings/integrations` still Connected when Twilio configured  
- `GET /health/ready` → `telephony: up` when configured
