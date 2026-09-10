# RESET-03 — Fresh Real Organization + Business Setup

**Status:** `PASS`

**UTC:** org `2026-09-03T08:37:09Z`, business `2026-09-03T08:38:40Z`

## Flow used

| Step | Route / API |
|---|---|
| Org create | `/onboarding/organization` → `POST /api/v1/organizations` |
| Business create | `/businesses/new` → `POST /api/v1/businesses` |
| Same-origin | `https://eazi-ai-call.vercel.app/api/backend/*` |

No SQL inserts. No seed scripts. No agent/provider/phone setup.

## Owner

| Field | Value |
|---|---|
| User ID | `1a8ad4ad-ffa3-4f8d-a611-463c45861e43` |
| Email | `ahmadg03025249091@gmail.com` |
| Verified | yes |
| Role | **owner** (via `organization_members`) |

## Organization

| Field | Value |
|---|---|
| ID | `35e6178e-5d74-4188-85ac-bee124adc6d5` |
| Name | EaziAICall Production |
| Slug | `eaziaicall-production` |

## Membership

| Field | Value |
|---|---|
| Membership ID | `d767cea5-8e3a-4bab-9f07-dda7d066eb4f` |
| User | same owner |
| Organization | EaziAICall Production |
| Role | owner |
| Membership count | **1** |

## Business

| Field | Value |
|---|---|
| ID | `3c0680ed-320d-48ae-bf57-c129c03676b1` |
| Name | EaziAICall Production |
| Organization | `35e6178e-5d74-4188-85ac-bee124adc6d5` |
| Status | active |
| Industry | professional_services |
| Email | owner Gmail |
| Timezone | Asia/Karachi |
| Language | en |
| Phone | supplied by operator (`+923025249091`) |
| Website | null (skipped) |

## Authorization / same-origin (operator Network)

- `/businesses` 200
- `/api/backend/auth/me` 200
- `/api/backend/organizations` 200
- `/api/backend/organizations/active` 200
- `/businesses/{id}/settings` 200
- Host: `eazi-ai-call.vercel.app` (no ALB hostname)

## Database counts

| Table | Count |
|---|---:|
| users | 1 |
| organizations | 1 |
| organization_members | 1 |
| businesses | 1 |
| business_settings | 1 (auto) |
| business_hours | 7 (auto, full week) |
| ai_agents | 0 |
| agent_provider_mappings | 0 |
| phone_numbers | 0 |
| phone_number_assignments | 0 |
| calls | 0 |
| call_events | 0 |
| eazi_ai_call_migrations | 16 |

## Code / infra

| Item | Result |
|---|---|
| Code | UNCHANGED for this phase |
| Schema | UNCHANGED |
| Migrations | NOT RUN |
| External providers | UNCHANGED |
| Secrets | not exposed |
| M12 | P05-M12-GATE = OPEN |

## Next

**RESET-04 — Fresh AI Agent + Voice + Knowledge Setup**

**STOP.** Do not start RESET-04 / AWS-D15 / D16 until instructed.
