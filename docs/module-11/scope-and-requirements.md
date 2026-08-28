# Module 11 — Scope & requirements (11.01 roadmap lock)

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Submodule | 11.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 (11.01 complete; 11.02+ not implemented) |

## Objective

Own the **canonical EaziAICall Business phone-number inventory** and **agent assignment**, consuming M10 provider methods for search/provision/configure/release.

## Ownership (locked)

| Rule | Decision |
| --- | --- |
| Operational unit | **Business** |
| Required FK | `phone_numbers.business_id` → `businesses.id` |
| Organization | Derived via Business — no duplicate `organization_id` on phone tables for MVP |
| Provider truth | Twilio holds operational state; PostgreSQL is canonical for product inventory |

## Phone number record (locked)

| Field | Purpose |
| --- | --- |
| `id` | Canonical UUID |
| `business_id` | Required ownership |
| `provider` | e.g. `twilio` |
| `provider_number_id` / `provider_sid` | Twilio IncomingPhoneNumber SID |
| `phone_number_e164` | Normalized E.164 |
| `country` | ISO country code |
| `capabilities` | voice / sms / mms |
| `status` | Lifecycle enum |
| `created_at` / `updated_at` | Audit |

**Lifecycle:** `provisioning` → `active` → (`release_pending`) → `released` | `failed`

Unique constraint: prevent duplicate canonical rows for same `(provider, provider_number_id)` or `(business_id, phone_number_e164)` where active.

## Assignment model (locked)

Table: `phone_number_assignments`

| Rule | MVP |
| --- | --- |
| Cardinality | One phone number → **zero or one ACTIVE** agent assignment |
| Agent | Must exist, same Business, active where required |
| Cross-business | **Hard fail** |
| Reverse | One agent may have multiple numbers if product allows |

## Search / purchase (locked)

```text
Portal (Business context)
  → POST /phone-numbers/search (M11) → TelephonyProviderPort.search
  → user selects number
  → POST /phone-numbers/purchase (M11)
       → TelephonyProviderPort.purchase + configure webhooks
       → insert/update phone_numbers (provisioning → active)
       → record provider SID
```

If provider succeeds but DB fails → reconciliation/retry required; do not orphan user expectation.

## Import existing number (locked)

**Means:** Map a number already in the **platform Twilio account** into EaziAICall.

**Does not mean:** Arbitrary porting or customer-owned Twilio account import (future module).

Validate provider control before import. Prevent duplicate import.

## Release (locked)

1. Detect active agent assignment  
2. Require unassign or explicit safe flow + confirmation  
3. Call `TelephonyProviderPort.releaseNumber`  
4. Confirm provider success  
5. Update local status to `released` (retain row for history)  

Never delete local row before provider release confirms.

## Idempotency (locked)

Required for: purchase, import, assign, unassign, release.

Repeated requests must not create duplicate numbers or duplicate active assignments.

## Related design docs (11.01)

| Doc | Topic |
| --- | --- |
| [domain-logic.md](./domain-logic.md) | Service flows, RBAC, idempotency |
| [api-contracts.md](./api-contracts.md) | REST API shapes |
| [data-model.md](./data-model.md) | Tables and constraints |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal UX |

## API surface (planned — 11.02)

See [api-contracts.md](./api-contracts.md) for full request/response shapes.

## Out of scope (M11)

| Item | Module |
| --- | --- |
| Inbound call routing to ElevenLabs | M12 |
| Call records / events UI detail | M12 / M14 |
| Outbound calls | M13 |
| BYOT Twilio credentials | Future |
| Billing / usage metering | M25–M26 |

## Manual QA requirements (11.05)

Must verify: Business ownership, search, purchase, import, assign, unassign, release, cross-business denial, provider failure reconciliation, idempotent retries.

## Checklist mapping (11.01 lock)

| ID | Requirement | Status |
| --- | --- | --- |
| P04-M11-01-01 | Boundaries | Locked in this doc |
| P04-M11-01-02 … 01-09 | Core capabilities | Locked |
| P04-M11-01-10 | Out of scope | Locked |
| P04-M11-01-11 | `phone_numbers.business_id` ownership | Locked |
| P04-M11-01-12 | One active assignment per number | Locked |
| P04-M11-01-13 | Import = map controlled provider number | Locked |
| P04-M11-01-14 | Safe release flow | Locked |
| P04-M11-01-15 | Idempotency purchase/import/assign/release | Locked |
