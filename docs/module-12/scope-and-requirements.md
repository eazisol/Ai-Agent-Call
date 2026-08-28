# Module 12 — Scope & requirements (12.01 roadmap lock)

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Submodule | 12.01 — Scope & Technical Design |
| Status | **Locked** — 28 August 2026 (documentation only; not implemented) |

## Objective

Runtime orchestration connecting **Twilio + Phone Number + Business + Agent + Knowledge + Voice + ElevenLabs** into a tenant-safe inbound AI call with observable Call records and normalized events.

## Dependencies (locked)

| Required | Optional |
| --- | --- |
| M06 — ElevenLabs Voice Agent Provider | M09 — only when Agent uses `business_clone` voice |
| M07 — Knowledge Base | |
| M08 — Voice Library | |
| M10 — Twilio Telephony Provider | |
| M11 — Phone Number Management | |

M05 Agents implicit via M11 assignments. M12 gate **must** verify greeting, instructions, **assigned** knowledge, and **selected** voice on a real call.

## Runtime resolution order (locked)

See [telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) — 17 steps from webhook receipt through final call state.

## Call record timing (locked)

| When | Action |
| --- | --- |
| After routing context resolved (or failure classified) | Create/update local **Call** |
| Before ElevenLabs handoff | Call must exist |
| Handoff fails | Call remains with `failed` + failure stage + safe message |

Do **not** defer Call creation until ElevenLabs accepts the session.

## Provider identifiers (locked)

Store as mappings, not canonical primary keys:

| Provider | Example identifier |
| --- | --- |
| Twilio | Call SID |
| ElevenLabs | Conversation / call ID |

Link via `call_provider_mappings` and event payloads (hashed/normalized).

## Webhook idempotency (locked)

- Inbound Twilio webhook: one Call per `(provider, external_call_id)`  
- Status callbacks: dedupe via `provider_events.external_event_id`  
- ElevenLabs callbacks: same pattern when added  
- Terminal transitions: no-op if already terminal  
- Late/out-of-order events: must not corrupt final state  

## Required failure routes (locked)

| Code | Condition |
| --- | --- |
| UNKNOWN_NUMBER | E.164 not in `phone_numbers` |
| UNASSIGNED_NUMBER | No active assignment |
| INACTIVE_AGENT | Agent inactive/archived |
| CROSS_BUSINESS_MAPPING | Assignment integrity violation |
| UNSYNCED_AGENT | Missing/invalid ElevenLabs mapping |
| PROVIDER_UNAVAILABLE | ElevenLabs unreachable/rejects |
| TWILIO_VALIDATION_FAILURE | Bad webhook signature |
| KNOWLEDGE_NOT_READY | Assigned knowledge not usable |
| VOICE_NOT_READY | Voice unavailable/incompatible |
| DUPLICATE_WEBHOOK | Safe idempotent no-op |

No wrong-tenant routing. No secret exposure. No silent fallback Agent.

## Language runtime (locked)

- Business supported languages + default/fallback  
- Agent single or multilingual with auto-detect / switching among supported set only  
- No manual IVR language menu in MVP  

## Knowledge runtime (locked)

Only knowledge **assigned to the resolved Agent** — not all Business sources.

## Voice runtime (locked)

Agent `voice_id` → M08 asset. Clone requires M09 ready clone. Catalogue voice does not require M09.

## n8n boundary (locked)

**Forbidden:** n8n in realtime audio path (Twilio ↔ ElevenLabs).

**Allowed later:** async post-call events only.

## Tenant safety (locked)

Entire chain must resolve within one Business: Phone → Business → Agent → Knowledge → Voice → Provider mapping.

## Frontend (locked — 12.03)

Minimal portal call visibility:

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

## Manual QA requirements (12.05)

Real Twilio number, expected Business/Agent, assigned knowledge, selected voice, multilingual cases, provider mapping evidence, DB call row, all failure routes, webhook retry tests, screenshot/log evidence per VS-GLOBAL-16.

## Checklist mapping (12.01 lock)

| ID | Topic | Status |
| --- | --- | --- |
| P05-M12-01-01 … 01-10 | Original items | Locked / expanded |
| P05-M12-01-11 | 17-step resolution order | Locked |
| P05-M12-01-12 | Early Call record timing | Locked |
| P05-M12-01-13 | Webhook idempotency strategy | Locked |
| P05-M12-01-14 | Required failure routes | Locked |
| P05-M12-01-15 | Language runtime | Locked |
| P05-M12-01-16 | Knowledge routing | Locked |
| P05-M12-01-17 | Voice routing (M09 optional) | Locked |
| P05-M12-01-18 | Tenant safety chain | Locked |
| P05-M12-01-19 | n8n excluded from realtime | Locked |
| P05-M12-01-20 | Dependencies M06,M07,M08,M10,M11; M09 optional | Locked |
