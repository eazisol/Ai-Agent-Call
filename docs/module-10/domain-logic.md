# Module 10 — Domain logic (10.01 technical design)

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Submodule | 10.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 |

## Provider port (target contract)

Extend the existing partial port at `ai-call-agent-backend/src/providers/telephony-provider.port.ts`.

```typescript
/** Provider-neutral number search result */
export interface TelephonyNumberCandidate {
  externalNumberId: string; // Twilio PhoneNumberSid (available) or E.164 preview id
  phoneNumber: string; // E.164
  friendlyName?: string;
  locality?: string;
  region?: string;
  isoCountry: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
  monthlyPrice?: { amount: number; currency: string };
}

export interface TelephonyNumberPurchaseInput {
  phoneNumber: string; // E.164 to purchase
  friendlyName?: string;
}

export interface TelephonyNumberPurchaseResult {
  externalNumberId: string; // Twilio IncomingPhoneNumberSid
  phoneNumber: string;
  configured: boolean;
}

export interface TelephonyNumberConfigureInput {
  externalNumberId: string;
  voiceWebhookUrl: string;
  statusCallbackUrl: string;
  smsWebhookUrl?: string;
}

export interface IncomingCallContext {
  externalCallId: string;
  callerNumber?: string;
  receiverNumber?: string;
}

export interface TelephonyProviderPort {
  readonly providerName: string;

  isConfigured(): boolean;
  validateCredentials(): Promise<{ ok: true } | { ok: false; reason: string }>;

  searchAvailableNumbers(input: {
    isoCountry: string;
    areaCode?: string;
    contains?: string;
    limit?: number;
  }): Promise<TelephonyNumberCandidate[]>;

  purchaseNumber(
    input: TelephonyNumberPurchaseInput,
  ): Promise<TelephonyNumberPurchaseResult>;

  configureNumber(input: TelephonyNumberConfigureInput): Promise<void>;

  releaseNumber(externalNumberId: string): Promise<void>;

  validateWebhook(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean;

  buildIncomingCallResponse(context: IncomingCallContext): string;
}
```

**Injection:** `TwilioModule` registers `{ provide: TELEPHONY_PROVIDER_PORT, useExisting: TwilioService }` (or dedicated `TwilioTelephonyAdapter` class if split for clarity in 10.02).

## Twilio adapter responsibilities

| Method | Twilio API | Notes |
| --- | --- | --- |
| `isConfigured` | — | `accountSid` + `authToken` present |
| `validateCredentials` | `GET /2010-04-01/Accounts/{Sid}.json` | Used by health check; map 401 → `PROVIDER_AUTH_FAILED` |
| `searchAvailableNumbers` | `AvailablePhoneNumbers` list | Normalize to `TelephonyNumberCandidate` |
| `purchaseNumber` | `IncomingPhoneNumbers.create` | Returns SID + E.164 |
| `configureNumber` | `IncomingPhoneNumbers.update` | Set `VoiceUrl`, `StatusCallback`, optional `SmsUrl` |
| `releaseNumber` | `IncomingPhoneNumbers(sid).remove` | Treat 404 as success (idempotent) |
| `validateWebhook` | `validateRequest` | Existing implementation |
| `buildIncomingCallResponse` | TwiML `VoiceResponse` | M10: prototype stream or polite reject if unconfigured |

REST client: official `twilio` npm package, constructed per-request or lazy singleton with config timeout.

## Webhook flows

### Inbound call — `POST /api/v1/webhooks/twilio/incoming-call`

```text
Twilio → TwilioWebhookGuard (signature)
      → TwilioService.handleIncomingCall
      → CallsService.createFromProvider (idempotent by CallSid)
      → buildIncomingCallResponse (TwiML)
```

| Step | Rule |
| --- | --- |
| Idempotency | Duplicate `CallSid` returns existing call row |
| Validation | `CallSid` required; reject oversize/missing with `INVALID_WEBHOOK_PAYLOAD` |
| Response | `Content-Type: text/xml` |
| M12 hook | Replace blind `/voice/stream` connect with resolve `To` → Business → Agent (deferred) |

### Call ended — `POST /api/v1/webhooks/twilio/call-ended`

Existing flow preserved:

```text
Twilio → guard → handleCallEnded
      → recordProviderEvent (dedupe by composite externalEventId)
      → markCompleted when new event
```

### Status callback — `POST /api/v1/webhooks/twilio/status-callback` (new)

Handles Twilio `CallStatus` progression (`queued`, `ringing`, `in-progress`, `completed`, `busy`, `failed`, `no-answer`, `canceled`).

```text
Twilio → guard → handleStatusCallback
      → recordProviderEvent(eventType = call-status:{status})
      → map to internal lifecycle side effects (M10 minimal):
           completed → markCompleted (if not already)
           failed/busy/no-answer → markFailed (new CallsService helper in 10.02)
```

Idempotency key: `{CallSid}:{CallStatus}:{Timestamp|Sequence}`.

## Internal event normalization

Map Twilio webhook fields to **`provider_events`** (existing table via `CallsService.recordProviderEvent`):

| Twilio signal | `eventType` | Internal meaning |
| --- | --- | --- |
| Incoming webhook | `call-started` | Call row created |
| Status `in-progress` | `call-status:in-progress` | Connected (log only in M10) |
| Status `completed` | `call-status:completed` | End + duration |
| Status `failed` / `busy` / `no-answer` | `call-status:{status}` | Terminal non-success |
| Call-ended webhook | `call-ended` | Legacy completion path (keep) |

Future M12+ may emit domain events (`CALL_CONNECTED`, etc.) from these normalized records without re-parsing Twilio payloads.

## Error normalization

Adapter maps Twilio REST + webhook failures to `ApplicationError`:

| Code | HTTP | When |
| --- | --- | --- |
| `PROVIDER_NOT_CONFIGURED` | 503 | Missing SID/token |
| `PROVIDER_AUTH_FAILED` | 502 | Twilio 401/403 on REST |
| `TELEPHONY_NUMBER_NOT_FOUND` | 404 | Configure/release unknown SID |
| `TELEPHONY_NUMBER_UNAVAILABLE` | 409 | Number no longer available to purchase |
| `TELEPHONY_SEARCH_FAILED` | 502 | Search API error |
| `TELEPHONY_PROVISION_FAILED` | 502 | Purchase/configure failed |
| `PROVIDER_RATE_LIMITED` | 503 | Twilio 429 |
| `INVALID_WEBHOOK_PAYLOAD` | 400 | Missing CallSid / malformed body |
| `WEBHOOK_SIGNATURE_INVALID` | 403 | Guard rejection |

Extract Twilio `message`, `code`, and `more_info` into log lines; user-facing messages stay provider-neutral ("Unable to purchase this number") except operator health views.

## Number configure defaults (M10)

When M11 purchases via port, adapter configures:

| Twilio field | Value |
| --- | --- |
| `VoiceUrl` | `{PUBLIC_BASE_URL}/api/v1/webhooks/twilio/incoming-call` |
| `VoiceMethod` | `POST` |
| `StatusCallback` | `{PUBLIC_BASE_URL}/api/v1/webhooks/twilio/status-callback` |
| `StatusCallbackMethod` | `POST` |
| `StatusCallbackEvent` | `initiated ringing answered completed` |

SMS URL optional in MVP unless M11 enables SMS on the number.

## Security (design)

| Control | Implementation |
| --- | --- |
| Webhook auth | `TwilioWebhookGuard` + `validateRequest` |
| Dev bypass | `TWILIO_VALIDATE_SIGNATURES=false` — documented in security runbook only |
| Secrets | Auth token never in logs, responses, or frontend |
| Idempotency | Unique constraints on `call_provider_mappings` + `provider_events` |
| Tenant isolation | Webhooks do not trust `To`/`From` for auth; M12 resolves tenant after verified webhook |

## 10.02 implementation notes (forward pointer)

| Item | Action |
| --- | --- |
| Split adapter | Optional `twilio-telephony.adapter.ts` vs fat `TwilioService` |
| Provider mappings table | Add if REST operations need audit (`telephony_provider_mappings`) |
| `CallsService.markFailed` | Add for terminal non-complete statuses |
| Tests | Credential validation, webhook signature, event dedupe, number configure (mock Twilio) |
| Health | Optional `telephony: up\|down\|disabled` on `/health/ready` |
