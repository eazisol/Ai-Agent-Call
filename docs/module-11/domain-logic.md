# Module 11 — Domain logic (11.01 technical design)

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Submodule | 11.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 |

## Module boundary

M11 owns **canonical Business phone inventory** and **agent assignment**. It consumes M10 `TelephonyProviderPort` for provider operations and never imports the Twilio SDK in domain services.

| M11 owns | M11 does not own |
| --- | --- |
| `phone_numbers`, `phone_number_assignments` | Webhook signature verification (M10) |
| Search/purchase/import/release orchestration | Inbound call routing (M12) |
| Assign / unassign to agents | Twilio credential storage |
| Business-scoped RBAC + validation | Customer BYOT Twilio |

## NestJS module shape (11.02 target)

```text
PhoneNumbersModule
├── PhoneNumbersController      REST /api/v1/phone-numbers/*
├── PhoneNumbersService         use cases + transactions
├── PhoneNumberAssignmentsService (or methods on PhoneNumbersService)
├── phone-number-permissions.ts RBAC matrix
├── entities/
│   ├── phone-number.entity.ts
│   └── phone-number-assignment.entity.ts
└── imports:
    ├── BusinessesModule        resolve active business + ownership
    ├── AgentsModule          validate assign target
    ├── TwilioModule          TELEPHONY_PROVIDER_PORT (via export)
    └── AuthModule / OrganizationsModule
```

**Rule:** `PhoneNumbersService` injects `TELEPHONY_PROVIDER_PORT`, not `TwilioService` directly, so M11 stays provider-neutral.

## Ownership resolution

Every use case follows the M05–M08 pattern:

```text
AuthGuard → active org cookie (eazi_org)
         → active business cookie (eazi_biz)
         → OrganizationsService.requireMembership(userId, orgId)
         → BusinessesService.requireOwnedBusiness(orgId, businessId)
         → phone_numbers.business_id MUST equal active businessId
```

Cross-business access returns `PHONE_NUMBER_NOT_FOUND` (same as agent/knowledge patterns) — never leak another Business's inventory.

Organization is derived via `businesses.organization_id`; **do not** add `organization_id` to `phone_numbers` for MVP.

## PhoneNumbersService — responsibilities

| Method | Purpose |
| --- | --- |
| `listForBusiness` | Paginated list with status, assignment summary, capabilities |
| `searchAvailable` | Proxy to port.searchAvailableNumbers (no DB write) |
| `purchaseForBusiness` | Port purchase + configure + local row + reconciliation |
| `importForBusiness` | Verify provider control + insert local row |
| `assignToAgent` | Validate agent + create/replace active assignment |
| `unassign` | End active assignment (idempotent) |
| `release` | Unassign if needed → port.release → local `released` |
| `getByIdForBusiness` | Detail view |

## Purchase flow (locked)

```text
1. assertCan(role, 'purchase_phone_number')
2. require active Business
3. assert TelephonyProviderPort.isConfigured()
4. INSERT phone_numbers status=provisioning (or upsert by idempotency key)
5. telephony.purchaseNumber({ phoneNumber, friendlyName })
6. telephony.configureNumber({ externalNumberId, voiceWebhookUrl, statusCallbackUrl })
      └── defaultWebhookUrls() from M10 adapter
7. UPDATE phone_numbers:
      provider_number_id, phone_number_e164, country, capabilities, status=active
8. Optional: TelephonyMappingsService.recordActiveMapping (M10 audit — already on port purchase path)
```

**Failure handling:**

| Failure point | Local state | User message |
| --- | --- | --- |
| Provider purchase fails | `failed` or delete provisioning row | Normalized `TELEPHONY_*` code |
| Provider OK, DB fails | Row stuck `provisioning` | Retry/reconcile job or manual ops; log correlationId |
| Configure fails after purchase | `failed` + provider SID preserved | Operator may retry configure |

Provider success alone is **not** product success until local row is `active`.

## Import flow (locked)

**Import** maps a number already owned by the **platform Twilio account**.

```text
1. User supplies E.164 (and optional friendly label)
2. Service verifies number exists in provider account:
      Option A: Twilio REST lookup by E.164 / IncomingPhoneNumbers list filter
      Option B: dedicated port method in future (11.02 may use adapter helper)
3. Reject if duplicate canonical row exists (business_id + e164 active) or (provider + sid)
4. configureNumber if webhooks not already correct
5. INSERT phone_numbers status=active
```

Not arbitrary porting. Not customer BYOT accounts.

## Release flow (locked)

```text
1. assertCan(role, 'release_phone_number')
2. Load phone_numbers row for Business
3. If active assignment exists → require unassign first OR atomic unassign in same transaction with explicit confirm flag from API
4. status → release_pending
5. telephony.releaseNumber(provider_number_id)
6. status → released (retain row; do not hard-delete)
7. TelephonyMappingsService.markReleased (provider audit)
```

404 from provider on release → treat as success (idempotent), same as M10 adapter.

## Assignment flow (locked)

```text
1. assertCan(role, 'assign_phone_number')
2. Load phone_number where business_id = active business AND status = active
3. Load agent where business_id = same business AND status != archived
4. If agent inactive → PHONE_ASSIGNMENT_AGENT_INACTIVE (or reuse AGENT_INACTIVE)
5. End any existing ACTIVE assignment on this phone_number (single active rule)
6. INSERT phone_number_assignments status=active
```

**Cross-business:** agent.business_id ≠ phone.business_id → `PHONE_ASSIGNMENT_CROSS_BUSINESS` (403/404).

**Reverse cardinality:** one agent may hold multiple numbers; enforce only the phone → agent side for MVP.

## Unassign flow

End active assignment (`status=ended`, `unassigned_at=now()`). Idempotent if no active assignment.

## Idempotency strategy (locked)

| Operation | Key / rule |
| --- | --- |
| **Purchase** | Unique partial index: one non-released row per `(business_id, phone_number_e164)`; optional `Idempotency-Key` header stored on row metadata |
| **Import** | Same uniqueness; reject duplicate `(provider, provider_number_id)` |
| **Assign** | DB unique partial index: one `active` assignment per `phone_number_id` |
| **Unassign** | No-op if already unassigned |
| **Release** | No-op if status already `released`; provider 404 on release is success |

Use transactions for assign + unassign previous active row.

## Integration with M10 provider audit

| Table | Relationship |
| --- | --- |
| `telephony_provider_mappings` | Platform-level provider SID audit (no business_id) — written by M10 adapter on purchase |
| `phone_numbers` | **Canonical tenant inventory** with `business_id` |

11.02 stores `provider_number_id` on `phone_numbers`. Optional FK to `telephony_provider_mappings.id` is **not required** for MVP — duplicate SID string is sufficient link.

M12 resolves inbound calls via `phone_numbers.phone_number_e164` + `business_id`, not via `telephony_provider_mappings` alone.

## RBAC (design)

New `phone-number-permissions.ts` (mirror `agent-permissions.ts`):

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| `list_phone_numbers` | ✓ | ✓ | ✓ | ✓ |
| `view_phone_number` | ✓ | ✓ | ✓ | ✓ |
| `search_available_numbers` | ✓ | ✓ | ✓ | ✗ |
| `purchase_phone_number` | ✓ | ✓ | ✗ | ✗ |
| `import_phone_number` | ✓ | ✓ | ✗ | ✗ |
| `assign_phone_number` | ✓ | ✓ | ✓ | ✗ |
| `unassign_phone_number` | ✓ | ✓ | ✓ | ✗ |
| `release_phone_number` | ✓ | ✓ | ✗ | ✗ |

Purchase/release restricted to owner/admin (destructive + billing implications). Manager may assign/unassign only.

## Error codes (domain)

| Code | HTTP | When |
| --- | --- | --- |
| `PHONE_NUMBER_NOT_FOUND` | 404 | Wrong id or cross-business |
| `PHONE_NUMBER_NOT_ACTIVE` | 409 | Assign/release on non-active number |
| `PHONE_NUMBER_ALREADY_EXISTS` | 409 | Duplicate purchase/import |
| `PHONE_NUMBER_HAS_ASSIGNMENT` | 409 | Release blocked until unassign |
| `PHONE_ASSIGNMENT_NOT_FOUND` | 404 | Unassign when none active |
| `PHONE_ASSIGNMENT_CROSS_BUSINESS` | 403 | Agent from another Business |
| `PHONE_ASSIGNMENT_AGENT_INACTIVE` | 409 | Agent archived/inactive |
| `PROVIDER_NOT_CONFIGURED` | 503 | M10 telephony not configured |
| `TELEPHONY_*` | varies | Pass-through from M10 port normalization |

## Security (design)

| Control | Rule |
| --- | --- |
| Tenant isolation | All queries filter `phone_numbers.business_id = activeBusinessId` |
| Provider secrets | Never in API responses |
| Destructive release | Requires owner/admin + confirmation payload `{ confirm: true }` |
| Search | Does not expose other tenants' numbers — only provider catalogue |
| Audit | Log purchase/release/assign with userId + businessId + phoneNumberId |

## Out of scope (domain)

- Inbound webhook tenant resolution (M12)
- Outbound dial (M13)
- Usage metering per number (M26)
- Per-Business Twilio sub-accounts

## 11.02 implementation notes (forward pointer)

| Item | Action |
| --- | --- |
| Migration | `phone_numbers` + `phone_number_assignments` + enums + indexes |
| Module | `PhoneNumbersModule` registered in `AppModule` |
| DTOs | class-validator on search/purchase/import/assign bodies |
| Tests | Unit domain + e2e RBAC + cross-business + idempotency |
| Reconciliation | Admin script or retry endpoint for `provisioning`/`failed` rows (minimal MVP: log + manual) |
