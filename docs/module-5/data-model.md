# Module 05 — Data model (AI Agent Management) — Design

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Submodule | 05.01 design / for 05.02 implementation |
| Status | Designed — 27 August 2026 (not migrated yet) |

## Ownership keys

| Key | Role |
| --- | --- |
| `organization_id` | Via `businesses.organization_id` + `eazi_org` membership |
| `business_id` | Required FK on `agents`; active business from `eazi_biz` |

Do **not** denormalize `organization_id` onto `agents` in MVP unless 05.02 performance needs force it; always join business for org checks.

## Tables

### `agents`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | **ON DELETE CASCADE**; required |
| `name` | varchar(150) | Required |
| `status` | varchar(20) | `active` \| `inactive` \| `archived`; default `active` |
| `created_at` / `updated_at` | timestamptz | |

Indexes:

- `(business_id, status)`
- Unique partial: lower(`name`) per `business_id` where `status <> 'archived'` (exact SQL in 05.02)

### `agent_configs` (1:1)

| Column | Type | Notes |
| --- | --- | --- |
| `agent_id` | uuid PK FK → agents CASCADE | |
| `language` | varchar(20) | MVP list; default `en` |
| `escalation_enabled` | boolean | default false |
| `escalation_keywords` | text / jsonb | optional; stored, unused at runtime in M05 |
| `escalation_contact_phone` | varchar(30) | nullable |
| `escalation_contact_email` | varchar(150) | nullable |
| `escalation_message` | text | nullable; handoff message stub |
| `voice_id` | uuid nullable | **placeholder only** — no M08 FK enforced until voice module |
| `created_at` / `updated_at` | timestamptz | |

### `agent_prompts` (1:1)

| Column | Type | Notes |
| --- | --- | --- |
| `agent_id` | uuid PK FK → agents CASCADE | |
| `role_label` | varchar(100) | Required (e.g. “Front desk receptionist”) |
| `personality` | text | Optional |
| `greeting` | text | Required |
| `instructions` | text | Required (system/behavior instructions) |
| `created_at` / `updated_at` | timestamptz | |

### `agent_provider_mappings` (0:N — schema for M06)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `agent_id` | uuid FK → agents CASCADE | |
| `provider` | varchar(50) | e.g. `elevenlabs` |
| `external_agent_id` | varchar(255) | nullable until provisioned |
| `sync_status` | varchar(40) | e.g. `not_provisioned` \| `pending` \| `synced` \| `error` |
| `last_synced_at` | timestamptz | nullable |
| `last_error` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |
| Unique | `(agent_id, provider)` | |

**M05 behavior:** create table only; **do not** insert mappings or call providers.

## Relationship to `ai_configs`

Prototype table **`ai_configs`** remains for OpenAI Realtime. No migration merges it into `agents` in M05. Business hard-delete in M04 continues to treat `ai_configs` as a dependent; future work may align call routing to `agents`.

## Migration plan (05.02)

New TypeORM migration after `BusinessManagement1756070000000` creating the four tables above. No destructive sync (`synchronize: false`).
