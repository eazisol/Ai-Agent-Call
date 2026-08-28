# Module 08 — Voice Library

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Status | **Complete** — 28 August 2026 |
| Depends on | M05, M06 Complete |
| Next | M09 — Voice Cloning (optional) |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope & ownership |
| [data-model.md](./data-model.md) | Voice assets, mappings, agent assignment |
| [domain-logic.md](./domain-logic.md) | Catalogue, preview, assign, compatibility |
| [api-contracts.md](./api-contracts.md) | Library + agent voice APIs |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal surfaces |
| [security-and-qa.md](./security-and-qa.md) | 08.04 evidence |
| [M08_Voice_Library_manual-qa-guide.md](./M08_Voice_Library_manual-qa-guide.md) | Manual QA handoff |

## Objective (one line)

Shared Business Voice Library with per-agent voice selection — browse, preview, assign provider voices without duplicating assets per agent.

## Architecture lock (Phase 03)

```text
Business (library view)
├── voice_assets (platform catalogue + future M09 clones)
└── Agents
     └── agent_configs.voice_id → one selected voice
```

## Configuration (server-side)

| Env | Notes |
| --- | --- |
| `ELEVENLABS_API_KEY` | Required for catalogue fetch + preview (reuse M06) |
| `VOICE_CATALOG_CACHE_TTL_SECONDS` | Optional TTL for catalogue refresh (default 3600) |

Never expose provider credentials in the frontend or commit real keys.

## Module gate

**M08 Voice Library = COMPLETE** — verified 28 August 2026 (08.01–08.05).
