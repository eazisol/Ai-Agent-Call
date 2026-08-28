# Module 08 — Data model (design — 08.01)

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Submodule | 08.02 (implement) |
| Status | **Implemented** — 28 August 2026 |

## Separation: voice asset vs agent assignment

```text
voice_assets (canonical voice record — one Sarah row)
       ↑
       │ voice_id FK
agent_configs (per agent — assignment only)
```

Changing Agent A’s voice updates Agent A’s `voice_id` only. Agent B’s assignment is unchanged. The shared `voice_assets` row is not duplicated.

## Tables

### `voice_assets`

Canonical EaziAiCall voice records — provider catalogue cache and (later) Business clones.

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `business_id` | FK → `businesses` nullable. **NULL** = platform-wide provider catalogue entry. **Set** = Business-owned asset (M09 clone) |
| `source_type` | `provider_catalog` \| `business_clone` |
| `display_name` | required |
| `description` | optional |
| `language_codes` | jsonb string array, normalized BCP-47 where possible |
| `gender_presentation` | `female` \| `male` \| `neutral` \| `unknown` — filter metadata only |
| `accent` | optional varchar |
| `style_labels` | jsonb string array, optional |
| `preview_sample_text` | optional text for default preview |
| `status` | `active` \| `archived` (archived hidden from assign; clones use in M09) |
| timestamps | created/updated |

**Indexes:** `(business_id, status)` where business-owned; `(source_type, status)` for catalogue queries.

**Uniqueness (catalogue):** logical unique on `(source_type, provider, external_voice_id)` enforced via mapping join or denormalized hash in 08.02 — prevent duplicate Sarah rows from repeated catalogue sync.

### `voice_provider_mappings`

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `voice_asset_id` | FK → `voice_assets` CASCADE |
| `provider` | e.g. `elevenlabs` |
| `external_voice_id` | provider voice id |
| `metadata` | jsonb — non-secret provider fields (model hints, category, preview URL if stable) |
| timestamps | |

**Unique:** `(voice_asset_id, provider)`.

No sync status columns required for stock catalogue voices (static provider metadata). M09 clone provisioning may add sync fields on mapping or a sibling table in M09 — not in M08 MVP unless clone stub rows appear early.

### Agent assignment — `agent_configs.voice_id`

M05 already has nullable `voice_id` uuid on `agent_configs` (no FK yet).

Migration: `1756100000000-VoiceLibrary.ts`.

Optional future: `agent_voice_configs` history table — **deferred**.

## Ownership diagram

```text
Organization → Business
                    ├── voice_assets (business_id set) ← M09 clones only in Phase 03
                    └── ai_agents → agent_configs.voice_id → voice_assets

Platform catalogue:
voice_assets (business_id NULL, source_type provider_catalog) → visible in every Business library
```

Tenant isolation:

- Catalogue rows (`business_id IS NULL`): readable by all authenticated businesses; not writable by customers.  
- Clone rows: `business_id` must match agent’s business for assign.  
- Cross-business assign → `VOICE_NOT_ELIGIBLE` or `AGENT_NOT_FOUND`.

## Catalogue sync (08.02 behavior)

On `GET /voices` (or background job):

1. Call `VoiceCatalogPort.listVoices`.  
2. Upsert `voice_assets` + `voice_provider_mappings` for `source_type = provider_catalog`, `business_id = NULL`.  
3. Mark missing-from-provider rows `archived` only if safe (no active assignments) — exact policy in [domain-logic.md](./domain-logic.md).

## M09 integration (design only in 08.01)

When M09 completes a clone:

1. Insert `voice_assets` with `business_id`, `source_type = business_clone`.  
2. Insert `voice_provider_mappings` with provider clone id.  
3. M08 library query: `WHERE business_id IS NULL OR business_id = :activeBusinessId`.  
4. Same assign API — no per-agent clone recreation.

## Non-goals for schema

- No `elevenlabs_*` columns on core tables.  
- No duplicate catalogue row per Business for the same provider voice.  
- No `organization_id` on voice tables.  
- No consent / sample blobs in M08 (M09).
