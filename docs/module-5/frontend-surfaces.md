# Module 05 — Frontend surfaces (design)

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | Implemented — 27 August 2026 (05.03) |
| Implementation | 05.03 |

## Routes

| Route | Purpose |
| --- | --- |
| `/agents` | List agents for active business; empty / “select a business” states |
| `/agents/new` | Multi-step create wizard (identity → behavior → escalation → review) |
| `/agents/[id]` | Overview: name, status, language, last updated; activate/deactivate controls |
| `/agents/[id]/behavior` | Role, personality, greeting, language, instructions editor |
| `/agents/[id]/escalation` | Escalation stub toggles and contact fields |

## Portal chrome

- **AI Agents** enabled in portal nav (`/agents*`).
- Gate pages when no active business: CTA to `/businesses`.
- Real API client: `src/lib/agents-api.ts` (no mock agent list).
- Loading, validation, success, and error states aligned with M03/M04.

## Delivered routes (05.03)

| Route | Page |
| --- | --- |
| `/agents` | List + archived toggle |
| `/agents/new` | Wizard: identity → behavior/language/voice → escalation → review |
| `/agents/[id]` | Overview + activate/deactivate/archive/unarchive/delete |
| `/agents/[id]/behavior` | Name, role, personality, greeting, instructions, language/voice |
| `/agents/[id]/escalation` | Escalation stub settings |

## Wizard (create)

1. Name + role label  
2. Personality + greeting + language  
3. Instructions  
4. Escalation stubs (optional)  
5. Review → create → navigate to detail  

Default status after create: **active** (per scope lock).
