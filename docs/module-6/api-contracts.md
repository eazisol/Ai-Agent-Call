# Module 06 — API contracts

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | Implemented — 06.02 27 August 2026 |
| Base | `/api/v1` |
| Auth | Session + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` |

## External (customer portal)

| Method | Path | RBAC | Notes |
| --- | --- | --- | --- |
| `POST` | `/agents/:id/sync` | update_agent | Provision or re-sync; returns `{ agent, sync }` |
| `GET` | `/agents/:id/provider-status` | view_agent | Local mapping + optional remote check; `{ status }` |

Agent list/get responses include `providerMappings[]` from `agent_provider_mappings`.

### Sync success

```json
{
  "agent": { "...": "AgentView" },
  "sync": {
    "provider": "elevenlabs",
    "syncStatus": "synced",
    "externalAgentId": "…",
    "lastSyncedAt": "…",
    "lastError": null,
    "warnings": []
  }
}
```

### Provider status

```json
{
  "status": {
    "provider": "elevenlabs",
    "syncStatus": "synced",
    "externalAgentId": "…",
    "lastSyncedAt": "…",
    "lastError": null,
    "remote": {
      "checked": true,
      "exists": true,
      "name": "…",
      "rawStatus": "available"
    }
  }
}
```

### Error codes (additive)

`PROVIDER_SYNC_FAILED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_AUTH_FAILED`, `PROVIDER_NOT_CONFIGURED`, `PROVIDER_SYNC_IN_PROGRESS`, plus existing `AGENT_NOT_FOUND`, `AGENT_ARCHIVED`, `FORBIDDEN`, `ACTIVE_BUSINESS_REQUIRED`.

## Internal

- `AgentProviderSyncService.syncForUser` / `getStatusForUser`
- `bestEffortDeactivateRemote` / `bestEffortDeleteRemote` (archive / hard delete hooks)
- Port: create / update / deactivate / delete / getStatus

## Configuration (server-side only)

| Env | Notes |
| --- | --- |
| `ELEVENLABS_API_KEY` | Optional in boot; required at sync → `PROVIDER_NOT_CONFIGURED` |
| `ELEVENLABS_API_BASE_URL` | Default `https://api.elevenlabs.io` |
| `ELEVENLABS_TIMEOUT_MS` | Default `20000` |
| `ELEVENLABS_DEFAULT_VOICE_*` | Female / male / neutral heuristic voice ids |

## Non-goals

- Public webhooks from ElevenLabs in M06.  
- Browser → ElevenLabs direct calls.  
- Auto-sync on every agent PATCH.
