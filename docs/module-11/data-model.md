# Module 11 — Data model (11.01 design)

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Submodule | 11.01 — Scope & Technical Design |
| Status | **Implemented** — 28 August 2026 (migration `1756130000000-PhoneNumberManagement`) |

## New tables

### `phone_numbers`

Canonical Business-owned phone inventory.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `business_id` | uuid FK → `businesses.id` ON DELETE RESTRICT | **Required** operational ownership |
| `provider` | varchar(50) | e.g. `twilio` |
| `provider_number_id` | varchar(150) | Twilio IncomingPhoneNumber SID after provision/import |
| `phone_number_e164` | varchar(30) | Normalized E.164 |
| `country` | varchar(2) | ISO 3166-1 alpha-2 |
| `capabilities` | jsonb | `{ voice, sms, mms }` booleans |
| `status` | varchar(30) | Lifecycle enum (below) |
| `friendly_name` | varchar(64) nullable | Display label |
| `metadata` | jsonb | Non-secret ops metadata, idempotency keys |
| `created_at` / `updated_at` | timestamptz | |

**Status enum (MVP):**

| Value | Meaning |
| --- | --- |
| `provisioning` | Provider purchase in progress |
| `active` | Usable in product + assignable |
| `release_pending` | Provider release in progress |
| `released` | Provider released; historical row retained |
| `failed` | Provision/configure failed |

**Indexes / constraints**

| Constraint | Purpose |
| --- | --- |
| `UNIQUE (provider, provider_number_id)` WHERE status NOT IN ('released') | Prevent duplicate canonical provider rows |
| `UNIQUE (business_id, phone_number_e164)` WHERE status IN ('provisioning','active','release_pending') | Prevent duplicate active inventory per Business |
| `INDEX (business_id, status)` | List/filter |
| `INDEX (phone_number_e164)` | M12 inbound lookup |

**Tenant rule:** Every query MUST filter by `business_id` from authenticated active business context. Organization derived via join to `businesses.organization_id` — no `organization_id` column on this table for MVP.

### `phone_number_assignments`

Links a phone number to an agent within the same Business.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `phone_number_id` | uuid FK → `phone_numbers.id` ON DELETE RESTRICT | |
| `agent_id` | uuid FK → `agents.id` ON DELETE RESTRICT | |
| `status` | varchar(20) | `active` \| `ended` |
| `assigned_by_user_id` | uuid nullable FK → `users.id` | Audit |
| `assigned_at` | timestamptz | |
| `unassigned_at` | timestamptz nullable | Set when ended |
| `created_at` / `updated_at` | timestamptz | |

**Indexes / constraints**

| Constraint | Purpose |
| --- | --- |
| `UNIQUE (phone_number_id) WHERE status = 'active'` | MVP: at most one active assignment per number |
| `INDEX (agent_id, status)` | List numbers by agent |
| `INDEX (phone_number_id, status)` | Lookup active assignment |

**Integrity (application + optional DB trigger in 11.02):**

- `phone_numbers.business_id` must equal `agents.business_id` for the assigned agent.
- Assign only when `phone_numbers.status = 'active'` and agent not archived.

## Relationship to M10 `telephony_provider_mappings`

| Table | Scope | M11 usage |
| --- | --- | --- |
| `telephony_provider_mappings` | Platform provider audit (no business_id) | Written by M10 adapter on purchase; `TelephonyStatusService.countActive` |
| `phone_numbers` | Business canonical inventory | **Source of truth** for portal + M12 routing |

M11 stores the same Twilio SID in `phone_numbers.provider_number_id`. No required FK between tables for MVP — reconcile by `(provider, provider_number_id)`.

On release:

1. `phone_numbers.status` → `released`
2. `telephony_provider_mappings.status` → `released` (via port/adapter)

## Entity diagram

```text
organizations
    └── businesses
            ├── agents
            ├── phone_numbers  (business_id)
            │       └── phone_number_assignments  (phone_number_id → agent_id)
            └── (M12 uses phone_numbers + assignments for routing)

telephony_provider_mappings  (platform audit — M10)
```

## Migration plan (11.02)

Suggested migration name: `1756130000000-PhoneNumberManagement.ts`

1. Create enum type or check constraint for `phone_numbers.status`
2. Create `phone_numbers` table + indexes
3. Create `phone_number_assignments` table + partial unique index for active assignment
4. FK to `businesses`, `agents`, `users` with RESTRICT on delete

No destructive changes to M10 tables.

## Reused tables (read-only in M11)

| Table | M11 use |
| --- | --- |
| `businesses` | Ownership validation |
| `agents` | Assignment target validation |
| `organization_members` | RBAC via role |

## Data not stored in M11

| Item | Reason |
| --- | --- |
| Twilio Auth Token | Server env only (M10 policy) |
| Raw Twilio REST payloads | Log sanitized snippets only |
| Call records | M12 / existing `calls` |
