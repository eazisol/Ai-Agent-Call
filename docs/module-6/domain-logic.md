# Module 06 — Domain logic (design)

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | Designed — 27 August 2026 |

## Sync lifecycle

```text
not_provisioned ──sync──► pending ──success──► synced
                              │
                              └──failure──► error ──retry──► pending …
```

1. Authorize (membership + business + RBAC).  
2. Load local agent + effective language/voice/prompt projection.  
3. Upsert mapping row to `pending` (clear or preserve prior `external_agent_id`).  
4. Call `VoiceAgentSyncPort.create` or `update`.  
5. On success: store `external_agent_id`, `synced`, `last_synced_at`, clear `last_error`; attach non-blocking **warnings** in API response if needed.  
6. On failure: `error` + sanitized `last_error`; never delete local agent config.

## Field mapping (intent)

| Local | Provider intent |
| --- | --- |
| name / role_label / personality / greeting / instructions | Agent display + system/first-message/prompt bundle |
| languages + language + detection/switching | Provider language / multilingual settings when supported |
| voice_preference | Pick a default catalog voice matching preference (MVP heuristic) |
| status archived | Prefer deactivate remote; hard delete → delete remote best-effort |

## Errors

Map timeouts, 401/403 (misconfig), 404 (missing remote), 429, 5xx into stable application codes (e.g. `PROVIDER_UNAVAILABLE`, `PROVIDER_AUTH_FAILED`, `PROVIDER_SYNC_FAILED`) with safe messages. Log correlation id + provider request id if available — **not** API keys.

## Idempotency

- One mapping per `(agent_id, elevenlabs)`.  
- Retry after partial success: if `external_agent_id` set, **update** not create.  
- Concurrent syncs: serialize per agent (DB row lock or Redis lock in 06.02).
