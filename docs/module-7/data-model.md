# Module 07 — Data model (implemented)

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Submodule | 07.02 (implement) |
| Status | **Implemented** — 27 August 2026 |

## Decision: no `knowledge_bases` table (MVP)

Business = library container. Sources hang off `business_id`.

## Tables

### `knowledge_sources`

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `business_id` | FK → `businesses` CASCADE |
| `name` | display title |
| `type` | `file` \| `url` \| `text` \| `faq` |
| `status` | `active` \| `archived` |
| `description` | optional |
| `language` | optional catalogue code (nullable MVP) |
| `url` | for type `url` |
| `text_body` | for type `text` (and FAQ serialization mirror) |
| `faq_items` | jsonb `[{question, answer}]` for type `faq` |
| `object_key` | for type `file` (S3 key) |
| `original_filename` | file |
| `content_type` | MIME |
| `byte_size` | file size |
| `content_hash` | sha256 for change detection |
| `version` | integer, bump on content update |
| timestamps | created/updated |

Indexes: `(business_id, status)`.

Migration: `1756090000000-KnowledgeBase.ts`.

### `agent_knowledge_sources`

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `agent_id` | FK → `ai_agents` CASCADE |
| `knowledge_source_id` | FK → `knowledge_sources` RESTRICT |
| timestamps | |

**Unique:** `(agent_id, knowledge_source_id)`.

### `knowledge_provider_mappings`

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `knowledge_source_id` | FK CASCADE |
| `provider` | e.g. `elevenlabs` |
| `external_source_id` | nullable until provisioned |
| `sync_status` | `not_provisioned` \| `pending` \| `synced` \| `error` |
| `last_synced_at` | |
| `last_synced_version` | source version at last successful sync |
| `last_error` | sanitized |
| timestamps | |

**Unique:** `(knowledge_source_id, provider)`.

### Deferred: `knowledge_sync_logs`

Not created in 07.02 — mapping-only MVP (same pattern as M06).

## Ownership

```text
Organization → Business → knowledge_sources
                      ↘ ai_agents → agent_knowledge_sources → knowledge_sources
```

Tenant isolation via Business membership (active org + active business cookies). No `organization_id` on knowledge tables.

## Non-goals for schema

- No `elevenlabs_*` columns on core tables.  
- No per-agent copy of file blobs.  
- No organization_id on these tables.
