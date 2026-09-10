# RESET-05 — Repurchased Twilio Number Import/Link + Agent Assignment

**Status:** `PASS`

**UTC window:** 2026-09-03 (post import/assign)

## Twilio live

| Field | Value |
|---|---|
| E.164 | `+18314809958` |
| NEW SID | `PN80a9e2d52f491f05ff461b523359eec0` |
| Live status | `in-use` |
| Account | active |
| Old SID `PN955403bd40b0708ec33ab960a1b7886b` | not present in Twilio; app refs = **0** |

## Webhooks (IncomingPhoneNumber)

| Field | Value |
|---|---|
| Voice URL | `https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/incoming-call` |
| Voice method | POST |
| Status callback | `https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/status-callback` |
| Status method | POST |
| call-ended | backend route exists; not set on IncomingPhoneNumber (status-callback is primary) |

## Runtime

| Env | Value |
|---|---|
| `PUBLIC_BASE_URL` | `https://eazi-ai-call.vercel.app` |
| `TWILIO_VALIDATE_SIGNATURES` | `true` |

## Phone application record

| Field | Value |
|---|---|
| Canonical ID | `3fec5400-0cba-4b03-a05a-3742f98b4187` |
| Business | EaziAICall Production (`3c0680ed-320d-48ae-bf57-c129c03676b1`) |
| Provider | twilio |
| Status | active |
| E.164 | `+18314809958` |
| Provider SID | `PN80a9e2d52f491f05ff461b523359eec0` |
| Friendly name | EaziAICall Production |
| telephony_provider_mappings | 1 |

## Assignment

| Field | Value |
|---|---|
| Assignment ID | `2c886380-49de-4556-b56c-4ed14e6170cb` |
| Phone | `+18314809958` |
| Agent | Production Receptionist (`12d9775c-4939-402c-84e0-ffae1e6da207`) |
| Assign status | active |
| Active assignments for phone | **1** |

## Routing preflight

```
+18314809958
→ phone 3fec5400-0cba-4b03-a05a-3742f98b4187
→ business 3c0680ed-320d-48ae-bf57-c129c03676b1 (EaziAICall Production)
→ agent 12d9775c-4939-402c-84e0-ffae1e6da207 (Production Receptionist)
→ ElevenLabs agent_5801m1k86tc7ewdbtq36s94dfw6d (synced)
```

## Agent readiness

| Check | Result |
|---|---|
| Agent active | yes |
| ElevenLabs sync | synced |
| Live GET | 200 / Production Receptionist |
| Voice | Bella (from RESET-04) |
| Knowledge | About EaziAICall synced + assigned |

## Twilio security

| Check | Result |
|---|---|
| Unsigned/invalid → Vercel | **403** `INVALID_WEBHOOK_SIGNATURE` |
| ALB direct | **403** |
| Validation enabled | yes |

## Database counts

| Table | Count |
|---|---:|
| users / orgs / memberships / businesses | 1 / 1 / 1 / 1 |
| agents / agent_provider_mappings | 1 / 1 |
| phone_numbers | 1 |
| phone_number_assignments | 1 |
| telephony_provider_mappings | 1 |
| calls | 0 |
| call_events | 0 |
| migrations | 16 |

## Scope

| Item | Result |
|---|---|
| Import/assign | normal product UI |
| Code | UNCHANGED |
| Schema | UNCHANGED |
| Migration | NOT RUN |
| ElevenLabs | READ ONLY (GET verify) |
| Real phone call | **NOT PLACED** |
| Secrets | not exposed |
| M12 | OPEN |

## Next

**AWS-D15 — REAL PHONE END-TO-END M12 QA**

**STOP.** Do not start AWS-D15 / D16 until instructed.
