# Module 06 — Frontend surfaces (design)

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Status | Designed — 27 August 2026 |
| Implementation | 06.03 |

## Surfaces

| Surface | Purpose |
| --- | --- |
| Agent overview (`/agents/[id]`) | Provider sync status badge (Not provisioned / Pending / Synced / Error) |
| Sync / Retry button | Visible to owner/admin/manager; calls `POST …/sync` |
| Error panel | Shows sanitized `lastError` only; no raw JSON dumps |
| Compatibility warnings | Soft callouts after sync when languages/voice limited by provider |

## UX rules

- Do not block editing local agent config when provider is in `error`.  
- Loading / disabled states during sync.  
- Empty: “Not synced yet” + Sync CTA.  
- Never display API keys or ElevenLabs dashboard secrets.

## Out of UI scope for M06

- Voice library picker (M08)  
- Clone voice flow (M09)  
- Knowledge sync UI (M07)
