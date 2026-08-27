# Module 05 — AI Agent Management

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | In development — 05.01 locked 27 August 2026 |
| Depends on | M04 |
| Next | 05.02 — Backend, Persistence & API |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, RBAC, cookies, out of scope |
| [data-model.md](./data-model.md) | Planned `agents`, `agent_configs`, `agent_prompts`, `agent_provider_mappings` |
| [domain-logic.md](./domain-logic.md) | Planned service rules (for 05.02) |
| [api-contracts.md](./api-contracts.md) | Planned `/api/v1/agents*` |
| [frontend-surfaces.md](./frontend-surfaces.md) | Planned portal routes |

## Notes

- **No live ElevenLabs** in M05 — provider sync is **M06**.
- Prototype **`ai_configs`** remains for OpenAI Realtime; SaaS agents use **new tables**.
- Agents are **business-scoped** (`business_id`); APIs require **`eazi_org`** + **`eazi_biz`**.
