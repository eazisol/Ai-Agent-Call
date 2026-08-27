# Module 05 — AI Agent Management: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Submodule | 05.01 — Scope & Technical Design |
| Status | Requirements locked — 27 August 2026 |
| Date | 27 August 2026 |
| Depends on | M04 Complete |
| Target | MVP |

## 1. Objective

Introduce **AI agents** as the configurable receptionist entity under a **business** so a team can **list**, **create**, **view**, **update**, **archive**, and **activate/deactivate** agents with **role/personality**, **greeting**, **language**, **instructions/prompts**, and **escalation settings** — all **business-scoped** under the active organization, with M03 RBAC and demonstrable cross-tenant denial.

An agent is what later modules map to ElevenLabs (M06), attach knowledge (M07), voices (M08), and phone numbers (M11), and resolve at call time (M12).

## 2. Boundaries

### In scope (M05)

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P02-M05-01-01 | Objective & boundaries | This document; M05 MVP locked |
| P02-M05-01-02 | List agents | Authenticated member lists agents for the **active business** only |
| P02-M05-01-03 | Create agent | Privileged member creates an agent under the active business |
| P02-M05-01-04 | View agent | Org member reads one agent that belongs to their org/business |
| P02-M05-01-05 | Update agent | Privileged member updates allowed fields; viewers denied |
| P02-M05-01-06 | Archive/delete | Soft **archive** is the default path; hard delete when no blocking dependents |
| P02-M05-01-07 | Role/personality | Persist role label + personality text used in prompts/behavior config |
| P02-M05-01-08 | Greeting | Persist greeting text shown/spoken as opening message |
| P02-M05-01-09 | Language | Agent default language from MVP allowed list (aligned with M04) |
| P02-M05-01-10 | Instructions/prompts | Persist system/instructions text (and related prompt fields) |
| P02-M05-01-11 | Escalation rules | Persist **stub** escalation fields only — no runtime escalation until call modules |
| P02-M05-01-12 | Activate/deactivate | Toggle agent between `active` and `inactive` (status on agent; no agent cookie) |
| P02-M05-01-13 | Out of scope | Section 3 below |

### Decisions locked in 05.01

| Topic | Decision |
| --- | --- |
| Tenant / ownership | Agent rows require **`business_id`** FK → `businesses`. Org isolation via join to `businesses.organization_id` + active **`eazi_org`** membership. Never trust client org/business ids without server checks |
| Active context | Agent APIs require valid session **and** active org (`eazi_org`) **and** active business (`eazi_biz`). Missing/invalid business → **`ACTIVE_BUSINESS_REQUIRED`** (or clear equivalent). Active business must belong to active org and not be archived |
| Provider sync | **Local CRUD + config only.** No live ElevenLabs/OpenAI provider calls in M05. Sync is **M06** |
| Legacy `ai_configs` | **Leave alone** for prototype OpenAI Realtime. SaaS agents use **new** tables: `agents`, `agent_configs`, `agent_prompts`, `agent_provider_mappings` |
| Provider mappings table | **Schema created in M05** so M06 can attach mappings; M05 does **not** provision external agents or write sync success. Rows may be absent until M06; optional future stub is out of M05 write path |
| API shape | Flat routes under `/api/v1/agents*` (checklist). Server derives org + business from cookies |
| Status model | `status`: **`active`** \| **`inactive`** \| **`archived`**. Create defaults to **`active`**. Activate → `active`; deactivate → `inactive`; archive → `archived`. List excludes `archived` unless `?includeArchived=true` |
| Archive / delete | Soft archive preferred. **`DELETE`** only when no blocking dependents (M05: none beyond cascading child tables; future modules add phone/call checks). Else **`409 AGENT_HAS_DEPENDENTS`** |
| Activate cookie | **No** `eazi_agent` cookie. Activation is agent status only |
| Escalation | **Stub fields only** — persisted for UI/API completeness; **no** call-time enforcement in M05 |
| Language | Same MVP list as M04: `en`, `es`, `fr`, `de`, `pt`, `ar`, `hi`, `ur` |
| Role / personality | `role_label` (short, required) + `personality` (text, optional) stored on prompts/config as designed in data model |
| Greeting / instructions | Required greeting (reasonable max length); instructions/system prompt required on create (or empty string rejected — min length locked in 05.02 DTOs) |
| RBAC | Mirror M04: list/view all members; create/update owner+admin+manager; archive/hard-delete owner+admin; activate/deactivate same as update (owner+admin+manager) |
| PostgreSQL RLS | Deferred — application scoping + tests mandatory |
| Auth | `AuthGuard` on all agent routes; unverified users blocked |
| External providers | **None** in M05 |
| Multi-agent | Multiple agents per business allowed |
| Name uniqueness | Unique among **non-archived** agents per `business_id` (case-insensitive) — enforce in 05.02 |

### MVP permission matrix (agent actions)

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List agents | ✓ | ✓ | ✓ | ✓ |
| View agent detail | ✓ | ✓ | ✓ | ✓ |
| Create agent | ✓ | ✓ | ✓ | ✗ |
| Update agent / prompts / escalation | ✓ | ✓ | ✓ | ✗ |
| Activate / deactivate | ✓ | ✓ | ✓ | ✗ |
| Archive agent | ✓ | ✓ | ✗ | ✗ |
| Hard delete (when allowed) | ✓ | ✓ | ✗ | ✗ |

### Planned API contracts (for 05.02; not implemented in 05.01)

Checklist-required:

- `POST /api/v1/agents` — create under active business
- `GET /api/v1/agents` — list for active business; `?includeArchived=true` optional
- `GET /api/v1/agents/:id` — read one (org+business scoped)
- `PATCH /api/v1/agents/:id` — update core + config + prompts + escalation stub fields
- `POST /api/v1/agents/:id/activate` — set `status = active` (not from archived without explicit unarchive policy)
- `POST /api/v1/agents/:id/deactivate` — set `status = inactive`

Supporting (recommended in 05.02):

- `POST /api/v1/agents/:id/archive` — set `status = archived`
- `DELETE /api/v1/agents/:id` — hard delete when allowed

**Unarchive:** `PATCH` with `status: "active"` or `"inactive"` from `archived` allowed for owner+admin only (same as archive privilege).

**Activate from archived:** Reject with **`AGENT_ARCHIVED`** — must unarchive first, then activate if needed.

### Planned data (for 05.02)

See [data-model.md](./data-model.md). Summary:

- **`agents`** — identity, `business_id`, `name`, `status`, timestamps
- **`agent_configs`** — 1:1 language and operational flags / future voice placeholders
- **`agent_prompts`** — 1:1 role, personality, greeting, instructions
- **`agent_provider_mappings`** — 1:N ready for M06; unused by M05 runtime

### Frontend surfaces (for 05.03)

| Route | Purpose |
| --- | --- |
| `/agents` | Agent list for active business; empty state when none / no active business |
| `/agents/new` | Create-agent wizard |
| `/agents/[id]` | Agent details + activation status |
| `/agents/[id]/behavior` | Role, personality, greeting, language, instructions |
| `/agents/[id]/escalation` | Escalation stub settings |

Portal: enable Agents nav; require active business (prompt to create/switch business if missing).

### Security requirements (preview for 05.04)

- Every agent query/mutation scoped via active org + active business ownership
- Cross-tenant / cross-business ids → prefer **404** `AGENT_NOT_FOUND`
- Role checks on write/archive/delete/activate
- No provider secrets in M05
- Isolation tests: Org A / Business A agents invisible to Org B

## 3. Out of scope (explicit — do not pull forward)

Documented for P02-M05-01-13:

- Live ElevenLabs (or any) provider create/update/delete/sync (**M06**)
- Writing/updating `agent_provider_mappings.external_*` / sync success (**M06**)
- Knowledge base attach/sync (**M07**)
- Voice library / voice assignment UX beyond nullable placeholder column if any (**M08**)
- Voice cloning (**M09**)
- Phone number assignment (**M11**)
- Call-time resolution, escalation **runtime**, tool calling (**M12**, **M17**)
- Migrating or replacing prototype **`ai_configs`** / OpenAI Realtime path
- Editing M04 `business_prompt` as the agent source of truth (agents own their prompts)
- Web widget / multi-channel publish
- Agent versioning / A-B testing / prompt history
- Billing limits on agent count (**M25+**)
- Admin cross-tenant agent access (**M28**)
- PostgreSQL RLS
- Business-level roles (org roles only)
- `eazi_agent` cookie / “default agent” portal context

## 4. Non-goals for this submodule

05.01 only locks scope and requirements. It does **not** create migrations, Nest agent controllers, or UI pages. Those begin in **05.02+**.

## 5. Definition of Done for Submodule 05.01

- [x] Objective and boundaries confirmed (`P02-M05-01-01`)
- [x] List/create/view/update/archive capabilities defined (`P02-M05-01-02` … `P02-M05-01-06`)
- [x] Role/personality, greeting, language, instructions, escalation, activate/deactivate defined (`P02-M05-01-07` … `P02-M05-01-12`)
- [x] Out of scope documented (`P02-M05-01-13`)
- [x] Checklist items `P02-M05-01-01` … `P02-M05-01-13` marked complete after this document is accepted

## 6. Next submodule

**05.02 — Backend, Persistence & API** — migrations for agent tables, Nest module + domain rules, RBAC, and the API contracts above (still **no** live provider calls).
