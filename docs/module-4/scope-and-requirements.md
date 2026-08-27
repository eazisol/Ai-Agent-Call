# Module 04 — Business Management: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Submodule | 04.01 — Scope & Technical Design |
| Status | Requirements locked — 27 August 2026 |
| Date | 27 August 2026 |
| Depends on | M02 Complete, M03 Complete |
| Target | MVP |

## 1. Objective

Introduce **businesses** as the operational unit inside an organization so a team can **list**, **create**, **view**, **update**, and **archive** client businesses with **industry**, **contact information**, **business hours**, **timezone**, **default language**, and **status/settings** — all **organization-scoped** with M03 RBAC and demonstrable cross-tenant denial. Replace portal mock business data with real APIs and wire the business switcher to a persisted active-business context.

A business is what later modules attach agents, phone numbers, knowledge, and calls to (`business_id` per Module 0 tenant-key strategy).

## 2. Boundaries

### In scope (M04)

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P01-M04-01-01 | Objective & boundaries | This document; M04 MVP locked |
| P01-M04-01-02 | List businesses | Authenticated org member lists businesses for the **active organization** only |
| P01-M04-01-03 | Create business | Privileged member creates a business under the active org; returns created record |
| P01-M04-01-04 | View business | Org member reads one business that belongs to their org; non-members denied |
| P01-M04-01-05 | Update business | Privileged member updates allowed fields; viewers denied |
| P01-M04-01-06 | Archive/delete per policy | **Archive (soft)** is the MVP delete path; hard delete only when no blocking dependents (see policy below) |
| P01-M04-01-07 | Industry selection | Required or strongly encouraged industry from a fixed MVP enum + optional free-text when `other` |
| P01-M04-01-08 | Contact information | `email`, `phone`, optional `website`; validated formats |
| P01-M04-01-09 | Business hours | Weekly schedule (Mon–Sun) stored in `business_hours`; editor in UI |
| P01-M04-01-10 | Timezone | IANA timezone string on business; used for hours display and future scheduling |
| P01-M04-01-11 | Default language | BCP-47 language code (e.g. `en`, `en-US`); MVP list or validated string |
| P01-M04-01-12 | Business status/settings | `status`: `active` \| `archived`; extended flags in `business_settings` where appropriate |
| P01-M04-01-13 | Out of scope documented | Section 3 below |

### Decisions locked in 04.01

| Topic | Decision |
| --- | --- |
| Tenant boundary | Every business row has required **`organization_id`** FK → `organizations`. All queries filter by org membership |
| Operational key | **`business_id`** remains the FK target for calls, AI configs, and future agents/numbers/knowledge |
| Active org context | Business APIs require valid M01 session **and** active org from **`eazi_org`** cookie (re-validated server-side), same pattern as M02 org routes |
| Active business context | HTTP-only cookie **`eazi_biz`** (business UUID); set/cleared by explicit switch/clear API after org+membership+business ownership check |
| API shape | Flat routes under `/api/v1/businesses*` (checklist contract); server derives org from active cookie, never trusts client org id in body alone |
| Archive policy | Default mutation is **`status = archived`** (soft). **`DELETE`** allowed only when business has **no** dependent rows that block removal (M04 checks `calls`, `ai_configs`; future modules add checks). Otherwise return **`409 BUSINESS_HAS_DEPENDENTS`** and instruct archive |
| Legacy prototype rows | Pre-M04 `businesses` without `organization_id` are **not exposed** via API; migration in 04.02 adds column + optional one-time dev backfill script documented, not production auto-guess |
| Industry (MVP) | Enum: `healthcare`, `restaurant`, `retail`, `professional_services`, `hospitality`, `other`. When `other`, optional `industry_label` (max 100 chars) |
| Business hours model | One row per `(business_id, day_of_week)` where `day_of_week` is `0=Sunday` … `6=Saturday`. Fields: `is_closed`, `opens_at`, `closes_at` (time, nullable when closed). Times interpreted in business `timezone` |
| Hours validation | `opens_at < closes_at` when not closed; at most one open interval per day in MVP (no split shifts) |
| Timezone validation | Must be valid IANA zone (library validation in 04.02) |
| Language validation | Must match allowed MVP list (`en`, `es`, `fr`, `de`, `pt`, `ar`, `hi`, `ur`) or validated BCP-47 pattern — exact list locked in 04.02 DTO |
| Contact validation | Email required; phone optional but validated if present; website optional URL |
| `business_settings` | One-to-one with business. MVP fields: `address_line1`, `address_line2`, `city`, `region`, `postal_code`, `country` (all optional). Room for future notification/voice prefs without widening `businesses` |
| Prototype `business_prompt` | Column **retained** on `businesses` for M00/M05 compatibility; **not editable in M04 UI** (AI agent prompts belong to M05) |
| RBAC | Reuse M03 org roles; business permissions are **code-defined** (extend pattern of `organization-permissions.ts`) |
| PostgreSQL RLS | **Deferred** — application scoping + tests mandatory |
| API prefix / errors | `/api/v1` + M00 error envelope |
| Auth | `AuthGuard` on all business routes; unverified users blocked |
| External providers | **None** in M04 |

### MVP permission matrix (business actions)

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List businesses | ✓ | ✓ | ✓ | ✓ |
| View business detail | ✓ | ✓ | ✓ | ✓ |
| Create business | ✓ | ✓ | ✓ | ✗ |
| Update business / hours / settings | ✓ | ✓ | ✓ | ✗ |
| Archive business | ✓ | ✓ | ✗ | ✗ |
| Hard delete (no dependents) | ✓ | ✓ | ✗ | ✗ |
| Switch active business (`eazi_biz`) | ✓ | ✓ | ✓ | ✓ |

Managers can operate day-to-day business profile data but cannot archive/delete. Viewers are read-only.

### Planned API contracts (for 04.02; not implemented in 04.01)

Checklist-required:

- `POST /api/v1/businesses` — create under active org (body: core fields + optional hours/settings)
- `GET /api/v1/businesses` — list for active org; default excludes `archived` unless `?includeArchived=true`
- `GET /api/v1/businesses/:id` — read one (org-scoped)
- `PATCH /api/v1/businesses/:id` — update core fields, settings, and/or hours
- `DELETE /api/v1/businesses/:id` — hard delete when allowed; otherwise `409`

Supporting (active business — mirror M02 org active pattern):

- `GET /api/v1/businesses/active` — active business after org+membership+ownership re-check, or `null`
- `POST /api/v1/businesses/active` — body `{ businessId }` → sets `eazi_biz` after checks
- `DELETE /api/v1/businesses/active` — clears `eazi_biz`

Optional convenience (may fold into PATCH in 04.02 if simpler):

- `POST /api/v1/businesses/:id/archive` — sets `status = archived`, clears active cookie if archived business was active

### Planned data (for 04.02)

**`businesses`** (extend M00 baseline):

- `id` (uuid), `organization_id` (uuid, required, FK → organizations **ON DELETE CASCADE**)
- `name`, `industry`, `industry_label` (nullable), `website` (nullable)
- `email`, `phone_number` (nullable)
- `timezone`, `default_language`
- `status` (`active` \| `archived`, default `active`)
- `business_prompt` (legacy, nullable — no M04 UI)
- `created_at`, `updated_at`
- Index: `(organization_id, status)`, unique optional later: `(organization_id, lower(name))` where active — choose in 04.02

**`business_settings`** (new, 1:1):

- `business_id` (PK, FK → businesses **ON DELETE CASCADE**)
- `address_line1`, `address_line2`, `city`, `region`, `postal_code`, `country` (all nullable text)
- `created_at`, `updated_at`

**`business_hours`** (new, 1:N):

- `id`, `business_id` (FK → businesses **ON DELETE CASCADE**)
- `day_of_week` (smallint 0–6), `is_closed` (bool), `opens_at`, `closes_at` (time, nullable)
- Unique `(business_id, day_of_week)`

Foreign keys must not allow a business to reference an organization the creator is not a member of (enforced in service layer + FK on organization_id only).

### Frontend surfaces (for 04.03)

| Route | Purpose |
| --- | --- |
| `/businesses` | Business list (active org); empty state when none |
| `/businesses/new` | Create-business flow |
| `/businesses/[id]` | Business details |
| `/businesses/[id]/settings` | Edit profile, contact, timezone, language, status |
| `/businesses/[id]/hours` | Business-hours editor (or tab within settings) |

Portal chrome:

- Wire **`BusinessSwitcher`** to real list/active/switch APIs
- Enable routes in `portal-nav.ts` (remove coming-soon toast for business flows)
- Replace mock entries in `portal-shell.ts` for production paths

First-business UX: user with org but zero businesses sees guided empty state (link to create); **does not** block org-level routes like `/team`.

### Security requirements (preview for 04.04)

- Every business query/mutation scoped to active `organization_id` + membership
- Cross-tenant read/update/archive denied (prefer **404** for foreign org business ids)
- Role checks on create/update/archive/delete
- Archived businesses cannot be set active without reactivation (PATCH status → `active`)
- No secrets or cross-tenant identifiers in client logs
- Isolation tests: Org A business ids invisible to Org B members

## 3. Out of scope (explicit — do not pull forward)

Documented for P01-M04-01-13:

- AI agents, prompts, greetings, voice config (**M05**, **M06**, **M08**)
- Editing prototype `business_prompt` in UI (**M05**)
- Phone numbers / Twilio provisioning (**M10**, **M11**)
- Knowledge base documents (**M07**)
- Calls list tenant-scoping refactor (**M12**, **M14** — M04 only ensures `business_id` ownership is correct on the business record)
- Appointment/reservation tools (**M18**, **M19**)
- CRM customers per business (**M20**)
- Billing, plans, business limits (**M25+**)
- Admin/support cross-tenant business access (**M28**)
- Multi-location franchise hierarchies / business groups
- Custom industries admin console (MVP enum only)
- Split-shift / exception calendars / holiday overrides for hours (single interval per day only)
- PostgreSQL RLS policies
- Business-level team roles (permissions stay at org level in M04)
- Geocoding / maps / address validation providers
- Import/export CSV
- White-label per-business branding

## 4. Non-goals for this submodule

04.01 only locks scope and requirements. It does **not** create migrations, Nest business controllers, or UI pages. Those begin in **04.02+**.

## 5. Definition of Done for Submodule 04.01

- [x] Objective and boundaries confirmed (`P01-M04-01-01`)
- [x] List/create/view/update/archive capabilities defined (`P01-M04-01-02` … `P01-M04-01-06`)
- [x] Industry, contact, hours, timezone, language, status/settings decisions recorded (`P01-M04-01-07` … `P01-M04-01-12`)
- [x] Out of scope documented (`P01-M04-01-13`)
- [x] Checklist items `P01-M04-01-01` … `P01-M04-01-13` marked complete after this document is accepted

## 6. Next submodule

**04.02 — Backend, Persistence & API** — migration extending `businesses`, new `business_settings` / `business_hours`, Nest module + domain rules, RBAC, and the API contracts above.
