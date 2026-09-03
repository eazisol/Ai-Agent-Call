# M12 — Incoming AI Calls — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M12 — Incoming AI Calls |
| Phase | P05 — AI Calling MVP |
| Status | Complete — 28 August 2026 (pending real-phone sign-off) |
| Depends on | **M06, M07, M08, M10, M11** (M09 optional for cloned voices) |
| Blocks | M13 Outbound, M14 Call Management depth |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M12 connects **Twilio inbound calls** to the correct **Business → Agent → Knowledge → Voice → ElevenLabs** runtime. It creates an early Call record before handoff, normalizes lifecycle events from Twilio and ElevenLabs webhooks, handles safe failure routes, and exposes minimal tenant-scoped call history in the portal.

**Role in product:** First end-to-end inbound AI call path — caller dials a business line, platform resolves routing, hands off to ElevenLabs ConvAI, and stores call status for the customer portal.

**Architecture lock:** See `docs/telephony-inbound-routing-lock.md`.

## 2. Delivered scope

### In scope

- Migration `1756140000000-IncomingAiCalls` — extends `calls`, adds `call_events`
- Runtime services: routing resolver, inbound orchestrator, call lifecycle
- Twilio inbound webhook refactor (orchestrator entry)
- ElevenLabs conversation webhook + signed handoff port
- Tenant-scoped `GET /api/v1/calls`, `GET /api/v1/calls/:id`
- Portal `/calls`, `/calls/[id]` with status filters and event timeline
- Integrations page Twilio + ElevenLabs inbound context

### Out of scope (do not file as bugs)

- Transcript viewer / summaries (M15–M16)
- Outbound dial UI (M13)
- Deep call filters, export, analytics (M14)
- Admin global call console (M28)
- Real-time live call indicator
- n8n in realtime audio path
- Customer BYOT Twilio accounts

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| Migrations | `1756140000000-IncomingAiCalls` applied |
| Backend `.env` | See §12 — Twilio, ElevenLabs, `PUBLIC_BASE_URL`, M12 vars |
| Portal session | Active organization (`eazi_org`) + active business (`eazi_biz`) |
| M11 setup | Active phone number assigned to active agent in test business |
| M06 setup | Agent synced to ElevenLabs (`syncStatus=synced`) |
| M07 (optional) | Assigned knowledge published/synced if agent uses knowledge |
| M08/M09 (optional) | Selected voice assigned and mapped if agent uses custom voice |
| Test phone | Mobile or landline to place real inbound call to Twilio number |
| Webhook reachability | `PUBLIC_BASE_URL` must be reachable by Twilio (ngrok/tunnel in dev) |

**Recommended test data**

| Artifact | Example |
| --- | --- |
| Business | "Acme Reception QA" (active) |
| Agent | "Front Desk" (active, synced to ElevenLabs) |
| Phone | E.164 assigned to agent, status Active |
| Greeting | Distinct phrase e.g. "Hello from Acme QA reception." |
| Knowledge | One assigned source synced (if testing knowledge path) |
| Voice | Catalogue or clone voice assigned (if testing voice path) |

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List calls (`GET /calls`) | ✓ | ✓ | ✓ | ✓ |
| View call detail | ✓ | ✓ | ✓ | ✓ |
| See provider links (Twilio SID, ElevenLabs conv id) | ✓ | ✓ | ✓ | ✗ |
| Configure server webhooks / secrets | Server ops | Server ops | — | — |

Portal is read-only for all roles in M12 — no delete/export.

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/calls` | Inbound call history, status filters |
| `/calls/[id]` | Summary, event timeline, transcript placeholder |
| `/settings/integrations` | Twilio status + ElevenLabs inbound context |
| `/phone-numbers` | Prerequisite — assign line to agent |
| `/agents` | Prerequisite — sync agent to ElevenLabs |

## 6. Backend / API surface

### Portal REST

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/calls` | Session + org + business cookies | Default `direction=inbound` |
| GET | `/api/v1/calls/:id` | Session + org + business cookies | Returns `call` + `events[]` |

**Query params (list):** `status`, `direction`, `agentId`, `page`, `limit`

### Webhooks (provider → platform)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/v1/webhooks/twilio/incoming-call` | `X-Twilio-Signature` when `TWILIO_VALIDATE_SIGNATURES=true` |
| POST | `/api/v1/webhooks/twilio/status-callback` | Twilio signature |
| POST | `/api/v1/webhooks/twilio/call-ended` | Twilio signature |
| POST | `/api/v1/webhooks/elevenlabs/conversation-events` | `X-ElevenLabs-Signature` HMAC when `ELEVENLABS_WEBHOOK_SECRET` set |

**Never returned to clients:** Twilio auth token, ElevenLabs API key, webhook secrets, raw provider credential errors with secrets.

## 7. Data and integrations

| Table / artifact | Purpose |
| --- | --- |
| `calls` (extended) | `agent_id`, `phone_number_id`, `direction`, `failure_code`, `failure_stage` |
| `call_events` | Normalized lifecycle timeline |
| `call_provider_mappings` | Links ElevenLabs conversation id to call |
| `provider_events` | Webhook dedupe (Twilio + ElevenLabs) |
| M10 Twilio | Inbound webhook entry, status callbacks |
| M06 ElevenLabs | ConvAI handoff + conversation webhooks |
| M11 phone assignment | Called number → agent resolution |

### Expected DB call record (happy path)

After successful inbound call:

| Field | Expected |
| --- | --- |
| `direction` | `inbound` |
| `status` | progresses `started` → `in_progress` → `completed` (or `failed`) |
| `business_id` | Matches phone number business |
| `agent_id` | Matches active assignment |
| `phone_number_id` | Matches called inventory row |
| `twilio_call_sid` | Populated from webhook |
| `caller_number` / `receiver_number` | E.164 from Twilio payload |
| `call_events` | At least `CALL_RECEIVED`, `ROUTING_RESOLVED`, `CALL_STARTED`; ElevenLabs adds `CALL_CONNECTED` when linked |

Provider mapping row: `provider=elevenlabs`, `external_call_id=<conversation_id>` when ElevenLabs webhook received.

## 8. End-to-end workflows

### WF-1 — Portal call list (read path)

1. Log in with active org + business that has call history.  
2. Open **Calls** in sidebar.  
3. Expect table/card with Started, Direction, Caller, Called number, Agent, Status, Duration.  
4. Use status filter tabs (All / Started / In progress / Completed / Failed).  
5. Empty state links to Phone numbers and Agents when no calls.

### WF-2 — Real inbound call (primary happy path) **REQUIRED for M12 gate**

1. Confirm **Settings → Integrations** shows Twilio Connected + Valid credentials.  
2. Confirm agent is **synced** to ElevenLabs and phone number is **assigned**.  
3. Ensure Twilio number voice webhook points to `{PUBLIC_BASE_URL}/api/v1/webhooks/twilio/incoming-call`.  
4. Place call from external phone to the business Twilio number.  
5. Expect AI agent answers with configured greeting / business context.  
6. Complete call; within reasonable time open **Calls** in portal.  
7. Expect new row: correct Agent name, status `completed` (or `in_progress` then `completed`).  
8. Open detail — event timeline shows received → routing → started → connected → completed.  
9. As owner/admin/manager: expand **Technical references** — Twilio SID present; ElevenLabs conversation id present after webhook.

### WF-3 — Failed routing (unassigned number)

1. Unassign agent from test number (or use unassigned number).  
2. Place inbound call.  
3. Expect safe caller message (not internal error).  
4. Portal shows `failed` row with failure hint (e.g. "Line not assigned").  
5. DB: call row with `failure_code=UNASSIGNED_NUMBER`, events include `ROUTING_FAILED`.

### WF-4 — Cross-business isolation

1. Log in as user with access to Business A and Business B.  
2. Note a call id from Business A.  
3. Switch active business to Business B.  
4. Open `/calls/{callIdFromA}` or API `GET /calls/{id}`.  
5. Expect `CALL_NOT_FOUND` (404) — not Business A's data.

## 9. Test cases

### Happy path

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M12-01 | WF-1 list | Rows scoped to active business, inbound only by default |
| TC-M12-02 | WF-2 real inbound call | AI answers; portal row with correct agent + status progression |
| TC-M12-03 | WF-2 detail timeline | Normalized events visible; no raw webhook JSON |
| TC-M12-04 | WF-2 provider mapping | Twilio SID + ElevenLabs conversation id linked (owner view) |
| TC-M12-05 | Assigned knowledge used | Agent answers using published assigned knowledge (not unassigned business sources) |
| TC-M12-06 | Selected voice used | Agent speaks with assigned catalogue or clone voice |
| TC-M12-07 | Multilingual (if enabled) | Agent detects/switches per agent language config |

### Security / tenant

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M12-SEC-01 | WF-4 cross-business call id | `CALL_NOT_FOUND` |
| TC-M12-SEC-02 | Viewer opens call detail | No Technical references section / no `providerLinks` in API |
| TC-M12-SEC-03 | List without `eazi_biz` cookie | `ACTIVE_BUSINESS_REQUIRED` |
| TC-M12-SEC-04 | Inspect API JSON + portal network tab | No Twilio auth token, ElevenLabs API key, webhook secrets |
| TC-M12-SEC-05 | Invalid Twilio webhook signature (staging) | 403 / rejected; no call created from bad request |
| TC-M12-SEC-06 | Invalid ElevenLabs signature when secret set | 401; no lifecycle corruption |

### Failure routes

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M12-FAIL-01 | WF-3 unassigned number | `UNASSIGNED_NUMBER`, safe TwiML, failed call in portal |
| TC-M12-FAIL-02 | Inactive/archived agent assigned | `INACTIVE_AGENT` |
| TC-M12-FAIL-03 | Agent not synced to ElevenLabs | `UNSYNCED_AGENT` |
| TC-M12-FAIL-04 | Knowledge assigned but not synced | `KNOWLEDGE_NOT_READY` |
| TC-M12-FAIL-05 | Voice selected but not ready | `VOICE_NOT_READY` |
| TC-M12-FAIL-06 | Unknown called number | `UNKNOWN_NUMBER` |
| TC-M12-FAIL-07 | ElevenLabs handoff unavailable | `HANDOFF_FAILED` or `PROVIDER_UNAVAILABLE` |
| TC-M12-FAIL-08 | Cross-business assignment corrupt data | `CROSS_BUSINESS_MAPPING` (ops/data integrity) |

### Idempotency / webhooks

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M12-IDEM-01 | Replay same Twilio inbound webhook (same CallSid) | No duplicate call rows |
| TC-M12-IDEM-02 | Replay Twilio status/call-ended | Terminal status not double-applied |
| TC-M12-IDEM-03 | Replay ElevenLabs conversation event | No duplicate `call_events`; idempotent accept |

## 10. Evidence expectations

- Screenshot of `/calls` list with at least one real inbound call  
- Screenshot of call detail with status badge + event timeline  
- Screenshot of Technical references (owner) showing Twilio SID + ElevenLabs conversation id  
- Screenshot of failed call row with customer-safe failure label  
- Network tab: `GET /calls` response — no secrets, viewer has no `providerLinks`  
- Optional: DB query or admin read showing `calls` + `call_events` for test CallSid  
- Note tunnel/PUBLIC_BASE_URL used for webhook delivery  
- Record test phone number, business name, agent name, and approximate call time  

## 11. Known limitations

- **Transcripts not available** in portal — placeholder only (M15).  
- **No outbound dial** — M13.  
- **No live call indicator** — refresh list to see updates.  
- **`ELEVENLABS_WEBHOOK_SECRET` empty** bypasses ElevenLabs signature validation (dev only).  
- **`INBOUND_CALL_DEV_STREAM_FALLBACK=true`** uses legacy stream TwiML when handoff not configured — not production path.  
- Real-phone QA requires Twilio billing + reachable webhooks.  
- Multilingual behavior depends on M05/M06 agent language configuration.

## 12. Environment variables

Documented in `ai-call-agent-backend/.env.example`:

| Variable | Purpose |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | M10 telephony |
| `TWILIO_AUTH_TOKEN` | M10 + webhook signature validation |
| `TWILIO_VALIDATE_SIGNATURES` | `true` in staging/production |
| `PUBLIC_BASE_URL` | Webhook URL base (must be provider-reachable) |
| `ELEVENLABS_API_KEY` | M06 handoff + voice |
| `ELEVENLABS_WEBHOOK_SECRET` | HMAC validation for conversation webhooks |
| `INBOUND_CALL_DEV_STREAM_FALLBACK` | Dev-only stream fallback when handoff unconfigured |
| `TELEPHONY_PROVIDER` | `twilio` |

## 13. Bug reporting

Include: org role, active business name, call id, Twilio CallSid (if known), API `error.code`, `correlationId`, failure code from portal, backend log snippet (redact secrets), whether Integrations shows Twilio Connected, whether agent sync status is synced.

## 14. Regression scope (M05–M11)

After M12 changes, spot-check:

- Login / org / business switchers  
- Agents list, create, sync to ElevenLabs  
- Knowledge list, publish/sync  
- Voice library + agent voice assignment  
- Phone numbers purchase/import/assign  
- Settings → Integrations (M10 Twilio panel)  
- `/health/ready`

Automated regression: `npm test` + `npm run test:e2e` in `ai-call-agent-backend`; `npm run check` in `ai-call-agent-frontend`.

## 15. Automated test coverage (12.04)

| Area | Test files |
| --- | --- |
| Routing failure codes | `test/unit/inbound-call-routing.test.js` |
| Orchestrator failure + idempotency | `test/unit/inbound-call-orchestrator.test.js` |
| Twilio webhook guard | `test/unit/telephony-webhook-guard.test.js` |
| ElevenLabs webhook guard | `test/unit/elevenlabs-webhook-guard.test.js` |
| ElevenLabs lifecycle + linking | `test/unit/elevenlabs-webhook.test.js` |
| Call RBAC | `test/unit/call-permissions.test.js` |
| Twilio lifecycle idempotency | `test/unit/telephony-webhooks.test.js` |
| Calls API tenant scope | `test/app.calls.e2e-test.js` |
| Frontend calls helpers | `ai-call-agent-frontend/test/calls-api.test.mjs` |

## 16. QA sign-off checklist

- [ ] WF-1 call list loads for active business  
- [ ] WF-2 **real inbound call** reaches correct agent with expected greeting/knowledge/voice  
- [ ] WF-2 call completion stored in portal + DB  
- [ ] WF-3 unknown/unassigned number handled safely  
- [ ] WF-4 cross-business access denied  
- [ ] Failure routes verified (at least unassigned + unsynced agent)  
- [ ] Webhook signature rejection verified (staging)  
- [ ] Duplicate webhook idempotency spot-checked  
- [ ] No provider credentials in API/UI  
- [ ] Regression M05–M11 spot-check passed  

**Sign-off**

| Tester | Date | Commit SHA | Result |
| --- | --- | --- | --- |
| AWS-D15 preflight (automated + read-only DB) | 2026-09-03 | `eda8cf7` (docs follow-up) | **Blocked** — Production Receptionist ElevenLabs `external_agent_id=agent_6501m1gemh0bfxg8dk41mwhny9yf` returns **404**; no real inbound call placed. Evidence: `docs/aws-deployment/AWS-D15-real-phone-m12-qa.md` |

**M12 module gate:** Do not mark `[M12] Incoming AI Calls = COMPLETE ✅` until this sign-off is **Pass** and `VS-GLOBAL-01`–`VS-GLOBAL-16` are verified. Keep `P05-M12-GATE = OPEN`.
