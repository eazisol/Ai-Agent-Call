# Module 06 — Domain logic

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | Implemented — 06.02 27 August 2026 |

## Sync lifecycle

```text
not_provisioned ──sync──► pending ──success──► synced
                              │
                              └──failure──► error ──retry──► pending …
```

1. Authorize (membership + business + RBAC `update_agent`).  
2. Load local agent + effective language/voice/prompt projection.  
3. Upsert mapping row to `pending` under row lock; reject if another sync is in progress (< 60s).  
4. Call `VoiceAgentSyncPort.create` or `update` (create when `external_agent_id` is null).  
5. On success: store `external_agent_id`, `synced`, `last_synced_at`, clear `last_error`; return non-blocking **warnings**.  
6. On failure: `error` + sanitized `last_error`; never delete local agent config.

**Explicit sync only** — agent PATCH does not auto-sync.

## Field mapping

| Local | Provider |
| --- | --- |
| name / role_label / personality / greeting / instructions | ConvAI name + first_message + prompt bundle |
| languages + language | Primary language on agent; unsupported codes → warning, local config unchanged |
| voice_preference | Default catalog voice id (env-overridable female/male/neutral) |
| status archived | Best-effort `deactivate` (no-op on ConvAI today; remote retained) |
| hard delete | Best-effort remote `DELETE` then local cascade |

## Errors

| Code | When |
| --- | --- |
| `PROVIDER_NOT_CONFIGURED` | Missing `ELEVENLABS_API_KEY` at sync time |
| `PROVIDER_AUTH_FAILED` | Provider 401/403 |
| `PROVIDER_UNAVAILABLE` | Timeout / 429 / 5xx |
| `PROVIDER_SYNC_FAILED` | Other provider failures / unexpected payload |
| `PROVIDER_SYNC_IN_PROGRESS` | Concurrent sync within stale window |
| `AGENT_ARCHIVED` | Sync attempted on archived agent |

Messages are customer-safe; API keys and raw provider bodies are never stored or returned.

## Idempotency

- One mapping per `(agent_id, elevenlabs)`.  
- Retry: if `external_agent_id` set → **update**, else **create**.  
- Concurrent syncs: pessimistic lock + pending guard.

## Port boundary

- `VoiceAgentSyncPort` — provisioning/sync (M06).  
- `VoiceAgentProviderPort` — realtime WebSocket / OpenAI prototype (unchanged, separate).
