# Module 07 — Frontend surfaces (implemented)

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Status | **Implemented** — 27 August 2026 |
| Implementation | 07.03 |

## Surfaces

| Surface | Purpose | Status |
| --- | --- | --- |
| `/knowledge` | Business shared knowledge library list | Live |
| `/knowledge/new` | File / URL / Text / FAQ create (segmented tabs) | Live |
| `/knowledge/[id]` | Detail: metadata, sync panel, assigned agents, edit/resync/archive/delete | Live |
| `/agents/[id]/knowledge` | Multi-select assign from Business library; “Manage Business Knowledge” link | Live |
| Sync badges | Not synced / Pending / Synced / Error (+ Needs sync after edit) | Live |

## UX rules

- Library is **Business**-scoped (show active business name).  
- Do not force re-upload per agent.  
- Destructive delete: warn when assignments exist; block until unassigned.  
- Provider errors: sanitized only.  
- Loading / empty / validation / permission states required.

## Client

- `src/lib/knowledge-api.ts` — cookie-auth API client + RBAC helpers (mirrors backend `knowledge-permissions.ts`).

## Out of UI scope for M07

- Voice library (M08)  
- Call transcript → knowledge gap (M21)  
- Embedding search playground  
- Translation UI
