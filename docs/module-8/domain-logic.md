# Module 08 — Domain logic (design — 08.01)

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Status | **Implemented** — 28 August 2026 |

## List / refresh Business Voice Library

1. Authorize (session + active org + active business + RBAC view).  
2. Optionally refresh catalogue from `VoiceCatalogPort.listVoices` if cache stale (TTL from env).  
3. Upsert platform `voice_assets` + mappings for provider stock voices.  
4. Query eligible voices:  
   - `business_id IS NULL AND source_type = provider_catalog AND status = active`  
   - **OR** `business_id = activeBusinessId AND status = active` (M09 clones when present)  
5. Apply query filters: `language`, `gender_presentation`, search on `display_name` / labels.  
6. Return paginated list with provider-neutral metadata + `id` for assign/preview.

Gender filters are **presentation preferences** aligned with M05 — they filter catalogue metadata, not agent identity.

## Get voice detail

1. Load `voice_assets` by id.  
2. Verify eligible for active business (global catalogue or same business).  
3. Attach mapping summary (provider key only — no secrets).  
4. Include `assignedAgentCount` / `assignedAgents` for same-Business agents referencing this voice (reuse pattern from M07 detail).

## Preview voice

1. Authorize view.  
2. Verify voice eligible for business context.  
3. Resolve `external_voice_id` from mapping.  
4. Call `VoiceCatalogPort.previewVoice({ externalVoiceId, sampleText? })`.  
5. Return proxied audio (stream) or short-lived signed URL generated server-side.  
6. On provider failure → sanitized error (`PROVIDER_UNAVAILABLE`, `VOICE_PREVIEW_FAILED`); never leak API key or raw provider body.

## Assign / change agent voice

```text
null voice_id ──assign──► voice_assets.id (shared row)
Agent A voice_id ──change──► different voice_assets.id
Agent B voice_id ──unchanged──► same shared row if both pick Sarah
```

1. Authorize agent update RBAC.  
2. Load agent; assert active business matches `agent.business_id`.  
3. Load target `voice_assets`; assert eligible (`business_id` null or equals agent business).  
4. Run **compatibility check** (see below). Hard block if voice `archived` or not found → `VOICE_NOT_FOUND` / `VOICE_NOT_ELIGIBLE`.  
5. Set `agent_configs.voice_id = voice_assets.id`.  
6. Do **not** auto-invoke M06 sync; UI may show “Sync agent to apply voice on provider”.  
7. Unassign = set `voice_id` to null (optional explicit API or PATCH agent config in 08.02).

**Reuse:** Multiple agents may reference the same `voice_assets.id`. No duplicate asset rows.

## Compatibility validation

Compare:

- Voice `language_codes` vs agent effective languages (agent subset or inherited business languages from M04/M05).  
- Optional provider metadata (model / capability flags in mapping.metadata).

| Outcome | Behavior |
| --- | --- |
| Full overlap or voice language unknown | Allow assign |
| Partial / no overlap | **Warn** in API response (`warnings[]`); allow assign in MVP unless product locks hard block in 08.02 |
| Voice archived / missing mapping | **Block** assign |
| Agent languages unsupported by ElevenLabs agent model | Surface warning on assign and on M06 sync (consistent with M06 language warnings) |

Warnings use customer-safe copy — same pattern as M06 sync warnings.

## M06 provider sync interaction (read-only in M08 domain)

When M06 sync runs after assign:

1. If `voice_id` set → map to `external_voice_id` via `voice_provider_mappings`.  
2. If `voice_id` null → fall back to M06 `voice_preference` heuristic (unchanged until user assigns).  
3. Sync payload must not embed raw provider catalogue JSON.

## Delete / archive voice asset

| Asset type | M08 rule |
| --- | --- |
| Provider catalogue | Platform-managed; archive when removed from provider only if **no** `agent_configs.voice_id` references. If referenced, keep row `active` or block archive with `VOICE_HAS_ASSIGNMENTS` |
| Business clone | M09 owns revoke/delete; M08 documents assign blocking only |

Hard delete of catalogue cache rows with assignments → **block**.

## Provider boundary

- `VoiceCatalogPort` methods live outside core services in adapters.  
- Secrets server-side only.  
- Provider catalogue outage: serve last cached `voice_assets` if present; surface stale indicator in UI optional.

## Errors (stable codes)

`VOICE_NOT_FOUND`, `VOICE_NOT_ELIGIBLE`, `VOICE_HAS_ASSIGNMENTS`, `VOICE_PREVIEW_FAILED`, `VOICE_CATALOG_UNAVAILABLE`, `VOICE_ASSIGNMENT_INVALID`, plus existing `AGENT_NOT_FOUND`, auth/business context codes, and sanitized `PROVIDER_*` from M06 vocabulary.
