# Module 10 — API contracts (10.01)

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Submodule | 10.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 |

## Public webhook API (Twilio → platform)

Base path: `/api/v1/webhooks/twilio`

All routes:

- Accept `application/x-www-form-urlencoded` (Twilio default).
- Require valid `X-Twilio-Signature` when `TWILIO_VALIDATE_SIGNATURES=true`.
- Are **not** authenticated via user JWT/cookies.

### `POST /incoming-call`

| | |
| --- | --- |
| Purpose | Twilio voice webhook when a call arrives on a configured number |
| Response | `200` + `text/xml` TwiML |
| Idempotency | By `CallSid` via `CallsService.createFromProvider` |

**Required body fields:** `CallSid`, `From`, `To` (validated via `TwilioWebhookDto`).

**M10 behavior:** Create call record; return TwiML (prototype connects to voice stream until M12).

### `POST /call-ended`

| | |
| --- | --- |
| Purpose | Legacy/alternate completion webhook |
| Response | `200` + `{ "success": true }` |
| Idempotency | By composite `externalEventId` on `provider_events` |

### `POST /status-callback` (new in M10)

| | |
| --- | --- |
| Purpose | Twilio call status progression |
| Response | `200` + `{ "success": true }` |
| Idempotency | By `{CallSid}:{CallStatus}:{Timestamp}` |

**Handled statuses:** `completed`, `failed`, `busy`, `no-answer`, `canceled`, plus log-only for `ringing`, `in-progress`.

## Internal provider methods (server-only)

Not exposed as public REST in M10. Consumed by **M11 Phone Number Management** (and tests).

| Method | Input | Output | Errors |
| --- | --- | --- | --- |
| `isConfigured()` | — | `boolean` | — |
| `validateCredentials()` | — | `{ ok }` | `PROVIDER_AUTH_FAILED` |
| `searchAvailableNumbers` | country, areaCode?, contains?, limit? | `TelephonyNumberCandidate[]` | `TELEPHONY_SEARCH_FAILED` |
| `purchaseNumber` | E.164, friendlyName? | `{ externalNumberId, phoneNumber }` | `TELEPHONY_NUMBER_UNAVAILABLE`, `TELEPHONY_PROVISION_FAILED` |
| `configureNumber` | externalNumberId, webhook URLs | `void` | `TELEPHONY_NUMBER_NOT_FOUND`, `TELEPHONY_PROVISION_FAILED` |
| `releaseNumber` | externalNumberId | `void` | `TELEPHONY_PROVISION_FAILED` (404 → no-op) |

**DI token:** `TELEPHONY_PROVIDER_PORT`

## Error response shape (consistent with platform)

Webhook guard failures:

```json
{
  "error": {
    "code": "WEBHOOK_SIGNATURE_INVALID",
    "message": "Invalid Twilio webhook signature.",
    "correlationId": "..."
  }
}
```

Internal service failures (surfaced to M11 REST in later module):

```json
{
  "error": {
    "code": "TELEPHONY_PROVISION_FAILED",
    "message": "Unable to configure the phone number with the provider.",
    "correlationId": "..."
  }
}
```

## Environment-driven URL contract

Twilio number configuration must use:

```text
VoiceUrl         = {PUBLIC_BASE_URL}/api/v1/webhooks/twilio/incoming-call
StatusCallback   = {PUBLIC_BASE_URL}/api/v1/webhooks/twilio/status-callback
```

`PUBLIC_BASE_URL` must match the origin Twilio uses when signing requests (include path prefix `/api/v1` only in the route, not in base URL).
