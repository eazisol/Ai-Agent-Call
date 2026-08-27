# Module 06 — Frontend surfaces

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | Implemented — 06.03 27 August 2026 |

## Surfaces

| Surface | Purpose |
| --- | --- |
| Agent list (`/agents`) | Provider sync status column from `providerMappings` |
| Agent overview (`/agents/[id]`) | `AgentProviderSyncPanel` — status badge, last synced, provider id, remote check |
| Sync / Retry button | Owner/admin/manager; `POST /agents/:id/sync` (45s timeout) |
| Error panel | Sanitized `lastError` / API message only |
| Compatibility warnings | Soft callouts from sync response `warnings[]` |

## UX rules (implemented)

- Local agent editing is not blocked by provider `error`.  
- Loading / disabled states during sync.  
- Empty: “Not synced yet” + Sync CTA.  
- Archived agents cannot sync until unarchived.  
- Viewers see status but not Sync CTA.  
- Never display API keys or ElevenLabs secrets (none in frontend env).

## API client

`agentsApi.sync` / `agentsApi.providerStatus` in `src/lib/agents-api.ts` — cookie session only; no provider credentials in browser.

## Out of UI scope for M06

- Voice library picker (M08)  
- Clone voice flow (M09)  
- Knowledge sync UI (M07)
