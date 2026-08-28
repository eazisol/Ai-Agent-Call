# Module 10 — Scope & requirements (10.01)

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Submodule | 10.01 — Scope & Technical Design |
| Status | **Locked** — 28 August 2026 |

## Objective

Deliver a **provider-neutral telephony boundary** with **Twilio as the first adapter**, so the platform can:

1. Authenticate and call Twilio REST APIs safely from the server.
2. Search, purchase, configure, and release phone numbers **at the provider layer** (consumed by M11, not exposed as Business UI in M10).
3. Receive and verify Twilio webhooks (inbound call + status callbacks).
4. Normalize Twilio errors and call events into internal shapes reused by `CallsService` and later modules.

EaziAiCall PostgreSQL remains the **source of truth** for Business phone-number ownership and agent assignment (**M11**). Twilio holds operational telephony state; we store **provider mappings and event logs** as required.

## Checklist mapping (10.01)

| ID | Requirement | Design decision |
| --- | --- | --- |
| P04-M10-01-01 | Objective & boundaries | This document; M10 = port + adapter + webhooks; M11 = tenant phone APIs/UI |
| P04-M10-01-02 | TelephonyProvider contract | Extend `TelephonyProviderPort` — see [domain-logic.md](./domain-logic.md) |
| P04-M10-01-03 | Authenticate with Twilio | `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`; `isConfigured()` + optional credential probe |
| P04-M10-01-04 | Search numbers | `searchAvailableNumbers(filters)` → normalized `TelephonyNumberCandidate[]` |
| P04-M10-01-05 | Purchase/configure number | `purchaseNumber` + `configureNumber` set voice/SMS URLs to platform webhooks |
| P04-M10-01-06 | Release number | `releaseNumber(externalNumberId)` — idempotent if already released |
| P04-M10-01-07 | Inbound webhook | Existing `POST /webhooks/twilio/incoming-call`; signature guard + idempotent call create |
| P04-M10-01-08 | Status callbacks | New `POST /webhooks/twilio/status-callback`; map to internal call lifecycle events |
| P04-M10-01-09 | Normalize errors/events | `TelephonyProviderError` codes + `ProviderEvent` records via `CallsService` |
| P04-M10-01-10 | Out of scope | See below |

## M10 vs M11 boundary (locked)

| Concern | M10 (this module) | M11 (next) |
| --- | --- | --- |
| Twilio REST SDK usage | **Yes** — inside adapter only | Calls port; no direct SDK in domain |
| `phone_numbers` table | Mapping hooks only if needed for provider logs | **Owner** of Business phone inventory |
| Search/purchase UI | **No** | Portal list + search/purchase flow |
| Assign number → agent | **No** | `phone_number_assignments` |
| Webhook endpoints | **Yes** | Consumes events indirectly via call records |
| RBAC / business cookies | Webhooks are provider-authenticated, not user JWT | Full tenant RBAC on REST APIs |
| Provider health in settings | Optional internal status (10.03) | Business-facing number status badges |

**Rule:** M11 services inject `TELEPHONY_PROVIDER_PORT`; they never import `twilio` package types.

## MVP provider scope

| Provider | MVP | Notes |
| --- | --- | --- |
| Twilio | **Yes (first)** | Voice + SMS-capable local/mobile numbers for target markets |
| Telnyx | No | Future `TelephonyProviderPort` adapter (M32) |

## Prototype preservation

M0 shipped working Twilio webhook + TwiML + voice-stream bridge code. M10 **preserves** webhook idempotency and signature validation patterns and **refactors** `TwilioService` toward the full port without breaking existing e2e tests. Prototype TwiML that always connects to `/voice/stream` remains the **dev fallback** until M12 replaces routing with Business/Agent resolution + ElevenLabs.

## Roles & permissions (M10 surfaces)

M10 has **no end-user portal routes**. Permissions apply to optional internal operator health views (10.03) only.

| Surface | Auth |
| --- | --- |
| `/api/v1/webhooks/twilio/*` | Twilio `X-Twilio-Signature` (or dev bypass flag) |
| Internal provider methods | Server-side only; invoked by M11+ services |
| Health/config status | Platform admin / internal settings (if built in 10.03) |

## Out of scope (M10)

| Item | Module / phase |
| --- | --- |
| Business phone number list, search UI, purchase UI | **M11** |
| Assign/unassign number to agent | **M11** |
| `phone_numbers` / `phone_number_assignments` migrations | **M11** |
| Resolve inbound call → Business → Agent → ElevenLabs | **M12** |
| Outbound calls, transfers, conferences | **M13+** |
| Call history UI, transcripts, summaries | **M14–M16** |
| Billing for number rental / per-minute usage | **M25–M26** |
| Telnyx or multi-provider selection UI | **M30–M32** |
| n8n post-call automation wiring | Existing optional hook; not expanded in M10 |
| Realtime audio via n8n | **Never** — see [telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) |
| Customer BYOT Twilio credentials | Future module — MVP is platform-managed only |

## Credential policy (locked)

Platform/server-managed Twilio credentials only. See [operational-policy.md](./operational-policy.md).

## Webhook policy (locked)

Signature validation must use the canonical public callback URL. See [operational-policy.md](./operational-policy.md).

| Module | Use |
| --- | --- |
| M00 | Baseline Twilio module, `CallsService`, voice-stream prototype |
| M04–M08 | No direct dependency; M12 later combines telephony with agents/voices |
| M11 | Primary consumer of number lifecycle port methods |
| M12 | Primary consumer of inbound webhook routing extensions |

## 10.01 acceptance

- [x] Objective and boundaries confirmed
- [x] M10 vs M11 split documented
- [x] Extended `TelephonyProviderPort` contract documented
- [x] Webhook + status callback design documented
- [x] Error/event normalization documented
- [x] Out of scope listed
