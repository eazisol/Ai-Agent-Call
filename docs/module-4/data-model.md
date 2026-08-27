# Module 04 — Data model (Business Management)

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Submodule | 04.02 |
| Status | Implemented — 27 August 2026 |

## Tables

### `businesses` (extended from M00 baseline)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations | Nullable for legacy prototype rows; **required for all API-created businesses**; `ON DELETE CASCADE` |
| `name` | varchar(150) | Required |
| `industry` | varchar | Check: `healthcare\|restaurant\|retail\|professional_services\|hospitality\|other` |
| `industry_label` | varchar(100) | Optional; used when industry = `other` |
| `website` | varchar(255) | Optional |
| `email` | varchar(150) | Required |
| `phone_number` | varchar(30) | Optional |
| `timezone` | varchar(80) | IANA; default `UTC` |
| `default_language` | varchar(20) | Initial/fallback only; must be in `languages` |
| `languages` | jsonb | Supported language codes the agent may use |
| `language_detection_enabled` | boolean | Auto-detect caller language among `languages` (runtime in M06) |
| `language_switching_enabled` | boolean | Mid-call switch among `languages` when provider allows (M06) |
| `status` | varchar(20) | `active` \| `archived` |
| `business_prompt` | text | Legacy; retained for M05 — not editable via M04 API |
| `created_at` / `updated_at` | timestamptz | |

Index: `(organization_id, status)`.

### `business_settings` (1:1)

| Column | Type |
| --- | --- |
| `business_id` | uuid PK FK → businesses CASCADE |
| `address_line1`, `address_line2`, `city`, `region`, `postal_code`, `country` | nullable varchar |
| timestamps | |

### `business_hours` (1:N, max 7)

| Column | Type |
| --- | --- |
| `id` | uuid PK |
| `business_id` | uuid FK CASCADE |
| `day_of_week` | smallint 0–6 (Sun–Sat) |
| `is_closed` | boolean |
| `opens_at` / `closes_at` | time, nullable when closed |
| Unique | `(business_id, day_of_week)` |

## Migration

`1756070000000-BusinessManagement` — alters `businesses`, creates settings/hours. Legacy free-text `industry` values map to `other` + `industry_label`.

## Ownership keys

- Security boundary: `organization_id` + membership (M02/M03)
- Operational key: `business_id` for future agents/calls/numbers
- Client-supplied org/business IDs never trusted without membership + ownership checks
- Legacy rows with `organization_id IS NULL` are **not** returned by M04 APIs
