# Module 05 — Frontend surfaces (design)

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | Designed — 27 August 2026 |
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

- Enable **AI Agents** in `portal-nav` / sidebar (remove coming-soon for `/agents*`).
- Gate pages when no active business: CTA to `/businesses` or business switcher.
- Use real API client (no production mock agent list).
- Loading, validation, success, and error toasts consistent with M03/M04.

## Wizard (create)

1. Name + role label  
2. Personality + greeting + language  
3. Instructions  
4. Escalation stubs (optional)  
5. Review → create → navigate to detail  

Default status after create: **active** (per scope lock).
