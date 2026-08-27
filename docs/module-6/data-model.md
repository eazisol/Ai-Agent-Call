# Module 06 — Data model (design)

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Submodule | 06.01 (design) / 06.02 (implement) |
| Status | Designed — 27 August 2026 |

## Existing table (from M05) — primary store

### `agent_provider_mappings`

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `agent_id` | FK → `ai_agents` CASCADE |
| `provider` | e.g. `elevenlabs` |
| `external_agent_id` | ElevenLabs agent id when provisioned |
| `sync_status` | `not_provisioned` \| `pending` \| `synced` \| `error` |
| `last_synced_at` | Success timestamp |
| `last_error` | **Sanitized** customer-safe message only |
| timestamps | created/updated |

**Unique:** `(agent_id, provider)`.

## Planned additions (decide in 06.02)

| Option | When |
| --- | --- |
| A — Mapping-only MVP | If status + last_error suffice for UI + retry |
| B — `provider_sync_logs` | Append-only audit: attempt id, outcome, sanitized error, correlation id, created_at |

Prefer **A** unless QA needs history. Do not destructively recreate mappings.

## Local config read model (not owned by M06)

M06 **reads** (does not redefine):

- `ai_agents`, `agent_configs`, `agent_prompts`
- Effective language policy (business inherit or agent override) per language-policy.md
- `voice_preference` for heuristic voice choice until M08

## Ownership

Mappings inherit tenant scope via `agent_id` → `business_id` → `organization_id`. No separate org column required if all queries join through the agent.
