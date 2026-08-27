# Module 06 — Data model

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Submodule | 06.02 complete — 27 August 2026 |
| Status | Implemented (mapping-only MVP) |

## Table — `agent_provider_mappings` (from M05, used by M06)

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `agent_id` | FK → `ai_agents` CASCADE |
| `provider` | `elevenlabs` for M06 |
| `external_agent_id` | ElevenLabs agent id when provisioned |
| `sync_status` | `not_provisioned` \| `pending` \| `synced` \| `error` |
| `last_synced_at` | Success timestamp |
| `last_error` | **Sanitized** customer-safe message only |
| timestamps | created/updated |

**Unique:** `(agent_id, provider)`.

## Decision (06.02)

**Option A — Mapping-only MVP.** No `provider_sync_logs` table. Status UI + retry use mapping fields. Append-only audit deferred unless QA requires history.

No new migration in 06.02 — reuses M05 schema.

## Local config read model (not owned by M06)

M06 **reads** (does not redefine):

- `ai_agents`, `agent_configs`, `agent_prompts`
- Effective language policy (business inherit or agent override)
- `voice_preference` for heuristic default voice until M08

## Ownership

Mappings inherit tenant scope via `agent_id` → `business_id` → `organization_id`.
