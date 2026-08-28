# Module 08 — API contracts (design — 08.01)

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Status | **Implemented** — 28 August 2026 |
| Base | `/api/v1` |
| Auth | Session + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` (active business scopes library eligibility + agent assign) |

## Business Voice Library

Checklist `GET /api/v1/voices` — Business-scoped **view** of eligible assets (platform catalogue + Business-owned clones).

| Method | Path (MVP) | Purpose | RBAC |
| --- | --- | --- | --- |
| GET | `/voices` | List/search/filter eligible voices | view |
| GET | `/voices/:id` | Voice detail + assigned agents (same Business) | view |
| POST | `/voices/:id/preview` | Preview audio (optional JSON `{ sampleText? }`) | view |

### Query parameters — `GET /voices`

| Param | Notes |
| --- | --- |
| `q` | Search display_name / description |
| `language` | Filter voices supporting language code |
| `genderPresentation` | `female` \| `male` \| `neutral` — presentation filter |
| `accent` | Optional exact/prefix match |
| `sourceType` | `provider_catalog` \| `business_clone` |
| `page`, `limit` | Pagination |

Response item shape (provider-neutral):

```json
{
  "id": "uuid",
  "displayName": "Sarah",
  "description": "…",
  "languageCodes": ["en", "en-US"],
  "genderPresentation": "female",
  "accent": "American",
  "styleLabels": ["warm", "professional"],
  "sourceType": "provider_catalog",
  "businessOwned": false,
  "previewSampleText": "Hello, how can I help you today?"
}
```

Never include provider API keys, raw provider HTTP responses, or `external_voice_id` in list responses unless needed for debugging behind admin tools (not MVP portal).

## Agent voice assignment

Checklist intent: `POST /api/v1/agents/:id/voice`.

| Method | Path (MVP) | Purpose | RBAC |
| --- | --- | --- | --- |
| GET | `/agents/:agentId/voice` | Current assignment + voice summary | view |
| PUT or POST | `/agents/:agentId/voice` | Set selected voice `{ "voiceId": "uuid" }` | update |
| DELETE | `/agents/:agentId/voice` | Clear assignment (`voice_id` null) | update |

Alternative: extend existing `PATCH /agents/:id` with `voiceId` — **08.02** picks one style; dedicated route preferred for clarity and QA traceability.

### Assign response

Include assigned voice summary + optional `warnings[]` from compatibility check:

```json
{
  "agentId": "uuid",
  "voiceId": "uuid",
  "voice": { "id": "…", "displayName": "Sarah", "…": "…" },
  "warnings": [
    "Selected voice may not fully support Deutsch configured for this agent."
  ]
}
```

Cross-business agent → `AGENT_NOT_FOUND`. Ineligible voice → `VOICE_NOT_ELIGIBLE`. Missing voice → `VOICE_NOT_FOUND`.

## Agent read surfaces (M05 extension)

Agent detail/list DTOs should include when implemented in 08.02/08.03:

- `voiceId`  
- `voiceSummary` `{ id, displayName, genderPresentation, … }` when assigned  
- `voicePreference` (unchanged M05 field)

## Internal ports

### `VoiceCatalogPort`

| Method | Purpose |
| --- | --- |
| `isConfigured()` | Env / credentials present |
| `listVoices()` | Provider catalogue → normalized DTO array |
| `getVoice(externalVoiceId)` | Single voice metadata |
| `previewVoice({ externalVoiceId, sampleText? })` | Audio bytes or provider preview URL for server proxy |

First adapter: `ElevenLabsVoiceCatalogAdapter` under `providers/elevenlabs/`.

Registry alias: **VoiceCatalogProvider** (Module 0).

### Env (08.02)

| Variable | Notes |
| --- | --- |
| `ELEVENLABS_API_KEY` | Reuse M06 |
| `VOICE_CATALOG_CACHE_TTL_SECONDS` | Optional; default e.g. 3600 |

## Security notes (for 08.04)

- Preview endpoints must not accept provider credentials from client.  
- Rate-limit preview if needed to prevent abuse.  
- Tenant-safe assign: clone voices never assignable across businesses.
