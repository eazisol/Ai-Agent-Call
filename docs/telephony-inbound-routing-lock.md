# EaziAICall — Final Telephony + Incoming Call Routing Lock

| Field | Value |
| --- | --- |
| Scope | M10 Twilio Telephony Provider · M11 Phone Number Management · M12 Incoming AI Calls |
| Status | **Locked** — 28 August 2026 |
| Type | Roadmap / architecture refinement only |

## Canonical ownership hierarchy

```text
Organization
└── Business
    ├── Phone Numbers
    │    └── Active Agent Assignment (MVP: ≤1 active per number)
    │
    ├── Shared Knowledge (M07)
    ├── Shared Voice Library (M08)
    ├── Shared Cloned Voices (M09, optional)
    │
    └── Agents (M05)
         ├── Assigned Knowledge (subset of Business knowledge)
         ├── Selected Voice (M08 / M09 clone when applicable)
         ├── Language Configuration
         ├── Behavior / Instructions / Escalation
         └── ElevenLabs Provider Mapping (M06)
```

**Core rules**

- Organization is the top-level tenant container.
- Business is the operational unit.
- Phone numbers belong to **Business** (`phone_numbers.business_id`).
- Agents belong to **Business**.
- A phone number may only be assigned to an Agent from the **same Business**.
- MVP: one phone number has **at most one active** Agent assignment.
- One Agent may have **multiple** phone numbers if product rules allow.
- Provider systems are **not** the source of truth — **EaziAICall PostgreSQL is canonical**.

---

## FINAL INBOUND CALL ROUTING (MVP)

```text
Incoming Caller
      ↓
Twilio
      ↓
Called Phone Number (E.164)
      ↓
EaziAICall Phone Number Record (M11)
      ↓
Business (phone_numbers.business_id)
      ↓
Assigned Active Agent (M11 assignment)
      ↓
Validate Agent + Provider Sync / Readiness
      ↓
Agent Configuration
      ├── Greeting / Instructions / Personality
      ├── Language policy (single or multilingual + detection)
      ├── Assigned Knowledge only (M07)
      └── Selected Voice (M08; M09 if business_clone)
      ↓
ElevenLabs Provider Mapping (M06)
      ↓
ElevenLabs Agent — AI Conversation
      ↓
EaziAICall Call + normalized Call Events (M12)
```

---

## Module boundaries

| Module | Owns | Does NOT own |
| --- | --- | --- |
| **M10** | `TelephonyProviderPort`, Twilio auth, search/purchase/configure/release **provider methods**, inbound + status webhooks, signature verification, normalized Twilio errors/events, provider health, idempotent webhook/event handling at adapter layer | Business phone inventory, agent assignment, call-to-agent routing, customer phone UI |
| **M11** | Canonical `phone_numbers`, `phone_number_assignments`, Business ownership, search/purchase/import UI + APIs, assign/unassign/release lifecycle, reconciliation when provider vs local state diverges | Twilio SDK in domain services, ElevenLabs conversation, full call runtime |
| **M12** | Runtime resolution (number → business → agent → knowledge → voice → ElevenLabs), early Call record creation, provider handoff, lifecycle events, failure routes, tenant-safe routing, minimal call visibility in portal | Phone inventory CRUD, provider number purchase, transcripts/summary (M14–M16), n8n in realtime audio |

---

## M10 — credential policy (locked)

Twilio credentials are **platform/server-managed** for MVP.

| Secret | Policy |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Server env only |
| `TWILIO_AUTH_TOKEN` | Server env only — **never** stored in DB or returned to clients |
| Other Twilio secrets | Server env only if required |

- No Bring Your Own Twilio (BYOT) / customer-connected Twilio accounts in M10–M12 MVP.
- Future BYOT requires an explicit later module.

---

## M10 — webhook policy (locked)

Webhook signature validation must use the **externally visible canonical callback URL** Twilio POSTed to.

Account for:

- Reverse proxy / load balancer
- Docker ingress
- Tunnel (ngrok, Cloudflare Tunnel)
- Staging vs production domain
- Path prefix (`/api/v1/webhooks/twilio/...`)

`PUBLIC_BASE_URL` (or equivalent) must match the origin Twilio uses when signing. Operational detail: [module-10/operational-policy.md](./module-10/operational-policy.md).

M10 receives webhooks; **M12 performs business routing decisions** using M11 inventory. M10 must not route to an Agent by itself in production MVP.

---

## M10 — persistence policy (locked)

- Do **not** force extra provider log tables unless required.
- Existing `provider_events`, `call_provider_mappings`, optional `telephony_provider_mappings` are sufficient for MVP when failures are observable, provider IDs are preserved, duplicates are handled, and no secrets are stored.
- **Never** persist Auth Token.

---

## M11 — phone number record (locked)

Canonical table: `phone_numbers` with required **`business_id`** FK.

| Field | Notes |
| --- | --- |
| `id` | UUID PK |
| `business_id` | Required operational ownership FK |
| `provider` | e.g. `twilio` |
| `provider_number_id` / `provider_sid` | Unique per provider where possible |
| `phone_number_e164` | Normalized E.164 |
| `country` | ISO country |
| `capabilities` | voice/sms/mms JSON or flags |
| `status` | See lifecycle below |
| `created_at` / `updated_at` | Audit |

**Lifecycle statuses (MVP enum — names finalized at implementation):**

`provisioning` · `active` · `release_pending` · `released` · `failed`

Organization is derived via `businesses.organization_id` — do not duplicate `organization_id` on `phone_numbers` unless a proven query need emerges.

---

## M11 — assignment model (locked)

Table: `phone_number_assignments` (or equivalent).

| Rule | MVP |
| --- | --- |
| Phone → Agent | **Zero or one ACTIVE** assignment per phone number |
| Agent eligibility | Exists, same Business, active (not archived) where required |
| Cross-business | **Forbidden** — Business A number → Business B agent must fail |

---

## M11 — purchase / import / release (locked)

**Purchase:** User → Business context → search (M10 port) → select → provision (M10) → create/update canonical record → configure webhooks → `active`. Provider success alone is **not** product success if local persistence fails — require reconciliation.

**Import:** Map a number **already controlled** by the configured Twilio account into EaziAICall. Not arbitrary porting. Validate provider control; prevent duplicate canonical rows.

**Release:** Destructive. Flow: detect active assignment → require unassign / explicit confirmation → provider release → provider confirms → local state `released`. Prefer historical record over immediate physical delete.

**Idempotency required:** purchase, import, assign, unassign, release.

---

## M12 — dependencies (locked)

| Required before M12 gate | Optional |
| --- | --- |
| M06 — ElevenLabs Voice Agent Provider | M09 — Voice Cloning **only when Agent uses `business_clone` voice** |
| M07 — Knowledge Base | |
| M08 — Voice Library | |
| M10 — Twilio Telephony Provider | |
| M11 — Phone Number Management | |

M05 (Agents) remains implicit via M11 assignment target. M12 acceptance verifies real Agent behavior with correct greeting, instructions, **assigned** knowledge, and **selected** voice.

---

## M12 — runtime resolution order (locked)

1. Twilio inbound webhook received  
2. Verify Twilio signature (M10)  
3. Normalize called number to canonical E.164  
4. Resolve EaziAICall `phone_numbers` row  
5. Resolve Business from `phone_number.business_id`  
6. Resolve current **active** Agent assignment  
7. Validate Agent (exists, same Business, active, not archived)  
8. Load Agent configuration (greeting, personality, instructions, languages, detection, escalation)  
9. Resolve **assigned** Knowledge for this Agent only  
10. Resolve **selected** Voice for this Agent  
11. Resolve ElevenLabs provider mapping (M06)  
12. Validate provider readiness / sync status  
13. Create or initialize local **Call** record (**before** ElevenLabs handoff succeeds)  
14. Route/connect call to ElevenLabs  
15. Receive lifecycle/provider callbacks  
16. Persist normalized Call Events  
17. Persist final call status / end state  

---

## M12 — call record timing (locked)

Create Call **early** — after routing context is resolved (or failure stage identified), **before** provider handoff.

If ElevenLabs handoff fails, Call still exists with `failed` status, failure stage, and normalized diagnostic fields (no raw secrets).

Do **not** create Call only after ElevenLabs succeeds.

---

## M12 — webhook idempotency (locked)

Twilio and ElevenLabs may retry webhooks.

Require:

- Idempotent inbound webhook handling  
- Idempotent status callbacks  
- Duplicate provider event protection (`provider_events` unique keys)  
- Safe ordering when callbacks arrive late/out of order  
- No duplicate Call for same provider call SID  
- No duplicate terminal transitions  

Strategy: composite `external_event_id` per provider + event type; call identity via `(provider, external_call_id)` mapping; terminal state transitions are no-ops when already terminal.

---

## M12 — required failure routes (locked)

| Route | Behavior |
| --- | --- |
| **UNKNOWN NUMBER** | Called number not in EaziAICall — reject safely; optional Call with failure stage |
| **UNASSIGNED NUMBER** | Phone exists, no active Agent — reject safely |
| **INACTIVE AGENT** | Assigned Agent inactive/archived — reject safely |
| **CROSS-BUSINESS INVALID MAPPING** | Integrity violation — reject; audit log |
| **UNSYNCED AGENT** | No valid ElevenLabs mapping — reject safely |
| **PROVIDER UNAVAILABLE** | ElevenLabs cannot accept call — Call exists; failed state |
| **TWILIO VALIDATION FAILURE** | Invalid signature — 403; no routing |
| **KNOWLEDGE NOT READY** | Required assigned knowledge unavailable — fail safely |
| **VOICE NOT READY** | Selected voice unavailable/incompatible — fail safely |
| **DUPLICATE WEBHOOK** | Already processed — idempotent no-op |

Every failure: no wrong tenant routing, no secret exposure, no silent fallback to another Business/Agent.

---

## M12 — language runtime (locked)

Align with M05 language architecture:

- Business: supported languages + default/fallback  
- Agent: single-language **or** multilingual with optional auto-detect and mid-call switching among **supported** languages only  
- Default language is fallback/initial behavior — not manual IVR language selection in MVP  

---

## M12 — knowledge runtime (locked)

Use **Agent-assigned** knowledge only (M07 assignment model). Agent A does not receive Business sources assigned only to Agent B.

---

## M12 — voice runtime (locked)

Use Agent **selected** voice (`agent_configs.voice_id` → `voice_assets`).

- Standard catalogue voice: M08 only  
- `business_clone`: M09 clone must be valid/authorized/ready  

---

## M12 — n8n boundary (locked)

**n8n must NOT participate in the realtime audio path.**

Forbidden: Twilio audio → n8n → ElevenLabs.

Allowed later: asynchronous events after call (`CALL_COMPLETED`, `CALL_FAILED`, etc.) — post-realtime only.

---

## M12 — tenant safety (locked)

Verify entire chain resolves within one Business:

Phone Number → Business → Agent → Knowledge → Voice → Provider Mapping

No cross-business fallback. No “find any matching agent”. No provider-ID-only lookup that bypasses Business ownership.

---

## Frontend expectations (locked)

| Module | Portal |
| --- | --- |
| M10 | No customer phone UI; optional `/settings/integrations` provider health (owner/admin) |
| M11 | List, search, purchase, import, assign, unassign, release, status, capabilities |
| M12 | Minimal incoming call record: Business, Agent, direction, status, caller/called, start/end/duration |

Transcripts/analysis remain M14–M16.

---

## Manual QA handoff requirements (preserved VS-GLOBAL-16)

| Module | QA guide must cover |
| --- | --- |
| M10 | Credentials, webhook URL setup, signature verification, provider errors, number methods, retry/idempotency |
| M11 | Business ownership, search, purchase, import, assign, unassign, release, cross-business blocks, reconciliation |
| M12 | Real inbound call, Twilio number, expected Business/Agent, assigned knowledge, selected voice, multilingual, provider mapping, DB call record, all failure routes, webhook retry, evidence |

Deliverables: `docs/module-10/M10_*_manual-qa-guide.md`, `docs/module-11/M11_*`, `docs/module-12/M12_*` at module gate (10.05 / 11.05 / 12.05).

---

## Cross-references

- [module-10/README.md](./module-10/README.md)  
- [module-11/README.md](./module-11/README.md)  
- [module-12/README.md](./module-12/README.md)
