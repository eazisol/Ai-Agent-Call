# Module 05 — API contracts

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | Implemented — 27 August 2026 |
| Base | `/api/v1` |
| Auth | Session + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` required |

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/agents` | Create under active business; wraps `{ agent }` |
| `GET` | `/agents` | List; `?includeArchived=true` |
| `GET` | `/agents/:id` | Detail |
| `PATCH` | `/agents/:id` | Update behavior / escalation / unarchive via `status` |
| `POST` | `/agents/:id/activate` | `status = active` |
| `POST` | `/agents/:id/deactivate` | `status = inactive` |
| `POST` | `/agents/:id/archive` | `status = archived` |
| `DELETE` | `/agents/:id` | Hard delete when allowed |

## Error codes

`ACTIVE_ORGANIZATION_REQUIRED`, `ACTIVE_BUSINESS_REQUIRED`, `AGENT_NOT_FOUND`, `AGENT_ARCHIVED`, `AGENT_HAS_DEPENDENTS`, `AGENT_NAME_CONFLICT`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_AGENT`, `INVALID_LANGUAGE`, `BUSINESS_ARCHIVED`.

## Provider

None — no ElevenLabs calls in M05.
