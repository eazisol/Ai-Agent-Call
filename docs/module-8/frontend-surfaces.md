# Module 08 — Frontend surfaces (design — 08.01)

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Status | **Implemented** — 28 August 2026 |
| Depends on | 08.02 APIs |

## Surfaces

| Surface | Purpose | Submodule |
| --- | --- | --- |
| `/voices` | Business shared voice library list | Live |
| `/voices` (filters) | Language, accent, presentation filters | Live |
| Voice preview control | `VoicePreviewButton` on library + agent picker | Live |
| `/agents/[id]/voice` | Current assigned voice, browse library, save | Live |
| Agent list/detail | `voiceSummary` / assigned voice name | Live |

Exact route names follow portal conventions in 08.03 (`/voices` preferred; agent subnav tab **Voice** mirroring Knowledge).

## UX rules

- Library is scoped to **active Business** (show business name).  
- **Reuse clarity:** copy explains Agent A and Agent B can both use “Sarah” without duplication.  
- Filters use **presentation** language — align copy with M05 (preference, not agent identity).  
- Assign saves `voiceId` only; prompt user to **Sync agent** (M06 panel) to push voice to ElevenLabs.  
- Compatibility warnings shown inline before/after save (non-blocking in MVP unless API blocks).  
- Provider errors: sanitized messages only; loading / empty / validation / permission-denied states required.  
- Cloned/custom badge on `sourceType = business_clone` when M09 adds rows (placeholder styling OK in M08).

## Agent voice picker flow

```text
Agent Voice tab → shows current voice or “Not selected (using preference: Neutral)”
                → Browse Voice Library (modal or /voices?pickFor=agentId)
                → Preview → Select → Save
                → Optional CTA: Sync to provider (links to existing M06 sync panel)
```

## Client (08.03)

- `src/lib/voices-api.ts` — cookie-auth client mirroring backend voice permissions.  
- Extend agent API types with `voiceId` + `voiceSummary`.  
- Nav: enable **Voices** entry in portal sidebar (currently disabled placeholder if present).

## Out of UI scope for M08

- Clone upload / consent (M09)  
- Voice billing / premium locks (M25)  
- Realtime call voice switching UI (M12)  
- Admin catalogue curation tools  
- Replacing voice preference field on agent create — may remain as default filter pre-selection

## Checklist mapping (08.03 preview)

| ID | Surface |
| --- | --- |
| P03-M08-03-01 | `/voices` library |
| P03-M08-03-02 | Filters |
| P03-M08-03-03 | Audio preview |
| P03-M08-03-04 | Selected state on agent |
| P03-M08-03-05 | Assign / Browse from agent |
| P03-M08-03-10 | Same-voice reuse messaging |
