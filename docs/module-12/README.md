# Module 12 — Incoming AI Calls

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Phase | P05 — AI Calling MVP |
| Status | **12.04/12.05 complete** — 28 August 2026; **M12-GATE pending real-phone sign-off** |
| Depends on | **M06, M07, M08, M10, M11** (M09 optional for cloned voices) |
| Blocks | M13 Outbound, M14 Call Management depth |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Objective, boundaries, checklist mapping, failure routes |
| [domain-logic.md](./domain-logic.md) | Orchestrator, 17-step resolver, idempotency, ports |
| [data-model.md](./data-model.md) | `calls` extensions, `call_events` |
| [api-contracts.md](./api-contracts.md) | Twilio/ElevenLabs webhooks, portal `/calls` |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal list/detail UX |
| [M12_Incoming_AI_Calls_manual-qa-guide.md](./M12_Incoming_AI_Calls_manual-qa-guide.md) | Manual QA handoff + sign-off |
| [../telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md) | Canonical M10/M11/M12 routing lock |

## Objective (one line)

Connect **Twilio inbound calls** to the correct **Business → Agent → Knowledge → Voice → ElevenLabs** runtime with early Call records, idempotent webhooks, and safe failure handling.

## Architecture lock (Phase 05)

```text
Caller → Twilio → M12 resolve (M11 phone + assignment)
       → validate Agent / Knowledge / Voice / ElevenLabs sync
       → early Call + call_events
       → ElevenLabs ConvAI handoff (no n8n in audio path)
       → lifecycle webhooks → terminal status
```

## Submodule status

| Submodule | Status |
| --- | --- |
| 12.01 Scope & Technical Design | **Complete** — this folder |
| 12.02 Backend, Persistence & API | **Complete** — 28 August 2026 |
| 12.03 Frontend & Integrations | **Complete** — 28 August 2026 |
| 12.04 Security & QA | **Complete** — automated tests + manual QA guide |
| 12.05 Documentation & Acceptance | **Complete** — 28 August 2026 |

## Database / API / provider changes (12.02–12.05)

| Change | Detail |
| --- | --- |
| Migration | `1756140000000-IncomingAiCalls` |
| Tables | `calls` extended; `call_events` new |
| Webhooks | Twilio inbound refactor; ElevenLabs `conversation-events` |
| Portal API | `GET /calls`, `GET /calls/:id` (tenant-scoped) |
| Env vars | `INBOUND_CALL_DEV_STREAM_FALLBACK`, `ELEVENLABS_WEBHOOK_SECRET` |
| Frontend | `src/lib/calls-api.ts`, `/calls`, `/calls/[id]` |

See [api-contracts.md](./api-contracts.md) and [data-model.md](./data-model.md).

## Module gate

**M12 Incoming AI Calls = COMPLETE ✅** only after real-phone manual QA sign-off in [M12_Incoming_AI_Calls_manual-qa-guide.md](./M12_Incoming_AI_Calls_manual-qa-guide.md) and checklist `P05-M12-GATE`.
