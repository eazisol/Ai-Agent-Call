# Module 12 — Domain logic (12.01 technical design)

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Submodule | 12.01 — Scope & Technical Design |
| Status | **Design locked** — 28 August 2026 |

## Module boundary

| M12 owns | M12 does not own |
| --- | --- |
| Inbound runtime resolution (number → business → agent → knowledge → voice → ElevenLabs) | Phone inventory CRUD (M11) |
| Early Call + `call_events` creation | Twilio REST SDK usage (M10 adapter) |
| Tenant-safe routing decisions | Webhook signature crypto (M10 port) |
| Failure routes + safe TwiML reject/handoff | Agent CRUD / sync UI (M05/M06) |
| Minimal portal call list/detail APIs | Transcripts, summaries, deep call management (M14–M16) |
| ElevenLabs inbound handoff orchestration | Outbound dial (M13) |
| Idempotent lifecycle transitions | n8n in realtime audio path |

**Rule:** M12 domain services inject **ports** (`TELEPHONY_PROVIDER_PORT`, new `INBOUND_CALL_HANDOFF_PORT`, repositories). No `twilio` or `elevenlabs` SDK imports in `modules/calls/` domain services.

## NestJS module shape (12.02 target)

```text
IncomingCallsModule  (or extended CallsModule)
├── InboundCallOrchestratorService     entry from Twilio webhook path
├── CallRoutingResolverService         17-step resolution chain
├── CallLifecycleService               status + call_events + terminal guards
├── CallsController                    tenant-scoped GET /calls (remove PrototypeOnlyGuard)
├── call-permissions.ts                RBAC matrix
├── entities/
│   ├── call.entity.ts                 extended columns
│   └── call-event.entity.ts           new
└── imports:
    ├── PhoneNumbersModule             read phone + assignment
    ├── AgentsModule                   agent + config + prompts + mapping
    ├── KnowledgeModule                assigned sources + sync readiness
    ├── VoicesModule / VoiceClonesModule
    ├── TwilioModule                   webhook controller stays; delegates orchestration
    └── BusinessesModule               ownership validation for portal APIs
```

**Webhook wiring (12.02 refactor):**

```text
POST /webhooks/twilio/incoming-call
  → Twilio signature guard (M10)
  → TwilioService.handleIncomingCall(body)
       → InboundCallOrchestratorService.handleTwilioInbound(body)
            → resolve / fail / create Call / handoff / return TwiML
```

Status callbacks remain in `TwilioService` but update Calls through `CallLifecycleService` with terminal idempotency.

## Runtime resolution order (locked — 17 steps)

Implementation maps 1:1 to [telephony-inbound-routing-lock.md](../telephony-inbound-routing-lock.md):

| Step | Action | Failure code |
| --- | --- | --- |
| 1 | Receive Twilio inbound webhook | — |
| 2 | Verify signature (M10) | `TWILIO_VALIDATION_FAILURE` → 403, no Call |
| 3 | Normalize `To` → E.164 | — |
| 4 | Lookup `phone_numbers` by E.164, `status = active` | `UNKNOWN_NUMBER` |
| 5 | Resolve Business from `phone_numbers.business_id` | — |
| 6 | Load active `phone_number_assignments` row | `UNASSIGNED_NUMBER` |
| 7 | Load Agent; validate exists, same Business, `status = active` | `INACTIVE_AGENT` |
| 8 | Load Agent config + prompts (greeting, instructions, languages) | — |
| 9 | Resolve **assigned** knowledge only (`agent_knowledge_sources`) | `KNOWLEDGE_NOT_READY` if assigned source not synced/active |
| 10 | Resolve selected voice (`agent_configs.voice_id` → M08; clone → M09) | `VOICE_NOT_READY` |
| 11 | Load ElevenLabs mapping (`agent_provider_mappings`, `sync_status = synced`) | `UNSYNCED_AGENT` |
| 12 | Validate provider readiness (`VoiceAgentSyncPort.getStatus` optional probe) | `PROVIDER_UNAVAILABLE` |
| 13 | **Create/update local Call** (`business_id`, `agent_id`, `phone_number_id`, `direction=inbound`, `status=started`) + Twilio mapping | — |
| 14 | Build handoff + return TwiML (ElevenLabs ConvAI) | `HANDOFF_FAILED` / `PROVIDER_UNAVAILABLE` |
| 15 | Receive lifecycle callbacks (Twilio status + ElevenLabs webhooks) | — |
| 16 | Persist normalized `call_events` | — |
| 17 | Persist terminal `calls.status` + `ended_at` / `duration` | — |

**Integrity check (step 7):** if `agents.business_id ≠ phone_numbers.business_id` → `CROSS_BUSINESS_MAPPING` + audit log.

## Early Call record timing (locked)

Call row is created at **step 13**, after routing context is known or a failure stage is classified.

| Scenario | Call row | `status` | `failure_code` |
| --- | --- | --- | --- |
| Happy path | Yes | `started` → `in_progress` → terminal | null |
| Routing failure (unknown/unassigned/inactive) | Yes (audit) | `failed` | matching code |
| Handoff failure after Call exists | Yes | `failed` | `HANDOFF_FAILED` or `PROVIDER_UNAVAILABLE` |
| Invalid Twilio signature | No | — | — |

Never defer Call creation until ElevenLabs accepts the session.

## Inbound handoff port (new — 12.02)

Extend provider boundary without coupling domain to Twilio TwiML or ElevenLabs URLs:

```typescript
export type ResolvedInboundCall = {
  callId: string;
  externalCallId: string; // Twilio CallSid
  callerNumber?: string;
  receiverNumber?: string;
  businessId: string;
  agentId: string;
  externalAgentId: string; // ElevenLabs ConvAI agent id
  greeting: string;
  // runtime projection already validated in resolver
};

export interface InboundCallHandoffPort {
  readonly providerName: string;
  isConfigured(): boolean;
  buildConnectResponse(input: ResolvedInboundCall): string; // TwiML XML for M12 MVP
  buildFailureResponse(input: {
    externalCallId: string;
    failureCode: string;
    safeMessage: string;
  }): string;
}

export const INBOUND_CALL_HANDOFF_PORT = Symbol('INBOUND_CALL_HANDOFF_PORT');
```

**12.02 adapter:** `ElevenLabsInboundHandoffAdapter` in `providers/elevenlabs/` implementing TwiML that connects Twilio audio to the synced ConvAI agent (native ElevenLabs Twilio bridge URL or ConvAI stream endpoint — spike in 12.02, behavior locked here as **agent-scoped handoff only**).

**Dev fallback (non-production):** When `INBOUND_CALL_DEV_STREAM_FALLBACK=true` and handoff port not configured, M10 prototype `/voice/stream` may remain for local dev only — **not** used when Business routing resolves in staging/production.

## Knowledge runtime (locked)

```text
assignedSourceIds = agent_knowledge_sources for resolved agentId
for each assignedSourceId:
  require knowledge_sources.status = active
  require knowledge_provider_mappings.sync_status = synced (when provider = elevenlabs)
```

Business library sources **not** assigned to this Agent are never injected at runtime. Empty assignment set is valid (agent uses prompts only).

## Voice runtime (locked)

```text
voiceId = agent_configs.voice_id
if null → use M06 voice_preference heuristic (already on synced ElevenLabs agent)

if voice_assets.source_type = provider_catalog:
  resolve voice_provider_mappings.external_voice_id (M08)

if voice_assets.source_type = business_clone:
  require M09 clone status ready + same business_id
  resolve clone external voice id
```

Mismatch or archived voice → `VOICE_NOT_READY`.

## Language runtime (locked)

Resolve effective language policy (Business inherit or Agent override) before handoff:

- Single-language: use default/fallback only  
- Multilingual: pass supported set + detection/switching flags to handoff payload  
- No IVR “press 1 for English” in MVP  

Unsupported provider language → warning at sync time (M06); at call time use fallback language, do not cross-tenant fallback.

## Webhook idempotency (locked)

### Inbound Twilio voice webhook

- One Call per `(provider='twilio', external_call_id=CallSid)` via `call_provider_mappings` unique constraint (existing M00).  
- Duplicate inbound webhook → return same TwiML response; no second Call.  
- Record `provider_events` + `call_events` only on first processing.

### Twilio status callbacks

- Dedupe via `provider_events (provider, external_event_id)`.  
- Composite id: `{CallSid}:{CallStatus}:{SequenceNumber|Timestamp}`.  
- Terminal transitions (`completed`, `failed`, …): if Call already terminal → no-op update.

### ElevenLabs callbacks (12.02)

- New routes under `/api/v1/webhooks/elevenlabs/...` with provider auth (HMAC or shared secret — finalize in 12.02 spike).  
- Link conversation id → `call_provider_mappings` when first seen.  
- Same terminal no-op rules.

## CallLifecycleService responsibilities

| Method | Purpose |
| --- | --- |
| `createInboundCall` | Transaction: Call + twilio mapping + initial events |
| `markInProgress` | After connect signal |
| `markCompleted` | Terminal success + duration |
| `markFailed` | Terminal failure + failure_code |
| `appendCallEvent` | Idempotent insert into `call_events` |
| `linkProviderCallId` | Add elevenlabs mapping row |

Terminal guard pseudocode:

```text
if call.status in (completed, failed): return (no-op)
```

## Failure routes (locked)

| Code | HTTP/TwiML behavior | Call row |
| --- | --- | --- |
| `UNKNOWN_NUMBER` | Safe reject TwiML / brief message | Optional audit row without business_id |
| `UNASSIGNED_NUMBER` | Safe reject | Yes with business_id |
| `INACTIVE_AGENT` | Safe reject | Yes |
| `CROSS_BUSINESS_MAPPING` | Safe reject + error log | Yes |
| `UNSYNCED_AGENT` | Safe reject | Yes |
| `KNOWLEDGE_NOT_READY` | Safe reject | Yes |
| `VOICE_NOT_READY` | Safe reject | Yes |
| `PROVIDER_UNAVAILABLE` | Safe reject | Yes, `failed` |
| `HANDOFF_FAILED` | Safe reject | Yes, `failed` |
| `TWILIO_VALIDATION_FAILURE` | 403 JSON | No |
| `DUPLICATE_WEBHOOK` | 200 same response | No duplicate side effects |

No wrong-tenant routing. No silent fallback to another Agent. No secrets in TwiML or logs.

## Portal RBAC (design)

New `call-permissions.ts`:

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| `list_calls` | ✓ | ✓ | ✓ | ✓ |
| `view_call` | ✓ | ✓ | ✓ | ✓ |

All queries scoped to active Business. Caller number visibility follows Business privacy policy (M12 MVP: show E.164 to all members).

## Error codes (domain)

| Code | HTTP | When |
| --- | --- | --- |
| `CALL_NOT_FOUND` | 404 | Wrong id or cross-business |
| `ROUTING_*` | n/a (webhook) | See failure routes |
| `WEBHOOK_SIGNATURE_INVALID` | 403 | Twilio/ElevenLabs auth failure |

## n8n boundary (locked)

**Forbidden:** any n8n workflow in Twilio ↔ ElevenLabs audio path.

**Allowed later:** post-call async triggers on `CALL_COMPLETED` / `CALL_FAILED` (M22).

## Security (design)

| Control | Rule |
| --- | --- |
| Tenant isolation | `calls.business_id = activeBusinessId` on all portal reads |
| Webhook auth | Signature validation before orchestrator |
| PII in logs | Mask caller E.164 in info logs optional; never log auth tokens |
| Cross-business | Resolver hard-fails; never pick “any” agent |

## 12.02 implementation notes (forward pointer)

| Item | Action |
| --- | --- |
| Migration | Extend `calls` + create `call_events` |
| Refactor | `TwilioService.handleIncomingCall` → orchestrator |
| Port | `INBOUND_CALL_HANDOFF_PORT` + ElevenLabs adapter |
| Controller | Tenant-scoped `CallsController`; remove `PrototypeOnlyGuard` |
| Tests | Unit resolver chain + e2e webhook idempotency + cross-business |
| ElevenLabs webhooks | Add controller + signature strategy |
