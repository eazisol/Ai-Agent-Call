# Module 09 — Frontend surfaces (09.01)

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Submodule | 09.03 (implemented) |
| Status | **Implemented** — 28 August 2026 |

## Navigation

| Surface | Route | Purpose |
| --- | --- | --- |
| Clone list / create entry | `/voices/clones` | Business clone dashboard |
| Create wizard | `/voices/clones/new` | Consent → upload → submit |
| Clone detail | `/voices/clones/[id]` | Status, samples, retry, revoke |
| Library (existing) | `/voices` | Shows `Custom` badge on `business_clone` |
| Agent voice (existing) | `/agents/[id]/voice` | Pick clone from library — no change to flow |

Enable `/voices/clones` in `portal-nav.ts` when 09.03 starts.

## Create wizard (3 steps)

### Step 1 — Consent

- Display fixed consent copy (version `m09-v1`); hash computed client-side or served from static snippet.
- Checkbox: “I confirm I have rights to clone this voice…”
- Record via `POST /voices/clones/:id/consent` after draft created.

### Step 2 — Samples

- Drag-drop + file picker (audio: mp3, wav, m4a, webm).
- Optional: in-browser record (MediaRecorder) → upload as file.
- Show per-file size limit + total sample count.
- List uploaded samples with remove (draft only).

### Step 3 — Review & submit

- Display name, sample count, consent timestamp.
- Submit → processing spinner → redirect to detail or library on `ready`.
- On `failed`, show `lastError` + Retry button.

## Clone list page

- Table: name, status badge, agents using, created date.
- Actions: View, Revoke (ready), Delete (draft/failed/revoked unassigned).
- Empty state → CTA “Create custom voice”.

## Clone detail page

- Status timeline (draft → processing → ready/failed).
- Linked library voice link when ready (“Open in Voice Library”).
- Assigned agents list with links to agent voice tab.
- Revoke modal: warns if agents still assigned.

## Library & agent voice (M08 extensions)

- **Custom** badge already styled for `business_clone`.
- Filter: `sourceType=business_clone` optional.
- Agent voice picker: no UX change — clones appear in same table once `ready`.

## States

| State | UX |
| --- | --- |
| Loading | Skeleton / `LoadingState` |
| Empty | CTA to create first clone |
| Processing | Poll `GET /voices/clones/:id/status` every 3s, max 2 min then manual refresh |
| Failed | Error + retry |
| Revoked | Read-only detail; not in assign picker |

## Out of scope for 09.03 UI

- Premium paywall / plan gating UI (backend flag only).
- PVC long-running training progress bar.
- Sample waveform editor.

## API client

New `src/lib/voice-clones-api.ts` mirroring `voices-api.ts` patterns (credentials, error envelope).

## Permissions in UI

- Hide create/submit/revoke for viewer role.
- Match M08 `canAssignAgentVoice` for assign flows.
