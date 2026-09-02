# AWS-D14 — Twilio + ElevenLabs Production Webhook Finalization

**Phase:** AWS-D14  
**Region:** us-east-1  
**Account:** 812047028300  
**Status:** PASS  
**M12 gate:** P05-M12-GATE = OPEN  
**Real phone call:** NOT performed (D15 pending)

## Result summary

| Area | Status |
|---|---|
| AWS/runtime preflight | PASS |
| Canonical production tenant routing | PASS |
| Twilio Voice URL + StatusCallback | PASS |
| Twilio signature negative test | PASS (403) |
| ElevenLabs post-call webhook | PASS (HMAC, transcript enabled) |
| ElevenLabs HMAC negative test | PASS (401) |
| CloudFront header policy | PASS (`Managed-AllViewerExceptHostHeader`) |
| Negative-test data pollution | NONE |
| Idempotent rerun | PASS |
| **Overall AWS-D14** | **PASS** |

## Production tenant (canonical routing)

| Entity | ID | Name | Status |
|---|---|---|---|
| Organization | `91cef079-51a2-47c7-92aa-98527523ad2b` | EaziAICall Production | active |
| Business | `501df018-cb8c-4731-b7d8-bcf68af0e92b` | EaziAICall Production Line | active |
| Agent | `15784e32-ce59-41e3-91f5-b6f3b3042091` | Production Receptionist | active |
| Phone number | `6b33cbc5-5af6-4bab-af5c-a21c2e427b51` | +183***9958 | active |
| Assignment | `6bd7ae82-e369-4470-95f4-231c19cec607` | agent linked | active |

Provisioned via NestJS service layer (`d14-tenant-provision.js` ECS task) — not raw SQL.

## Twilio canonical number

| Field | Value |
|---|---|
| Masked number | +183***9958 |
| IncomingPhoneNumber SID | `PN955403bd40b0708ec33ab960a1b7886b` |
| DB canonical record | `6b33cbc5-5af6-4bab-af5c-a21c2e427b51` |
| Business | EaziAICall Production Line |
| Assigned agent | Production Receptionist |

Existing Twilio number reused — no new number purchased.

## Twilio webhook configuration

| Setting | Value |
|---|---|
| Voice URL | `https://dl1t1qnfxrdka.cloudfront.net/api/v1/webhooks/twilio/incoming-call` |
| Voice method | POST |
| Status callback | `https://dl1t1qnfxrdka.cloudfront.net/api/v1/webhooks/twilio/status-callback` |
| Status callback method | POST |

### Call-ended architecture

Legacy route at `/call-ended` exists in backend but is **not** configured on IncomingPhoneNumber. Completion via status-callback per M10/M12.

## ElevenLabs configuration

| Setting | Value |
|---|---|
| Display name | EaziAICall Production Post-Call |
| Callback URL | `https://dl1t1qnfxrdka.cloudfront.net/api/v1/webhooks/elevenlabs/conversation-events` |
| Authentication | HMAC |
| External agent ID | `agent_6501m1gemh0bfxg8dk41mwhny9yf` |
| ConvAI post-call webhook ID | `89475ca34492468e9c6959659ead8e2a` |
| Transcript event | enabled |

## Voice and knowledge

| Item | Status |
|---|---|
| Voice assignment | Optional — not assigned (M12 routing allows null voice) |
| Knowledge assignment | None required — 0 sources assigned |

## Canonical routing chain

```
Twilio Number → Business → Active Agent → ElevenLabs
     PASS           PASS        PASS           PASS
```

## Security verification

| Control | Result |
|---|---|
| Twilio unsigned request | HTTP 403 |
| ElevenLabs unsigned request | HTTP 401 |
| Call/event pollution | 0 records created |

## Automation

```powershell
# Provision tenant routing (if missing)
powershell -ExecutionPolicy Bypass -File scripts/aws/d14-tenant-provision.ps1

# Verify webhooks + routing
powershell -ExecutionPolicy Bypass -File scripts/aws/d14-provider-webhooks.ps1
```

## Next phase

**AWS-D15 — Real Inbound Phone Call QA** (not started)
