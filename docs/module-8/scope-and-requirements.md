# Module 08 — Voice Library: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Submodule | 08.01 — Scope & Technical Design |
| Status | Requirements locked — 28 August 2026 |
| Depends on | M05, M06 Complete |
| Target | MVP |

## 1. Objective

Deliver a **Shared Business Voice Library** with **per-agent voice selection**, so eligible voices (provider catalogue stock voices now; Business-owned cloned voices after M09) are listed once, previewed safely, and **referenced** by agents via a canonical EaziAiCall voice record — not duplicated per agent.

EaziAiCall PostgreSQL remains the **source of truth** for which voice an agent uses. Provider voice IDs live in **provider mappings** behind the canonical `voice_assets` row.

## 2. Boundaries

### In scope (M08) — maps to 08.01 checklist

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P03-M08-01-01 | Objective & ownership model | This document; **voice asset** vs **agent voice assignment** |
| P03-M08-01-02 | List provider voices | Fetch via `VoiceCatalogPort`; expose as Business Voice Library (active business context) |
| P03-M08-01-03 | Search / filter | Language, accent, style labels; Male / Female / Neutral·Any as **presentation filters** only (aligned with M05 `voice_preference` — not biological agent identity) |
| P03-M08-01-04 | Preview voice | Server-proxied preview audio/text; no provider secrets in browser |
| P03-M08-01-05 | Assign voice to agent | Agent references shared `voice_assets` row; changing assignment does not duplicate the asset |
| P03-M08-01-06 | Provider-neutral mapping | `voice_provider_mappings` stores external IDs; core tables never use `elevenlabs_voice_id` |
| P03-M08-01-07 | Current voice on agent | Show assigned voice; same voice reusable across multiple same-Business agents |
| P03-M08-01-08 | Out of scope | Section 3 |
| P03-M08-01-09 | Voice metadata | Provider-neutral catalogue fields documented in [data-model.md](./data-model.md) |
| P03-M08-01-10 | Compatibility validation | Warn or block when voice languages / provider capabilities conflict with agent languages or model |
| P03-M08-01-11 | M09 clones in library | Documented: cloned voices appear as Business-owned `voice_assets` without per-agent recreation (implementation in M09) |

### Decisions locked in 08.01

| Topic | Decision |
| --- | --- |
| Ownership model | **Voice asset** (catalogue row or future clone) is reusable. **Agent assignment** is `agent_configs.voice_id` → `voice_assets.id` (one active voice per agent). Mirrors M07 asset vs assignment split |
| Business vs platform scope | **Provider stock voices**: platform-cached `voice_assets` with `business_id = NULL`, visible to every Business in the library. **Business clones (M09)**: `business_id` set; visible only to that Business |
| No per-agent voice rows | Assigning Sarah to Agent A and Agent B creates **two assignment references** to the **same** `voice_assets` row — never two Sarah rows |
| Container | **No** separate `business_voice_libraries` table. The Business **library UI** queries eligible `voice_assets` for the active business |
| Org column | **Do not** duplicate `organization_id` on voice tables; derive tenant via `business_id` → `businesses.organization_id` for Business-owned assets |
| Existing M05 fields | `voice_preference` (`female` \| `male` \| `neutral`) stays as **UI filter / fallback** when `voice_id` is null. M06 sync uses explicit `voice_id` mapping when set; otherwise keeps preference heuristic until M08 assignment |
| Provider contract | New **`VoiceCatalogPort`** (registry name `VoiceCatalogProvider`): `listVoices`, `getVoice`, `previewVoice`, `isConfigured`. First adapter: **ElevenLabs**. Separate from `VoiceAgentSyncPort` (M06) and `KnowledgeSyncPort` (M07) |
| Provider IDs | Store in **`voice_provider_mappings`** (`provider`, `external_voice_id`, optional non-secret metadata) — not on `agent_configs` |
| Catalogue refresh | **Read-through cache**: list API upserts/refreshes platform `voice_assets` from provider (TTL configurable in 08.02). MVP may refresh on each library load with short TTL |
| Preview | Backend calls provider or serves cached sample; returns stream URL or proxied audio bytes. **Never** return API key or raw provider auth headers to the client |
| Assign trigger | **Explicit** assign/save from agent Voice UI or `POST /agents/:id/voice`. Assign does **not** auto-run M06 agent sync (user syncs separately — same explicit-sync pattern as M07) |
| Compatibility | On assign and on agent detail: compare voice `language_codes` with agent effective languages (inherit business or agent subset). **Warn** on mismatch; **block** only if voice is archived/unavailable/not eligible for Business |
| Cross-business | Agents may only assign voices eligible for their Business (`business_id` null = global catalogue OK; clone rows must match agent.business_id) |
| RBAC | See matrix below |
| M09 handoff | M09 creates Business-owned `voice_assets` (`source_type = business_clone`) + consent/samples tables. M08 library query includes them when `business_id` matches. M08 does **not** implement clone lifecycle |

### MVP permission matrix

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / search / preview voices (library) | ✓ | ✓ | ✓ | ✓ |
| View agent assigned voice | ✓ | ✓ | ✓ | ✓ |
| Assign / change agent voice | ✓ | ✓ | ✓ | ✗ |

(Align assign with agent update; view with agent view.)

### Provider-neutral catalogue metadata (canonical fields)

| Field | Purpose |
| --- | --- |
| `display_name` | Human label (e.g. “Sarah”) |
| `description` | Optional marketing / character blurb from provider |
| `language_codes` | BCP-47 or provider-normalized codes supported by the voice |
| `gender_presentation` | `female` \| `male` \| `neutral` \| `unknown` — **filter/preview only** |
| `accent` | Optional string (e.g. “American”, “British”) |
| `style_labels` | Optional tags (e.g. “warm”, “professional”) |
| `source_type` | `provider_catalog` \| `business_clone` (clone populated by M09) |
| `preview_sample_text` | Optional default text for preview |

Provider-specific IDs, model constraints, and raw JSON live in **`voice_provider_mappings.metadata`** (non-secret) or adapter-only code — not as first-class domain columns named after a vendor.

### Planned data / API / UI

- [data-model.md](./data-model.md)  
- [domain-logic.md](./domain-logic.md)  
- [api-contracts.md](./api-contracts.md)  
- [frontend-surfaces.md](./frontend-surfaces.md)

## 3. Out of scope (do not pull forward)

| Item | Deferred to |
| --- | --- |
| Voice cloning, consent capture, sample upload | M09 |
| Revoke/delete clone with assignment safety | M09 |
| Auto-sync agent to provider on every voice assign | Optional later; MVP uses explicit M06 sync |
| Call-time TTS / realtime voice switching | M12+ |
| Billing / entitlements per premium voice | M25+ |
| Retell / custom catalogue adapters | Future adapters on `VoiceCatalogPort` |
| Per-agent multiple simultaneous voices | Later; MVP one `voice_id` per agent |
| Voice “favorites” or Business-curated subsets | Later |
| Replacing M05 `voice_preference` entirely | Keep as filter/fallback through M08 MVP |
| Knowledge / prompt editing | M05 / M07 |
| Phone / telephony | M10–M12 |

## 4. Cross-module interactions

| Module | Interaction |
| --- | --- |
| M05 | `agent_configs.voice_id` placeholder gains FK to `voice_assets`; `voice_preference` remains |
| M06 | On sync, if `voice_id` set → resolve `external_voice_id` from mapping; else preference heuristic. Compatibility warnings may surface on sync panel |
| M07 | Independent; same Business asset pattern |
| M09 | Adds `business_clone` rows to same library; reuse assign API |

## 5. Acceptance criteria for 08.01 gate

- [x] Objective and asset vs assignment model documented  
- [x] Catalogue, filter, preview, assign, mapping, reuse documented  
- [x] Out of scope and M09 library integration documented  
- [x] Metadata and compatibility rules documented  
- [x] Data model, domain logic, API contracts, and frontend surfaces drafted for 08.02 / 08.03  

**08.01 complete** — proceed to **08.02 Backend, Persistence & API**.
