# Module 12 — Data model (12.01 design)

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Submodule | 12.01 — Scope & Technical Design |
| Status | **Implemented** — 28 August 2026 (migration `1756140000000-IncomingAiCalls`) |

## Overview

M12 **extends** the M00 `calls` foundation and adds normalized **`call_events`**. It reuses M10 **`call_provider_mappings`** and **`provider_events`** for provider idempotency. Tenant ownership is anchored on **`calls.business_id`** (required for successful routed calls; nullable only for pre-routing failure audit rows when policy allows).

## Extended table — `calls`

Baseline from M00 (`1724500000000-FoundationBaseline`). M12 migration adds routing context and failure diagnostics.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | unchanged |
| `business_id` | uuid FK → `businesses.id` ON DELETE SET NULL | **Required** when routing resolved; set on early Call create |
| `agent_id` | uuid FK → `ai_agents.id` ON DELETE SET NULL | Resolved assigned agent; null on UNKNOWN_NUMBER |
| `phone_number_id` | uuid FK → `phone_numbers.id` ON DELETE SET NULL | Canonical M11 row for called number |
| `direction` | varchar(20) | `inbound` (M12 MVP); `outbound` reserved for M13 |
| `caller_number` | varchar(30) | E.164 From (existing) |
| `receiver_number` | varchar(30) | E.164 To (existing) |
| `status` | call_status_enum | `started` \| `in_progress` \| `completed` \| `failed` (existing) |
| `failure_code` | varchar(50) nullable | Domain code — see failure routes |
| `failure_stage` | varchar(50) nullable | Resolution step where failure occurred |
| `started_at` / `ended_at` | timestamp | existing |
| `duration` | integer | seconds; from Twilio status when available |
| `summary` / `conclusion` / `sentiment` | text/varchar | existing; M16 owns summary population |
| `twilio_call_sid` | varchar(100) UNIQUE | **Retained** for backward compatibility; canonical identity also in `call_provider_mappings` |
| timestamps | timestamptz | existing |

**Indexes (new in 12.02)**

| Index | Purpose |
| --- | --- |
| `(business_id, started_at DESC)` | Portal list for active Business |
| `(agent_id, started_at DESC)` | Agent-scoped views (M14) |
| `(phone_number_id)` | Ops lookup by line |
| `(status, business_id)` | Filter by outcome |

**Tenant rule:** Portal/API queries MUST filter `calls.business_id = activeBusinessId`. Cross-business `findOne` returns `CALL_NOT_FOUND`.

## New table — `call_events`

Normalized domain lifecycle log (distinct from raw `provider_events` webhook dedupe).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `call_id` | uuid FK → `calls.id` ON DELETE CASCADE | |
| `event_type` | varchar(50) | Normalized enum (below) |
| `source` | varchar(30) | `system` \| `twilio` \| `elevenlabs` |
| `external_event_id` | varchar(150) nullable | Provider dedupe key when sourced from webhook |
| `payload` | jsonb | **Sanitized** snapshot — no secrets, no full raw webhook bodies |
| `occurred_at` | timestamptz | Business time of event |
| `created_at` | timestamptz | Ingest time |

**Normalized `event_type` values (M12 MVP)**

| Value | When |
| --- | --- |
| `CALL_RECEIVED` | Inbound webhook accepted; routing begins |
| `ROUTING_RESOLVED` | Business + Agent context loaded |
| `CALL_STARTED` | Local Call persisted; handoff attempted |
| `CALL_CONNECTED` | Provider reports active conversation (when available) |
| `CALL_COMPLETED` | Terminal success |
| `CALL_FAILED` | Terminal failure |
| `HANDOFF_FAILED` | ElevenLabs handoff rejected after Call exists |
| `ROUTING_FAILED` | Pre-handoff failure (unknown number, unassigned, etc.) |

**Unique constraint (idempotency):**

```sql
UNIQUE (call_id, event_type, source, external_event_id)
WHERE external_event_id IS NOT NULL
```

For system-generated events without provider id, use deterministic `external_event_id` (e.g. `{callId}:routing-failed:{failure_code}`).

## Reused tables (read/write in M12)

### `call_provider_mappings` (M00)

| Provider | `external_call_id` example |
| --- | --- |
| `twilio` | Twilio Call SID |
| `elevenlabs` | ConvAI conversation / call id when webhook provides it |

M12 adds ElevenLabs mapping row when conversation id is known (may arrive after handoff).

### `provider_events` (M00)

Raw webhook dedupe at adapter layer (M10 Twilio, M12 ElevenLabs). M12 orchestrator also writes **`call_events`** for product-visible lifecycle.

| Layer | Table | Audience |
| --- | --- | --- |
| Provider adapter | `provider_events` | Ops/debug, idempotency |
| Domain | `call_events` | Portal, M14+, analytics |

## Read-only resolution chain (no new tables)

| Table | M12 use |
| --- | --- |
| `phone_numbers` | Lookup by `phone_number_e164` + `status = active` |
| `phone_number_assignments` | Active assignment for resolved phone |
| `ai_agents` | Agent existence, status, business ownership |
| `agent_configs` | Language, voice_id, detection flags |
| `agent_prompts` | Greeting, instructions, personality |
| `agent_knowledge_sources` | Assigned knowledge ids only |
| `knowledge_sources` + `knowledge_provider_mappings` | Readiness / sync status |
| `voice_assets` + `voice_provider_mappings` | Selected voice resolution |
| `voice_clones` (M09) | When `source_type = business_clone` |
| `agent_provider_mappings` | ElevenLabs `external_agent_id`, `sync_status` |

## Entity diagram

```text
businesses
    ├── phone_numbers ── phone_number_assignments ── ai_agents
    │                                                      │
    └── calls ◄────────────────────────────────────────────┘
            ├── call_events
            ├── call_provider_mappings  (twilio, elevenlabs, …)
            └── (messages/recordings — M14/M15)

provider_events  (webhook dedupe — optional call_id link)
```

## Migration plan (12.02)

Suggested migration: `1756140000000-IncomingAiCalls.ts`

1. Add columns to `calls`: `agent_id`, `phone_number_id`, `direction`, `failure_code`, `failure_stage`
2. Backfill `direction = 'inbound'` where `receiver_number` is set and direction null (best-effort)
3. Add FKs with ON DELETE SET NULL for agent/phone_number
4. Create `call_events` table + indexes + partial unique constraint
5. Add list indexes on `calls`

**Non-goals in migration:** Do not drop `twilio_call_sid`. Do not destructive-sync TypeORM schema.

## Data not stored in M12

| Item | Reason |
| --- | --- |
| Full Twilio/ElevenLabs webhook bodies | Hash + sanitized payload only |
| Transcript lines | M15 `call_messages` |
| Provider API keys | Server env only |
| n8n execution payloads | Async automation is M22+ |
