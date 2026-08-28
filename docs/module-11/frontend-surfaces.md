# Module 11 — Frontend surfaces (11.01 design)

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Submodule | 11.01 — Scope & Technical Design |
| Status | **Implemented** — 28 August 2026 (portal UI in 11.03) |

## Navigation

Add portal nav entry (11.03):

| Route | Label | Roles |
| --- | --- | --- |
| `/phone-numbers` | Phone numbers | All members (read); actions gated by RBAC |

Suggested placement: primary portal nav near **Agents** (telephony operational surface).

Integrations (`/settings/integrations`) remains M10 provider health — not the phone inventory UI.

## Surfaces

### Phone number list — `/phone-numbers`

| Element | Behavior |
| --- | --- |
| Table/cards | E.164, status badge, country, capabilities icons, assigned agent name |
| Empty state | CTA to search/purchase or import when none |
| Actions (row) | Assign, Unassign, Release (role-gated) |
| Filters | Status tabs: All / Active / Provisioning / Released / Failed |
| Loading / error | Standard portal patterns from M05–M08 |

**RBAC visibility**

| Role | View list | Purchase / import | Assign | Release |
| --- | --- | --- | --- | --- |
| owner | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ |
| manager | ✓ | ✗ | ✓ | ✗ |
| viewer | ✓ | ✗ | ✗ | ✗ |

### Search & purchase — `/phone-numbers/new` (or modal wizard)

Multi-step flow:

```text
Step 1 — Search
  Country select, optional area code / contains
  → POST /phone-numbers/search
  → selectable candidate list

Step 2 — Confirm purchase
  Show E.164, capabilities, monthly cost if returned
  Confirm checkbox
  → POST /phone-numbers/purchase

Step 3 — Success
  Link to assign agent or return to list
```

Handle `TELEPHONY_NUMBER_UNAVAILABLE` with retry search. Show provisioning spinner if backend returns `provisioning` briefly.

### Import — `/phone-numbers/import`

| Field | Input |
| --- | --- |
| Phone number | E.164 with validation |
| Friendly name | Optional |

Copy explains: **must already exist in platform Twilio account** — not porting.

→ `POST /phone-numbers/import`

### Assignment UI

**Option A (recommended MVP):** Row action **Assign agent** → modal with agent dropdown (active business agents only).

**Option B:** Dedicated `/phone-numbers/[id]/assign` page.

→ `POST /phone-numbers/:id/assign`

Show current assignment on list/detail. **Unassign** clears with confirm dialog.

Cross-business errors surface as toast with `PHONE_ASSIGNMENT_CROSS_BUSINESS` message.

### Release confirmation — destructive

Modal required:

- Warning: releases number at provider; cannot receive calls  
- Block if assigned unless user checks "Unassign first" or separate unassign step  
- Type E.164 or click **Confirm release**  
- → `DELETE /phone-numbers/:id` with `{ confirm: true }`

### Status badges

| Status | Badge variant |
| --- | --- |
| `active` | success / Connected |
| `provisioning` | warning / Pending |
| `release_pending` | warning |
| `released` | muted |
| `failed` | destructive |

Reuse `StatusBadge` pattern from agents/voices modules.

## API client (11.03)

New file: `src/lib/phone-numbers-api.ts`

| Function | API |
| --- | --- |
| `list(params?)` | GET `/phone-numbers` |
| `search(body)` | POST `/phone-numbers/search` |
| `purchase(body)` | POST `/phone-numbers/purchase` |
| `importNumber(body)` | POST `/phone-numbers/import` |
| `assign(id, agentId)` | POST `/phone-numbers/:id/assign` |
| `unassign(id)` | POST `/phone-numbers/:id/unassign` |
| `release(id)` | DELETE `/phone-numbers/:id` |

Credentials: `include` cookies. Handle standard error envelope.

## Components (11.03 targets)

| Component | Purpose |
| --- | --- |
| `phone-numbers-list.tsx` | List + filters |
| `phone-number-status-badge.tsx` | Status mapping |
| `phone-number-search-panel.tsx` | Search form + results |
| `phone-number-purchase-dialog.tsx` | Confirm purchase |
| `phone-number-import-form.tsx` | Import flow |
| `phone-number-assign-dialog.tsx` | Agent picker |
| `phone-number-release-dialog.tsx` | Destructive confirm |

## UX states (VS-GLOBAL-08)

Each surface must implement:

- Loading skeleton  
- Empty state with guidance  
- Validation errors (invalid E.164, missing country)  
- Provider errors (`TELEPHONY_*`, `PROVIDER_NOT_CONFIGURED`) with retry  
- Success toasts + list refresh  

## Out of scope (11.03)

| Item | Module |
| --- | --- |
| Inbound call history detail | M12 / M14 |
| Live call indicator | M12 |
| Twilio credential editing | Never in frontend |
| Billing / per-number cost dashboard | M25–M26 |

## Link from Integrations (optional enhancement)

On `/settings/integrations`, when M10 Connected, add text link: **Manage phone numbers →** `/phone-numbers` (11.03 nice-to-have, not gate-blocking).
