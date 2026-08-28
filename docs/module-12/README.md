# Module 12 — Incoming AI Calls

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Phase | P05 — AI Calling MVP |
| Status | **Roadmap locked** — not started |
| Depends on | **M06, M07, M08, M10, M11** (M09 optional for cloned voices) |
| Blocks | M13 Outbound, M14 Call Management depth |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Runtime resolution, failures, idempotency, QA |
| [../telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) | Canonical routing diagram |

## Objective (one line)

Connect **Twilio inbound calls** to the correct **Business → Agent → Knowledge → Voice → ElevenLabs** runtime with early Call records, idempotent webhooks, and safe failure handling.

## Module gate

**M12 Incoming AI Calls = COMPLETE** only after real-phone manual QA and 12.01–12.05 checklist verification.
