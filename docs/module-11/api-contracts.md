# Module 11 — API contracts (11.01 design)

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Submodule | 11.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 |
| Base | `/api/v1` |
| Auth | Session + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` cookies (active organization + active business) |

All routes require authenticated user with active organization and active business selected unless noted.

## List phone numbers

### `GET /phone-numbers`

| | |
| --- | --- |
| Purpose | List canonical numbers for active Business |
| RBAC | `list_phone_numbers` — all roles |

**Query parameters**

| Param | Notes |
| --- | --- |
| `status` | Filter: `provisioning`, `active`, `release_pending`, `released`, `failed` |
| `page`, `limit` | Pagination (default limit 20) |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "phoneNumberE164": "+14155550100",
      "country": "US",
      "provider": "twilio",
      "status": "active",
      "capabilities": { "voice": true, "sms": true, "mms": false },
      "assignment": {
        "agentId": "uuid",
        "agentName": "Receptionist",
        "status": "active"
      },
      "createdAt": "2026-08-28T10:00:00.000Z",
      "updatedAt": "2026-08-28T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

`assignment` is `null` when unassigned. Never return `provider_number_id` to viewer role if considered sensitive — **11.02 decision:** include for owner/admin/manager only, omit for viewer list (detail may still hide).

## Search available numbers

### `POST /phone-numbers/search`

| | |
| --- | --- |
| Purpose | Search provider catalogue (no local DB write) |
| RBAC | owner, admin, manager |

**Request body**

```json
{
  "isoCountry": "US",
  "areaCode": "415",
  "contains": "555",
  "limit": 20
}
```

| Field | Validation |
| --- | --- |
| `isoCountry` | Required, 2-letter ISO |
| `areaCode` | Optional string |
| `contains` | Optional E.164 digit pattern |
| `limit` | Optional 1–50 |

**Response 200**

```json
{
  "candidates": [
    {
      "phoneNumber": "+14155550100",
      "friendlyName": "San Francisco, CA",
      "locality": "San Francisco",
      "region": "CA",
      "isoCountry": "US",
      "capabilities": { "voice": true, "sms": true, "mms": false }
    }
  ]
}
```

Do not expose Twilio `externalNumberId` for available (unpurchased) numbers if it is only a search preview — use E.164 as purchase key.

**Errors:** `PROVIDER_NOT_CONFIGURED` (503), `TELEPHONY_SEARCH_FAILED` (502)

## Purchase number

### `POST /phone-numbers/purchase`

| | |
| --- | --- |
| Purpose | Buy number via provider + persist + configure webhooks |
| RBAC | owner, admin only |
| Idempotency | Same `(business_id, phone_number_e164)` active row prevents duplicate |

**Request body**

```json
{
  "phoneNumber": "+14155550100",
  "friendlyName": "Main reception line",
  "confirm": true
}
```

**Response 201**

```json
{
  "phoneNumber": {
    "id": "uuid",
    "phoneNumberE164": "+14155550100",
    "country": "US",
    "provider": "twilio",
    "status": "active",
    "capabilities": { "voice": true, "sms": true, "mms": false },
    "assignment": null
  }
}
```

**Errors:** `PHONE_NUMBER_ALREADY_EXISTS` (409), `TELEPHONY_NUMBER_UNAVAILABLE` (409), `TELEPHONY_PROVISION_FAILED` (502)

## Import existing number

### `POST /phone-numbers/import`

| | |
| --- | --- |
| Purpose | Map provider-controlled number into Business inventory |
| RBAC | owner, admin only |

**Request body**

```json
{
  "phoneNumber": "+14155550999",
  "friendlyName": "Imported line"
}
```

**Response 201** — same shape as purchase.

**Errors:** `PHONE_NUMBER_NOT_AT_PROVIDER` (404/409), `PHONE_NUMBER_ALREADY_EXISTS` (409)

## Assign to agent

### `POST /phone-numbers/:id/assign`

| | |
| --- | --- |
| Purpose | Set active agent assignment (replaces previous active) |
| RBAC | owner, admin, manager |

**Request body**

```json
{
  "agentId": "uuid"
}
```

**Response 200**

```json
{
  "phoneNumberId": "uuid",
  "assignment": {
    "id": "uuid",
    "agentId": "uuid",
    "agentName": "Receptionist",
    "status": "active",
    "assignedAt": "2026-08-28T10:00:00.000Z"
  }
}
```

**Errors:** `PHONE_NUMBER_NOT_FOUND`, `PHONE_ASSIGNMENT_CROSS_BUSINESS`, `PHONE_ASSIGNMENT_AGENT_INACTIVE`, `AGENT_NOT_FOUND`

## Unassign

### `POST /phone-numbers/:id/unassign`

| | |
| --- | --- |
| Purpose | Clear active assignment |
| RBAC | owner, admin, manager |
| Idempotency | Success even if already unassigned |

**Response 200**

```json
{
  "phoneNumberId": "uuid",
  "assignment": null
}
```

## Release number

### `DELETE /phone-numbers/:id`

| | |
| --- | --- |
| Purpose | Release at provider + mark local `released` |
| RBAC | owner, admin only |
| Destructive | Requires confirmation |

**Request body** (JSON on DELETE — Nest `@Body()` allowed)

```json
{
  "confirm": true,
  "releaseReason": "optional note"
}
```

**Response 200**

```json
{
  "phoneNumberId": "uuid",
  "status": "released",
  "releasedAt": "2026-08-28T10:00:00.000Z"
}
```

**Errors:** `PHONE_NUMBER_HAS_ASSIGNMENT` (409) if active assignment and `forceUnassign` not provided — **11.02:** optional `{ confirm: true, unassignFirst: true }` for safe combined flow.

## Get single number

### `GET /phone-numbers/:id`

Detail view with assignment history summary (optional last ended assignment). Same RBAC as list.

## Error envelope (platform standard)

```json
{
  "error": {
    "code": "PHONE_ASSIGNMENT_CROSS_BUSINESS",
    "message": "This agent does not belong to the same business as the phone number.",
    "correlationId": "..."
  }
}
```

## Internal port consumption (not public REST)

M11 services call M10 `TelephonyProviderPort` only:

| Port method | M11 use |
| --- | --- |
| `searchAvailableNumbers` | Search endpoint |
| `purchaseNumber` + implicit configure in adapter | Purchase endpoint |
| `configureNumber` | Import + reconfigure |
| `releaseNumber` | Release endpoint |
| `isConfigured` | Pre-flight before search/purchase |

Never expose port methods as unauthenticated public routes.

## Webhook URL contract (inherited from M10)

On purchase/import/configure, numbers must receive:

```text
VoiceUrl       = {PUBLIC_BASE_URL}/api/v1/webhooks/twilio/incoming-call
StatusCallback = {PUBLIC_BASE_URL}/api/v1/webhooks/twilio/status-callback
```

See `docs/module-10/api-contracts.md` and `operational-policy.md`.
