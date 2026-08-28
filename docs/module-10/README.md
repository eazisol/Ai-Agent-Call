# Module 10 — Twilio Telephony Provider

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Phase | P04 — Telephony |
| Status | **Complete** — 28 August 2026 |
| Depends on | M00 Complete |
| Next | M11 — Phone Number Management |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, M10 vs M11 boundary, out of scope |
| [domain-logic.md](./domain-logic.md) | `TelephonyProviderPort`, webhooks, error normalization |
| [api-contracts.md](./api-contracts.md) | Webhook routes + internal provider methods (M11 consumers) |
| [data-model.md](./data-model.md) | Provider mappings + reused call/event tables |
| [frontend-surfaces.md](./frontend-surfaces.md) | Integrations settings UI |
| [operational-policy.md](./operational-policy.md) | Credential + webhook URL policy (roadmap lock) |
| [security-and-qa.md](./security-and-qa.md) | 10.04 security controls + automated QA evidence |
| [M10_Twilio_Telephony_Provider_manual-qa-guide.md](./M10_Twilio_Telephony_Provider_manual-qa-guide.md) | Manual QA handoff (VS-GLOBAL-16) |
| [../telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) | Canonical M10/M11/M12 routing model |

## Objective (one line)

Implement **Twilio behind a provider-neutral telephony port** — credential validation, number lifecycle operations at the provider layer, secured inbound/status webhooks, and normalized provider errors — so M11+ can manage Business phone numbers and M12+ can route live calls without coupling domain code to Twilio SDK types.

## Architecture lock (Phase 04)

```text
NestJS domain / M11 Phone Numbers
        │
        ▼
TelephonyProviderPort  ←── TELEPHONY_PROVIDER_PORT token
        │
        ▼
TwilioTelephonyAdapter (TwilioService refactor target)
        │
        ├── REST: search / purchase / configure / release
        └── Webhooks: incoming-call, call-ended, status-callback
                │
                ▼
        CallsService (provider-neutral call + event records)
```

## Prototype baseline (M00)

The repo already ships a **partial** Twilio integration used by the voice-stream prototype:

| Exists today | Gap for M10 |
| --- | --- |
| `TelephonyProviderPort` with webhook validation + TwiML builder | Extend port with number lifecycle + `isConfigured()` |
| `POST /api/v1/webhooks/twilio/incoming-call` | Harden tenant resolution hook points for M12 |
| `POST /api/v1/webhooks/twilio/call-ended` | Add `status-callback` route |
| `TwilioWebhookGuard` signature validation | Keep; document dev bypass |
| `CallsService.createFromProvider` idempotency | Reuse for all telephony webhooks |
| Prototype TwiML → `/voice/stream` WebSocket | **Out of M10 production path** — replaced in M12 |

## Configuration (server-side)

| Env | Notes |
| --- | --- |
| `TELEPHONY_PROVIDER` | Default `twilio` (only supported MVP adapter) |
| `TWILIO_ACCOUNT_SID` | Server-side only |
| `TWILIO_AUTH_TOKEN` | Server-side only; used for REST + webhook signatures |
| `TWILIO_PHONE_NUMBER` | Legacy single-number dev default (M11 owns canonical mappings) |
| `TWILIO_VALIDATE_SIGNATURES` | Default `true`; set `false` only for local webhook tunnel testing |
| `PUBLIC_BASE_URL` | Must match Twilio webhook URL origin (HTTPS in production) |

Never expose Account SID secrets beyond what Twilio requires in webhook payloads; Auth Token never leaves the server.

## Module gate

**M10 Twilio Telephony Provider = COMPLETE** after 10.01–10.05 verified (28 August 2026).
