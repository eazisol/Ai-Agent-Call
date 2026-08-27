# Module 05 — AI Agent Management

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | **Complete** — 27 August 2026 |
| Depends on | M04 |
| Next | M06 — ElevenLabs Voice Agent Provider |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope |
| [data-model.md](./data-model.md) | `ai_agents`, configs, prompts, provider mappings |
| [domain-logic.md](./domain-logic.md) | Service rules |
| [api-contracts.md](./api-contracts.md) | `/api/v1/agents*` |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal `/agents*` |
| [security-and-qa.md](./security-and-qa.md) | 05.04 evidence |
| [M05_AI_Agent_Management_manual-qa-guide.md](./M05_AI_Agent_Management_manual-qa-guide.md) | Manual QA handoff |
| [../module-4/language-policy.md](../module-4/language-policy.md) | Business/agent language + voice preference policy |

## Database

Migrations:

- `1756080000000-AiAgentManagement`
- `1756081000000-BusinessLanguages` (M04 adjacent)
- `1756082000000-LanguageDetectionConfig`
- `1756083000000-AgentLanguageVoiceConfig`

## API

Authenticated, active-org + active-business scoped CRUD under `/api/v1/agents*`.

## Provider

None in M05 (schema placeholder for M06 only).

## Configuration

No new environment variables introduced by M05.
