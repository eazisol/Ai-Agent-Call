# M05 — AI Agent Management — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Phase | P02 — AI Agent Core |
| Status | Implementation complete — 27 August 2026 |
| Depends on | M01–M04 |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M05 introduces **AI agents** as business-scoped receptionist configurations: list/create/view/update/archive, role & personality, greeting, instructions, language policy (inherit or customize), voice preference, escalation stubs, and activate/deactivate.

**Role in product:** Agents are what M06 maps to ElevenLabs, M07 attaches knowledge to, M08/M09 assign voices, M11 links numbers, and M12 resolves at call time.

## 2. Delivered scope

### In scope

- Local agent CRUD under active org + active business cookies
- Language: business defaults or agent subset; single vs multilingual; detection/switching flags
- Voice preference only (`female` / `male` / `neutral`) — not Voice Library
- Escalation **stub** fields (no call-time enforcement)
- Portal: `/agents*` with real API

### Out of scope (do not file as bugs)

- Live ElevenLabs sync / provider mappings writes (**M06**)
- Knowledge base (**M07**)
- Voice library / preview / cloning (**M08** / **M09**)
- Phone assignment (**M11**)
- Call-time escalation / tools (**M12** / **M17**)
- Prototype `ai_configs` / OpenAI Realtime path

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M01–M04 | Verified user, org membership, **active business** |
| Migrations | Through `AgentLanguageVoiceConfig1756083000000` (and prior M05 migrations) |
| Cookies | `eazi_org` + `eazi_biz` required for agent APIs |
| SMTP | Not required for M05 |

**Suggested test accounts**

- Owner A / Admin A / Manager A / Viewer A in Org A, Business A  
- Owner B in Org B, Business B (cross-tenant)

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / view | ✓ | ✓ | ✓ | ✓ |
| Create / update / activate / deactivate | ✓ | ✓ | ✓ | ✗ |
| Archive / unarchive / hard delete | ✓ | ✓ | ✗ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/agents` | List (+ show archived) |
| `/agents/new` | Create wizard |
| `/agents/[id]` | Overview + status actions |
| `/agents/[id]/behavior` | Behavior + language/voice |
| `/agents/[id]/escalation` | Escalation stubs |
| Sidebar **AI Agents** | Enabled nav |

## 6. Backend / API surface

Prefix `/api/v1` — session + active org + active business.

| Method | Path | Notes |
| --- | --- | --- |
| POST/GET | `/agents` | Create / list (`?includeArchived=true`) |
| GET/PATCH/DELETE | `/agents/:id` | Read / update / hard delete |
| POST | `/agents/:id/activate` | `active` |
| POST | `/agents/:id/deactivate` | `inactive` |
| POST | `/agents/:id/archive` | `archived` |

See [api-contracts.md](./api-contracts.md). **No provider secrets.** `providerMappings` is always `[]` in M05.

## 7. Data and integrations

- Tables: `ai_agents`, `agent_configs`, `agent_prompts`, `agent_provider_mappings` (schema only)
- FK: `business_id` → businesses CASCADE
- No external providers in M05

## 8. End-to-end workflows

### WF-1 — Create agent

1. Sign in → active org + active business.  
2. `/agents` → Create agent.  
3. Complete wizard (identity → behavior/language → escalation → review).  
4. Land on overview; status **Active**.

### WF-2 — Edit behavior and language

1. Behavior → change greeting/instructions.  
2. Customize languages to a **subset** of business languages; set voice preference.  
3. Save → overview reflects changes.

### WF-3 — Activation and archive

1. Deactivate → badge Inactive; Activate → Active.  
2. As owner/admin, Archive → hidden from default list; enable “Show archived”.  
3. Unarchive (to inactive) → then Activate if needed.

### WF-4 — Escalation stub

1. Escalation → enable + keywords/contacts → Save.  
2. Confirm values reload; no live call handoff expected.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| No active business | Empty CTA / API `ACTIVE_BUSINESS_REQUIRED` |
| Viewer create/update/activate | UI blocked / API 403 `FORBIDDEN` |
| Manager archive | 403 |
| Agent language outside business set | 400 `INVALID_LANGUAGE` |
| Invalid catalogue code | 400 `VALIDATION_ERROR` or `INVALID_LANGUAGE` |
| Cross-business agent id | 404 `AGENT_NOT_FOUND` |
| Cross-org member | 404 `ORGANIZATION_NOT_FOUND` (or equivalent denial) |
| Activate while archived | 400 `AGENT_ARCHIVED` |
| Duplicate non-archived name | 409 `AGENT_NAME_CONFLICT` |

## 10. Security / tenant cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-M05-SEC-01 | Org B owner opens Org A agent URL | Not found / denied |
| TC-M05-SEC-02 | Same org, other business agent id | `AGENT_NOT_FOUND` |
| TC-M05-SEC-03 | Viewer PATCH greeting | 403 |
| TC-M05-SEC-04 | Responses contain no ElevenLabs keys | Pass |

## 11. Happy-path test cases

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M05-01 | Create under Business A | Agent active; listed |
| TC-M05-02 | Update behavior + voice preference | Persists |
| TC-M05-03 | Inherit business languages | Matches business policy |
| TC-M05-04 | Customize subset (e.g. en+ur only) | Saves; detection rules apply |
| TC-M05-05 | Deactivate / activate | Status toggles |
| TC-M05-06 | Archive / show archived / unarchive | Correct list + status |
| TC-M05-07 | Escalation stubs | Persist only |

## 12. Regression scope

- M04 businesses: create/switch still works; deleting business with agents blocked if dependents enforced  
- M03 team RBAC unchanged  
- M01 auth session cookies still required  

## 13. Known limitations

- Live voice provider sync is delivered in **M06** (use that QA guide for sync flows)  
- Voice selection/preview/cloning not available (M08/M09)  
- Escalation does not fire on calls yet  

## 14. Evidence expectations

Screenshots or notes for: create success, behavior save, activate/deactivate, archive, viewer denial, cross-business 404. Capture `error.code` + correlation ID on failures.

## 15. Bug-reporting guide

Include: role, org, business name/id (non-prod), agent id, route, HTTP status, `error.code`, correlation ID. Do **not** attach `.env`, cookies, or provider API keys.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M05-01 … TC-M05-07 + SEC-01 … SEC-04 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Automated evidence (dev):** backend `npm run typecheck` + `npm test` + `npm run test:e2e`; frontend `npm run typecheck` — 27 August 2026.
