# Module 06 — API contracts (design)

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | Designed — 27 August 2026 |
| Base | `/api/v1` |
| Auth | Session + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` |

## External (customer portal)

| Method | Path | RBAC | Notes |
| --- | --- | --- | --- |
| `POST` | `/agents/:id/sync` | update_agent | Provision or re-sync; returns agent + provider mapping summary + optional warnings |
| `GET` | `/agents/:id/provider-status` | view_agent | Local mapping + optional lightweight remote check |

### Response shapes (intent)

```json
{
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

`externalAgentId` may be omitted for viewers if product prefers (default: **show id is OK**; never show API keys).

### Error codes (additive)

`PROVIDER_SYNC_FAILED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_AUTH_FAILED`, `PROVIDER_NOT_CONFIGURED`, plus existing `AGENT_NOT_FOUND`, `FORBIDDEN`, `ACTIVE_BUSINESS_REQUIRED`.

## Internal

- Application service methods used by HTTP layer and future job runners.  
- Port methods: create / update / deactivate / delete / getStatus.

## Non-goals

- Public webhooks from ElevenLabs in M06 (defer unless required for status).  
- Browser → ElevenLabs direct calls.
