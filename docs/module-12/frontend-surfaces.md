# Module 12 — Frontend surfaces (12.01 design)

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Submodule | 12.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 (**12.03 implemented**) |

## Objective

Minimal **tenant-scoped** call visibility in the customer portal: prove inbound calls land in the product with correct Business, Agent, status, and timing. No transcript UI, no outbound dial, no admin ops console.

## Existing prototype assets (reuse in 12.03)

| Asset | Path | M12 action |
| --- | --- | --- |
| Calls list page | `src/app/(portal)/calls/page.tsx` | Wire to tenant-scoped API |
| Calls table | `src/components/calls/CallsTable.tsx` | Extend columns for Agent, status, failure |
| Nav entry | `/calls` in portal shell | Already enabled — keep |
| Breadcrumbs | `portal-shell.tsx` | Already handles `/calls` and `/calls/[id]` |
| Detail route | `/calls/[id]` (if present) | Add or extend for event timeline snippet |

Remove reliance on prototype global `callsApi.list()` that bypasses Business context.

## Navigation

| Route | Label | Roles |
| --- | --- | --- |
| `/calls` | Calls | All members (read) |
| `/calls/[id]` | Call detail | All members (read) |

Placement: primary nav (already beside Dashboard). **Not** under Settings.

## Surfaces

### Call list — `/calls`

| Element | Behavior |
| --- | --- |
| Header | “Call History” + subtitle about incoming activity |
| Table columns | Started, Direction, Caller, Called number, Agent, Status, Duration |
| Status badge | `started`, `in_progress`, `completed`, `failed` with distinct colors |
| Failure hint | When `failed`, show `failureCode` tooltip (customer-safe label map) |
| Empty state | “No calls yet” + link to Phone numbers / Agents setup docs |
| Filters | Status dropdown; optional date range (M14 may deepen) |
| Loading / error | Standard portal `ApiNotice` patterns |

**Data source:** `GET /api/v1/calls?direction=inbound` with session + active business cookies.

**RBAC:** Read-only for all roles in M12. No delete/export.

### Call detail — `/calls/[id]`

| Section | Content |
| --- | --- |
| Summary card | Status, times, duration, caller/called, Agent name (link to agent) |
| Context | Business name (read-only), phone line E.164 |
| Provider links | Collapsed “Technical refs” for owner/admin — Twilio SID, ElevenLabs conversation id |
| Event timeline | Last N normalized `call_events` (no raw webhook JSON) |
| Transcript | Placeholder text: “Transcripts available in a future update” (M15) |

**Not in M12 detail:** recordings player, summary/sentiment, message thread, outbound actions.

## API client (12.03)

Add `src/lib/calls-api.ts` (or extend existing client module):

| Method | Backend |
| --- | --- |
| `listCalls(params?)` | `GET /calls` |
| `getCall(id)` | `GET /calls/:id` |

Follow patterns from `phone-numbers-api.ts`: typed responses, camelCase mapping, error codes.

## UX states (locked)

| State | Requirement |
| --- | --- |
| Loading | Skeleton table / detail |
| Empty | Actionable copy when no calls |
| Error | Auth, missing business, API failure |
| Success | Row click → detail |
| Failed call | Visible in list — not hidden |

## Responsive behavior

Table → stacked cards on narrow viewports (match Agents / Phone numbers patterns).

## Out of scope (frontend)

| Item | Module |
| --- | --- |
| Transcript viewer | M15 |
| Call filters/export/history depth | M14 |
| Outbound “Make call” | M13 |
| Admin global call list | M28 |
| Real-time live call indicator | Future |
| Webhook/debug tools in portal | Internal ops only |

## Manual QA hooks (12.05 preview)

Portal verification checklist:

1. Place real inbound call → row appears within reasonable poll/refresh  
2. Correct Agent name and status progression  
3. Failed routing (unassigned number) → `failed` row with code  
4. Viewer can list but not see sensitive provider ids (if redaction enabled)  
5. Cross-business: user cannot open another Business’s call id  

## Checklist mapping (12.03 forward)

| ID | UI requirement |
| --- | --- |
| P05-M12-03-01 | Basic call appears in portal |
| P05-M12-03-02 | Call status visible |
| P05-M12-03-03 | Real APIs, no blocking mocks |
| P05-M12-03-04 | Loading, empty, error states |
