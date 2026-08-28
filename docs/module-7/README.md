# Module 07 — Knowledge Base

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Status | **Complete** — 27 August 2026 |
| Depends on | M04, M05, M06 Complete |
| Next | M08 — Voice Library |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope & ownership |
| [data-model.md](./data-model.md) | Sources, assignments, provider mappings |
| [domain-logic.md](./domain-logic.md) | Sync, assign, delete rules |
| [api-contracts.md](./api-contracts.md) | Library + assignment APIs |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal surfaces |
| [security-and-qa.md](./security-and-qa.md) | 07.04 evidence |
| [M07_Knowledge_Base_manual-qa-guide.md](./M07_Knowledge_Base_manual-qa-guide.md) | Manual QA handoff |

## Objective (one line)

Business-owned shared knowledge assets with per-agent assignment and provider-neutral sync — SaaS is source of truth.

## Architecture lock (Phase 03)

```text
Business
├── Knowledge Sources   ← M07
└── Agents
     └── agent_knowledge_sources (many)
```

## Configuration (server-side)

| Env | Notes |
| --- | --- |
| `OBJECT_STORAGE_*` | Required for file uploads |
| `KNOWLEDGE_MAX_FILE_BYTES` | Default 10MB |
| `ELEVENLABS_API_KEY` | Required at knowledge sync time |

Never put secrets in the frontend or commit real keys.
