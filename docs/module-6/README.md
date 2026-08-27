# Module 06 — ElevenLabs Voice Agent Provider

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | **Complete** — 27 August 2026 |
| Depends on | M05 Complete |
| Next | M07 — Knowledge Base (Phase 03) |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope & boundaries |
| [data-model.md](./data-model.md) | Mapping-only MVP |
| [domain-logic.md](./domain-logic.md) | Sync lifecycle, mapping, errors |
| [api-contracts.md](./api-contracts.md) | Sync / provider-status APIs |
| [frontend-surfaces.md](./frontend-surfaces.md) | Agent provider status UI |
| [security-and-qa.md](./security-and-qa.md) | 06.04 evidence |
| [M06_ElevenLabs_Voice_Agent_Provider_manual-qa-guide.md](./M06_ElevenLabs_Voice_Agent_Provider_manual-qa-guide.md) | Manual QA handoff |

## Objective (one line)

Translate canonical EaziAiCall agent configuration into an ElevenLabs conversational agent, persist the mapping, and expose safe sync status — without making ElevenLabs the source of truth.

## Configuration (server-side only)

| Env | Notes |
| --- | --- |
| `ELEVENLABS_API_KEY` | Required at sync time; leave empty in `.env.example` |
| `ELEVENLABS_API_BASE_URL` | Default `https://api.elevenlabs.io` |
| `ELEVENLABS_TIMEOUT_MS` | Default `20000` |
| `ELEVENLABS_DEFAULT_VOICE_FEMALE` / `_MALE` / `_NEUTRAL` | Heuristic voice ids until M08 |

**Never** put these values in the frontend or commit real keys.

## Backend surface

- `VoiceAgentSyncPort` + `ElevenLabsVoiceAgentSyncAdapter`
- `AgentProviderSyncService`
- `POST /api/v1/agents/:id/sync`
- `GET /api/v1/agents/:id/provider-status`

## Frontend surface

- `/agents` Provider column
- `/agents/[id]` Voice provider sync panel
