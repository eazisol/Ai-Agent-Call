# Module 06 — ElevenLabs Voice Agent Provider

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | In development — **06.01 complete** 27 August 2026 |
| Depends on | M05 Complete |
| Next | 06.02 — Backend, Persistence & API |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope & boundaries |
| [data-model.md](./data-model.md) | Mappings + planned sync metadata |
| [domain-logic.md](./domain-logic.md) | Sync lifecycle, mapping, errors |
| [api-contracts.md](./api-contracts.md) | Sync / provider-status APIs |
| [frontend-surfaces.md](./frontend-surfaces.md) | Agent provider status UI |

## Objective (one line)

Translate canonical EaziAICall agent configuration into an ElevenLabs conversational agent, persist the mapping, and expose safe sync status — without making ElevenLabs the source of truth.

## Configuration (planned for 06.02)

Server-side only (examples): `ELEVENLABS_API_KEY`, optional base URL / timeout. Documented in env examples when implemented — **not** exposed to the browser.
