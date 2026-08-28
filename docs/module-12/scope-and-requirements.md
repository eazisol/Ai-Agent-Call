# Module 12 — Scope & requirements (12.01 design lock)

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Submodule | 12.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 (12.01 complete; 12.02+ not implemented) |

## Objective

Runtime orchestration connecting **Twilio + Phone Number + Business + Agent + Knowledge + Voice + ElevenLabs** into a tenant-safe inbound AI call with observable Call records, normalized events, idempotent webhooks, and safe failure handling.

EaziAICall PostgreSQL is canonical. Providers hold operational runtime state; we persist **Calls**, **call_events**, and **provider mappings**.

## Checklist mapping (12.01 lock)

| ID | Requirement | Design decision |
| --- | --- | --- |
| P05-M12-01-01 | Objective & boundaries | This document + [domain-logic.md](./domain-logic.md) module boundary |
| P05-M12-01-02 | Receive inbound call | Twilio webhook → `InboundCallOrchestratorService` — [api-contracts.md](./api-contracts.md) |
| P05-M12-01-03 | Resolve called number | `phone_numbers.phone_number_e164` lookup (M11) |
| P05-M12-01-04 | Resolve org/business/agent | `business_id` + active `phone_number_assignments` |
| P05-M12-01-05 | Route to ElevenLabs agent | `INBOUND_CALL_HANDOFF_PORT` + synced `agent_provider_mappings` |
| P05-M12-01-06 | Create local call record | Early create at step 13 — [data-model.md](./data-model.md) |
| P05-M12-01-07 | Normalize lifecycle events | `call_events` table + mapping from provider webhooks |
| P05-M12-01-08 | Persist start/end status | Extend `calls.status`, `ended_at`, `duration` |
| P05-M12-01-09 | Handle failed/unmapped calls | Failure routes table — [domain-logic.md](./domain-logic.md) |
| P05-M12-01-10 | Out of scope | See below |
| P05-M12-01-11 | 17-step resolution order | [telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) + domain-logic |
| P05-M12-01-12 | Early Call record timing | Before ElevenLabs handoff succeeds |
| P05-M12-01-13 | Webhook/idempotency | `provider_events` + terminal guards + `call_events` dedupe |
| P05-M12-01-14 | Required failure routes | UNKNOWN, UNASSIGNED, INACTIVE, CROSS_BUSINESS, UNSYNCED, etc. |
| P05-M12-01-15 | Language runtime | Business/Agent policy; multilingual detection; no IVR menu |
| P05-M12-01-16 | Knowledge routing | Agent-assigned sources only (M07) |
| P05-M12-01-17 | Voice routing | M08 catalogue; M09 optional for `business_clone` |
| P05-M12-01-18 | Tenant safety chain | Phone → Business → Agent → Knowledge → Voice → mapping |
| P05-M12-01-19 | n8n exclusion | Forbidden in realtime audio |
| P05-M12-01-20 | Dependencies | M06,M07,M08,M10,M11 required; M09 optional for clones |

## M10 / M11 / M12 boundary (locked)

| Concern | M10 | M11 | M12 |
| --- | --- | --- | --- |
| Twilio SDK | Adapter only | Via port | Never |
| Webhook endpoints | Hosts + signature verify | — | Orchestration logic |
| Phone inventory | — | Owner | Read for routing |
| Agent assignment | — | Owner | Read active assignment |
| Call routing decisions | Prototype TwiML only until M12 | — | **Owner** |
| Call / event persistence | Prototype create via `CallsService` | — | **Owner** (extend) |
| Portal phone UI | — | Owner | — |
| Portal call UI | — | — | Minimal list/detail |

**Rule:** M12 refactors `TwilioService.handleIncomingCall` to delegate to the orchestrator. M10 webhook URLs configured by M11 remain unchanged.

## Dependencies (locked)

| Required | Optional |
| --- | --- |
| M06 — ElevenLabs Voice Agent Provider (synced agent mapping) | M09 — when Agent uses `business_clone` voice |
| M07 — Knowledge Base (assigned sources) | |
| M08 — Voice Library (selected voice) | |
| M10 — Twilio Telephony Provider (webhooks + TwiML) | |
| M11 — Phone Number Management (canonical numbers + assignment) | |

M05 Agents implicit via M11 assignments. **M12 gate** must verify greeting, instructions, **assigned** knowledge, and **selected** voice on a real phone call.

Prerequisites satisfied: **M10 gate ✅ · M11 gate ✅** (28 August 2026).

## Runtime resolution order (locked)

See [telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) — 17 steps from webhook receipt through final call state. Implementation detail: [domain-logic.md](./domain-logic.md).

## Call record timing (locked)

| When | Action |
| --- | --- |
| After routing context resolved (or failure classified) | Create/update local **Call** |
| Before ElevenLabs handoff | Call must exist with `business_id` when known |
| Handoff fails | Call remains with `failed` + `failure_code` + safe message |

Do **not** defer Call creation until ElevenLabs accepts the session.

## Provider identifiers (locked)

Store as mappings, not canonical primary keys:

| Provider | Example identifier |
| --- | --- |
| Twilio | Call SID → `call_provider_mappings` |
| ElevenLabs | Conversation id → second mapping row on same Call |

Link via `call_provider_mappings` and sanitized event payloads. Retain legacy `calls.twilio_call_sid` for compatibility.

## Webhook idempotency (locked)

- Inbound Twilio webhook: one Call per `(provider, external_call_id)`  
- Status callbacks: dedupe via `provider_events.external_event_id`  
- ElevenLabs callbacks: same pattern when added in 12.02  
- Terminal transitions: no-op if already terminal  
- Late/out-of-order events: must not corrupt final state  
- Normalized audit: `call_events` with optional `(call_id, event_type, source, external_event_id)` unique key  

## Required failure routes (locked)

| Code | Condition |
| --- | --- |
| `UNKNOWN_NUMBER` | E.164 not in `phone_numbers` |
| `UNASSIGNED_NUMBER` | No active assignment |
| `INACTIVE_AGENT` | Agent inactive/archived |
| `CROSS_BUSINESS_MAPPING` | Assignment integrity violation |
| `UNSYNCED_AGENT` | Missing/invalid ElevenLabs mapping |
| `PROVIDER_UNAVAILABLE` | ElevenLabs unreachable/rejects |
| `HANDOFF_FAILED` | Handoff adapter error after Call exists |
| `TWILIO_VALIDATION_FAILURE` | Bad webhook signature |
| `KNOWLEDGE_NOT_READY` | Assigned knowledge not usable |
| `VOICE_NOT_READY` | Voice unavailable/incompatible |
| `DUPLICATE_WEBHOOK` | Safe idempotent no-op |

No wrong-tenant routing. No secret exposure. No silent fallback Agent.

## Language runtime (locked)

- Business supported languages + default/fallback  
- Agent single or multilingual with auto-detect / switching among supported set only  
- No manual IVR language menu in MVP  

## Knowledge runtime (locked)

Only knowledge **assigned to the resolved Agent** — not all Business sources. See [domain-logic.md](./domain-logic.md).

## Voice runtime (locked)

Agent `voice_id` → M08 asset. Clone requires M09 ready clone. Catalogue voice does not require M09.

## n8n boundary (locked)

**Forbidden:** n8n in realtime audio path (Twilio ↔ ElevenLabs).

**Allowed later:** async post-call events only (M22).

## Tenant safety (locked)

Entire chain must resolve within one Business: Phone → Business → Agent → Knowledge → Voice → Provider mapping.

## Related design docs (12.01)

| Doc | Topic |
| --- | --- |
| [domain-logic.md](./domain-logic.md) | Orchestrator, resolver, idempotency, RBAC |
| [data-model.md](./data-model.md) | `calls` extensions, `call_events` |
| [api-contracts.md](./api-contracts.md) | Webhooks + portal REST |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal call list/detail |
| [../telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) | Canonical cross-module lock |

## Frontend (locked — 12.03)

Minimal portal call visibility — see [frontend-surfaces.md](./frontend-surfaces.md):

- Incoming call appears in list/detail  
- Business, Agent, direction, status  
- Caller/called where policy allows  
- Start/end/duration when available  

No transcript/summary UI (M14–M16).

## M12 acceptance tests (locked — 12.04 expansion)

1. Real inbound call reaches correct Business  
2. Correct Agent resolved  
3. Greeting correct  
4. Instructions/personality correct  
5. Assigned Knowledge used  
6. Unassigned Business knowledge **not** implicitly used  
7. Selected Voice used  
8. Multilingual detection when enabled  
9. Call record created  
10. Twilio Call SID linked  
11. ElevenLabs conversation ID linked when available  
12. Completion persisted  
13. Unknown number handled  
14. Unassigned number handled  
15. Inactive Agent handled  
16. Unsynced Agent handled  
17. Invalid webhook signature rejected  
18. Duplicate webhook does not duplicate Call  
19. Duplicate status callback idempotent  
20. Provider failure persists safe failure state  
21. Cross-business routing impossible  
22. No credential exposure  
23. Regression M05–M11  
24. Manual real-phone journey before gate  

## Out of scope (M12)

| Item | Module |
| --- | --- |
| Outbound calls | M13 |
| Call management filters/history depth | M14 |
| Transcripts | M15 |
| Summaries / analysis | M16 |
| n8n realtime | Never |
| OpenAI Realtime / Retell / Telnyx | M30+ |
| Phone purchase/assign UI | M11 |

## Manual QA requirements (12.05)

Real Twilio number, expected Business/Agent, assigned knowledge, selected voice, multilingual cases, provider mapping evidence, DB call row + `call_events`, all failure routes, webhook retry tests, screenshot/log evidence per VS-GLOBAL-16. Deliverable: `docs/module-12/M12_Incoming_AI_Calls_manual-qa-guide.md`.

## Prototype migration note

M0/M10 currently return TwiML connecting all inbound calls to `/voice/stream` (OpenAI Realtime prototype). M12 **replaces** that path for production routing when orchestrator resolves a Business Agent. Dev-only fallback flag documented in [api-contracts.md](./api-contracts.md).
