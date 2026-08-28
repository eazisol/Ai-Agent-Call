# Module 12 — API contracts (12.01 design)

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Submodule | 12.01 — Scope & Technical Design |
| Status | **Implemented** — 28 August 2026 |
| Base | `/api/v1` |

## Webhook APIs (provider → platform)

### Twilio inbound — `POST /webhooks/twilio/incoming-call`

| | |
| --- | --- |
| Owner | M10 controller; **M12 orchestration** invoked inside `TwilioService` |
| Auth | `X-Twilio-Signature` when `TWILIO_VALIDATE_SIGNATURES=true` |
| Body | `application/x-www-form-urlencoded` — `CallSid`, `From`, `To` required |
| Response | `200` + `text/xml` TwiML |
| Idempotency | One Call per Twilio Call SID |

**M12 behavior (replaces M10 prototype-only stream):**

1. Resolve called number → Business → Agent → knowledge/voice/mapping readiness  
2. Create early Call + `call_events`  
3. Return agent-scoped ElevenLabs handoff TwiML **or** safe failure TwiML  

**Failure responses**

| Condition | HTTP | Body |
| --- | --- | --- |
| Invalid signature | 403 | JSON error `WEBHOOK_SIGNATURE_INVALID` |
| Malformed payload (no CallSid) | 400 | JSON error `INVALID_WEBHOOK_PAYLOAD` |
| Routing/handoff failure | 200 | TwiML reject/message (Call may exist as `failed`) |

### Twilio status — `POST /webhooks/twilio/status-callback`

| | |
| --- | --- |
| Owner | M10 |
| M12 role | Update Call lifecycle via `CallLifecycleService` |
| Idempotency | `provider_events` composite key |

**Handled terminal statuses:** `completed`, `failed`, `busy`, `no-answer`, `canceled`

**M12 additions:** emit `call_events` (`CALL_COMPLETED` / `CALL_FAILED`) when transition applied.

### Twilio call-ended — `POST /webhooks/twilio/call-ended`

Legacy/alternate completion path. Same lifecycle rules as status callback. Prefer status callback for new deployments.

### ElevenLabs — `POST /webhooks/elevenlabs/conversation-events` (12.02)

| | |
| --- | --- |
| Purpose | ConvAI conversation lifecycle (started, ended, error) |
| Auth | Provider signature / shared secret (finalize in 12.02 spike) |
| Response | `200` + `{ "success": true }` |
| Idempotency | `provider_events` + `call_events` |

**Expected payload fields (normalized after validation):**

| Field | Maps to |
| --- | --- |
| Conversation / call id | `call_provider_mappings` (`provider=elevenlabs`) |
| Agent id | Cross-check with resolved Agent mapping |
| Event type | `call_events.event_type` |
| Timestamp | `occurred_at` |

Optional second route for post-call artifacts — transcripts remain **M15**, not M12.

## Portal REST APIs (tenant-scoped)

Auth: session + `AuthGuard` + active org (`eazi_org`) + active business (`eazi_biz`).

### List calls — `GET /calls`

| | |
| --- | --- |
| Purpose | Minimal incoming call history for active Business |
| RBAC | `list_calls` — all roles |
| Replaces | Prototype `GET /calls` (currently `PrototypeOnlyGuard`) |

**Query parameters**

| Param | Notes |
| --- | --- |
| `status` | `started`, `in_progress`, `completed`, `failed` |
| `direction` | Default `inbound` in M12 |
| `agentId` | Optional filter |
| `from`, `to` | ISO date range on `started_at` |
| `page`, `limit` | Pagination (default limit 20) |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "direction": "inbound",
      "status": "completed",
      "callerNumber": "+14155550100",
      "receiverNumber": "+14155550999",
      "businessId": "uuid",
      "agentId": "uuid",
      "agentName": "Front Desk",
      "phoneNumberId": "uuid",
      "failureCode": null,
      "startedAt": "2026-08-28T10:00:00.000Z",
      "endedAt": "2026-08-28T10:05:12.000Z",
      "duration": 312,
      "providerLinks": {
        "twilioCallSid": "CAxxxxxxxx",
        "elevenLabsConversationId": "conv_xxxxxxxx"
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Never expose provider API keys. `twilioCallSid` visible to owner/admin/manager; viewer may receive redacted provider links (12.03 decision — align with M11 provider id policy).

### Get call — `GET /calls/:id`

| | |
| --- | --- |
| Purpose | Call detail + recent normalized events |
| RBAC | `view_call` |
| Tenant | Must belong to active Business |

**Response 200**

```json
{
  "call": {
    "id": "uuid",
    "direction": "inbound",
    "status": "failed",
    "failureCode": "UNSYNCED_AGENT",
    "failureStage": "provider_mapping",
    "callerNumber": "+14155550100",
    "receiverNumber": "+14155550999",
    "businessId": "uuid",
    "agentId": "uuid",
    "agentName": "Front Desk",
    "startedAt": "2026-08-28T10:00:00.000Z",
    "endedAt": "2026-08-28T10:00:04.000Z",
    "duration": null,
    "providerLinks": {
      "twilioCallSid": "CAxxxxxxxx",
      "elevenLabsConversationId": null
    }
  },
  "events": [
    {
      "eventType": "CALL_RECEIVED",
      "source": "twilio",
      "occurredAt": "2026-08-28T10:00:00.000Z"
    },
    {
      "eventType": "ROUTING_FAILED",
      "source": "system",
      "occurredAt": "2026-08-28T10:00:01.000Z",
      "payload": { "failureCode": "UNSYNCED_AGENT" }
    }
  ]
}
```

No transcript messages in M12 response (`call_messages` = M15).

**Errors:** `CALL_NOT_FOUND` (404) for wrong id or cross-business.

## Internal services (not public REST)

| Service | Consumers |
| --- | --- |
| `InboundCallOrchestratorService.handleTwilioInbound` | `TwilioService` |
| `CallRoutingResolverService.resolve` | Orchestrator |
| `CallLifecycleService` | Twilio status + ElevenLabs webhooks |
| `INBOUND_CALL_HANDOFF_PORT` | Orchestrator → ElevenLabs adapter |

## Error response shape

Portal errors follow platform envelope:

```json
{
  "error": {
    "code": "CALL_NOT_FOUND",
    "message": "Call not found.",
    "correlationId": "..."
  }
}
```

## Environment variables (12.02 confirmation)

| Variable | Purpose |
| --- | --- |
| `PUBLIC_BASE_URL` | Twilio signature URL (M10) |
| `TWILIO_*` | M10 — unchanged |
| `ELEVENLABS_API_KEY` | Handoff + webhooks (M06/M12) |
| `INBOUND_CALL_DEV_STREAM_FALLBACK` | Optional dev-only prototype stream |
| `ELEVENLABS_WEBHOOK_SECRET` | ElevenLabs callback verification (12.02) |

No new customer-facing Twilio credentials in M12.

## Contract stability

| Surface | Version note |
| --- | --- |
| Twilio webhooks | URLs unchanged from M10/M11 purchase configure |
| Portal `/calls` | Breaking change from prototype global list → tenant-scoped (intentional in 12.02) |
| ElevenLabs webhooks | New in M12 |
