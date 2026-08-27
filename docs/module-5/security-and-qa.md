# Module 05 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Date | 27 August 2026 |
| Status | Verified |

## Controls verified

| Control | Evidence |
| --- | --- |
| Active org + business required | Missing `eazi_org` → `ACTIVE_ORGANIZATION_REQUIRED`; missing `eazi_biz` → `ACTIVE_BUSINESS_REQUIRED` (controller + e2e) |
| Business ownership | Agent ops resolve active business under active org; archived business blocked for create (allow archived for read/update with policy) |
| Agent ownership | Queries filter `business_id`; foreign agent UUID under another business → `AGENT_NOT_FOUND` (404) |
| Org membership | Non-member of org → `ORGANIZATION_NOT_FOUND` (domain isolation test) |
| RBAC list/view | All roles (`agent-permissions`, domain) |
| RBAC create/update/activate | Viewer forbidden; owner/admin/manager allowed |
| RBAC archive/delete | Manager/viewer forbidden; owner/admin allowed |
| Activate from archived | `AGENT_ARCHIVED` until unarchive via PATCH `status` |
| Language subset | Agent cannot use language outside business supported set → `INVALID_LANGUAGE` |
| Provider isolation | No ElevenLabs/OpenAI calls; `providerMappings` always `[]` in M05 views |
| Business delete dependents | Hard-delete business counts `ai_agents` as dependents |

## Automated tests

| Suite | Coverage |
| --- | --- |
| `test/unit/agent-permissions.test.js` | Permission matrix |
| `test/unit/agents-domain.test.js` | CRUD, RBAC, cross-business, cross-org, language/voice, activate/archive |
| `test/unit/language-catalogue.test.js` | Catalogue codes |
| `test/app.agents.e2e-test.js` | Contracts, validation, ACTIVE_BUSINESS_REQUIRED, FORBIDDEN |

Commands (backend):

```bash
npm run typecheck
npm test
npm run test:e2e
```

Frontend:

```bash
npm run typecheck
```

## Manual QA journey (05.04-09)

Local stack (API :3000, UI :3001) with M05 migrations applied:

1. Active business → `/agents` → Create wizard → lands on overview (active)  
2. Behavior: edit greeting / language mode / voice preference → Save  
3. Escalation stub toggle + keywords → Save  
4. Deactivate → Activate; Archive (owner) → Unarchive  
5. Viewer: list/detail OK; create/save/activate controls blocked or 403  
6. Manager: can create/update/activate; archive returns 403  
7. Switch org / foreign agent URL → not found / denied  
8. Business with English+Urdu: agent inherits; customize subset only  

Full cases: [M05_AI_Agent_Management_manual-qa-guide.md](./M05_AI_Agent_Management_manual-qa-guide.md).

## Regression

M01–M04 unit/e2e suites remain green alongside M05 agent suites (27 August 2026).
