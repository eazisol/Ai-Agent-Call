# Module 09 — Data model (09.01)

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Submodule | 09.02 |
| Status | **Implemented** — 28 August 2026 |

## Separation: clone lifecycle vs library asset vs assignment

```text
voice_clones (Business-owned lifecycle)
    ├── voice_consents (1..n — at least one active for submit)
    ├── voice_samples (1..n files in private storage)
    └── voice_asset_id → voice_assets (business_clone)
              ↑
              │ voice_id
       agent_configs (many agents)
```

## New tables

### `voice_clones`

Business-owned clone lifecycle record (not per agent).

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `business_id` | FK → `businesses` ON DELETE CASCADE |
| `voice_asset_id` | FK → `voice_assets` nullable until ready |
| `display_name` | required — shown in library |
| `description` | optional |
| `status` | `draft` \| `processing` \| `ready` \| `failed` \| `revoked` |
| `provider` | e.g. `elevenlabs` |
| `last_error` | text nullable — provider failure message (safe, no secrets) |
| `submitted_at` | timestamptz nullable |
| `ready_at` | timestamptz nullable |
| `revoked_at` | timestamptz nullable |
| `created_by_user_id` | FK → users |
| timestamps | created/updated |

**Indexes:** `(business_id, status)`, `(voice_asset_id)` unique where not null.

### `voice_consents`

Consent evidence for clone creation (asset-level, not per agent assign).

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `voice_clone_id` | FK → `voice_clones` CASCADE |
| `business_id` | FK → businesses (denormalized for audit queries) |
| `user_id` | who accepted |
| `consent_version` | e.g. `m09-v1` — text snapshot id |
| `consent_text_hash` | sha256 of displayed consent copy |
| `accepted_at` | timestamptz |
| `ip_address` | varchar nullable |
| `user_agent` | text nullable |
| `metadata` | jsonb — optional locale, checkbox labels |

At least one consent row required before provider submit.

### `voice_samples`

Private sample metadata (bytes in object storage).

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `voice_clone_id` | FK → `voice_clones` CASCADE |
| `business_id` | FK → businesses |
| `storage_key` | private object key — never returned to client |
| `original_filename` | varchar |
| `content_type` | varchar |
| `byte_size` | bigint |
| `duration_seconds` | numeric nullable — ffprobe optional later |
| `checksum_sha256` | varchar |
| `status` | `uploaded` \| `deleted` |
| timestamps | |

**Indexes:** `(voice_clone_id, status)`.

## Existing tables (M08 reuse)

### `voice_assets`

On clone `ready`:

| Column | Value |
| --- | --- |
| `business_id` | owning business |
| `source_type` | `business_clone` |
| `display_name` | from clone |
| `status` | `active` (→ `archived` on revoke) |

### `voice_provider_mappings`

| Column | Value |
| --- | --- |
| `provider` | `elevenlabs` |
| `external_voice_id` | provider clone id |
| `metadata` | preview URL, labels — same as catalogue sync |

### `agent_configs.voice_id`

Unchanged — references `voice_assets.id`.

## Optional sync columns (09.02 decision)

Add to `voice_provider_mappings` for clones only (jsonb `metadata` already holds preview URL):

| Field in metadata | Purpose |
| --- | --- |
| `syncStatus` | `pending` \| `synced` \| `error` |
| `lastError` | safe provider message |

Avoid separate table unless M06 pattern requires it.

## Ownership diagram

```text
Organization → Business
    ├── voice_clones
    │     ├── voice_consents
    │     └── voice_samples → S3 private prefix: businesses/{businessId}/voice-samples/{cloneId}/
    ├── voice_assets (business_id set, business_clone)
    └── ai_agents → agent_configs.voice_id
```

Tenant isolation:

- All clone queries scoped by `business_id` from active business cookie.
- Cross-business clone id → `VOICE_CLONE_NOT_FOUND` (404).
- Samples never readable by other businesses.

## Migration plan (09.02)

Single migration e.g. `1756110000000-VoiceCloning.ts`:

1. Create `voice_clones`, `voice_consents`, `voice_samples`.
2. FK `voice_clones.voice_asset_id` → `voice_assets`.
3. No change to `agent_configs` (M05/M08 already have `voice_id`).

## Non-goals for schema

- No provider ids on `voice_clones` directly (use `voice_provider_mappings`).
- No duplicate `voice_assets` per agent.
- No public URLs stored on `voice_samples`.
