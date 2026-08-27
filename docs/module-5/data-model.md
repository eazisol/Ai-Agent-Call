# Module 05 — Data model (AI Agent Management)

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Submodule | 05.02 |
| Status | Implemented — 27 August 2026 |

## Ownership keys

| Key | Role |
| --- | --- |
| `organization_id` | Via `businesses.organization_id` + `eazi_org` membership |
| `business_id` | Required FK on `agents`; active business from `eazi_biz` |

## Tables

### `ai_agents` (logical domain: agents)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses CASCADE | required |
| `name` | varchar(150) | required |
| `status` | varchar(20) | `active` \| `inactive` \| `archived` |
| timestamps | | |

Indexes: `(business_id, status)`; unique partial `(business_id, lower(name)) WHERE status <> 'archived'`.

> **Naming:** Physical table is `ai_agents`, not `agents`, because the shared Postgres database also hosts n8n which already owns `public.agents`.

### `agent_configs` (1:1)

Language, escalation stub fields (`escalation_enabled`, `escalation_keywords` jsonb, contact phone/email, message), nullable `voice_id` placeholder.

Also (language / voice preference policy — refined 27 August 2026):

| Column | Notes |
| --- | --- |
| `use_business_language_settings` | When true, effective languages resolve from parent business |
| `language_mode` | `single` \| `multilingual` |
| `language` | Default / fallback code (catalogue) |
| `languages` | jsonb supported set; includes default `language` |
| `language_detection_enabled` | Auto-detect among supported (M06 wires provider) |
| `language_switching_enabled` | Mid-call switch when provider allows |
| `voice_preference` | `female` \| `male` \| `neutral` (presentation preference) |
| `voice_id` | Nullable placeholder for M08 Voice Library |

See [language-policy](../module-4/language-policy.md). Migration: `1756083000000-AgentLanguageVoiceConfig`.

### `agent_prompts` (1:1)

`role_label`, `personality`, `greeting`, `instructions`.

### `agent_provider_mappings` (0:N)

Schema for M06 only — M05 does not insert or sync.

## Migration

`1756080000000-AiAgentManagement`

## Legacy

`ai_configs` unchanged (OpenAI Realtime prototype).
