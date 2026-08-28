# Module 10 — Data model (10.02)

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Submodule | 10.02 — Backend, Persistence & API |
| Status | **Implemented** — 28 August 2026 |

## Tables

### `telephony_provider_mappings` (new)

Provider-level audit of purchased/released numbers. **No `business_id`** — tenant ownership is M11 `phone_numbers`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `provider` | varchar(50) | e.g. `twilio` |
| `resource_type` | varchar(50) | Default `phone_number` |
| `external_resource_id` | varchar(150) | Twilio IncomingPhoneNumber SID |
| `phone_number` | varchar(30) | E.164 cache |
| `status` | varchar(30) | `active` \| `released` |
| `metadata` | jsonb | Non-secret provider metadata |
| `created_at` / `updated_at` | timestamptz | |

**Unique:** `(provider, external_resource_id)`

Migration: `1756120000000-TwilioTelephonyProvider`

### Reused from M00 (no schema change)

| Table | M10 use |
| --- | --- |
| `call_provider_mappings` | Idempotent call identity by `(provider, external_call_id)` |
| `provider_events` | Webhook dedupe + normalized event log |
| `calls` | Call lifecycle (`started`, `completed`, `failed`) |

## Tenant ownership (10.02 confirmation)

| Record | Tenant key in M10 | Notes |
| --- | --- | --- |
| `telephony_provider_mappings` | **None** | Platform provider audit only |
| `calls` | `business_id` nullable | Populated in M12 routing |
| `provider_events` | via optional `call_id` | No direct org/business column |

M11 will link `phone_numbers.business_id` → optional FK to `telephony_provider_mappings` or store external SID on the business row.

## Entity

`TelephonyProviderMapping` — `src/modules/twilio/entities/telephony-provider-mapping.entity.ts`

Service: `TelephonyMappingsService` — upsert on purchase, mark released on release.
