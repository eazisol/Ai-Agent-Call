# AWS-D15 — Real Phone End-to-End M12 QA

**Result:** **BLOCKED** (real phone not yet placed)  
**Mapping remediation:** **PASS** — see `AWS-D15-blocker-remediation.md`  
**Date (UTC):** 2026-09-03  
**M12 gate:** `P05-M12-GATE = OPEN` (unchanged)

## Why blocked (original)

Canonical phone → business → agent assignment is present and active, but the assigned agent’s ElevenLabs ConvAI mapping **previously** pointed at a **non-existent** external agent:

| Field | Value |
|---|---|
| Phone | `+18314809958` (`PN955403bd40b0708ec33ab960a1b7886b`) |
| Phone ID | `6b33cbc5-5af6-4bab-af5c-a21c2e427b51` |
| Business | EaziAICall Production Line (`501df018-cb8c-4731-b7d8-bcf68af0e92b`) |
| Org | EaziAICall Production (`91cef079-51a2-47c7-92aa-98527523ad2b`) |
| Assignment | active (`6bd7ae82-e369-4470-95f4-231c19cec607`) |
| Agent | Production Receptionist (`15784e32-ce59-41e3-91f5-b6f3b3042091`) — **active** |
| DB mapping | `provider=elevenlabs`, `sync_status=synced`, `external_agent_id=agent_6501m1gemh0bfxg8dk41mwhny9yf` |
| Live ElevenLabs GET | **404** for `agent_6501m1gemh0bfxg8dk41mwhny9yf` |

Live ElevenLabs account currently exposes agent:

- `agent_7101m1gta10mf2nba3gb7c7tz50y` — **HR Agent** (mapped in DB to a different agent id `8ac4c94c-7bf0-4e28-9faf-e317d1dfe23e`)

A real inbound call would reach Twilio → Vercel → Nest routing, then fail at ElevenLabs handoff (`UNSYNCED_AGENT` / `HANDOFF_FAILED` / provider 404). Per D15 rules, **no real phone call was placed**.

## Preflight that passed

| Check | Result |
|---|---|
| ECS `:6` desired/running | 1 / 1, rollout COMPLETED |
| Target health | healthy (`10.20.0.209:3000`) |
| `/health/live` | 200 |
| `/health/ready` | 200 (database/objectStorage/telephony up) |
| `PUBLIC_BASE_URL` | `https://eazi-ai-call.vercel.app` |
| `VOICE_AGENT_PROVIDER` | `elevenlabs` |
| `TWILIO_VALIDATE_SIGNATURES` | `true` |
| `REDIS_ENABLED` | `false` |
| Vercel `/api/backend/auth/me` | 401 (real backend) |
| Vercel `/api/v1` provider proxy | reachable |
| Twilio incoming/status URLs | exact Vercel `/api/v1/webhooks/twilio/*`, POST |
| ElevenLabs post-call URL | exact Vercel `/api/v1/webhooks/elevenlabs/conversation-events`, HMAC |
| Twilio unsigned | **403** `INVALID_WEBHOOK_SIGNATURE` |
| ElevenLabs invalid HMAC | **401** |
| CloudFront | DELETED (count 0) |
| DB schema / migrations | UNCHANGED / NOT RUN |

## Baseline (read-only ECS SQL)

Captured via one-off Fargate task (public subnets + public IP; no SSM/NAT):

| Metric | Value |
|---|---|
| `calls` count | **0** |
| `call_events` count | **0** |
| Latest call ID | none |

Temporary DB-access EC2 `i-063eef61082c18699` remains **SSM ConnectionLost** (private subnet, no NAT). Not modified (no cleanup).

## Real phone QA

**Not performed** — blocked before manual dial.

## Mapping remediation (2026-09-03)

**PASS.** New live agent `agent_6401m1k0r28fevcr9q3fxcvevyzk` (GET 200, name Production Receptionist). DB `sync_status=synced`. HR Agent untouched. Phone assignment unchanged.

Retry this D15 document with a **real inbound call**. Do **not** close M12 until that pass. Do **not** start AWS-D16.

## Explicit non-actions this phase

- No real phone call
- No DB schema change / migration
- No CloudFront recreation
- No ALB/SG topology change
- No temporary RDS admin SG removal
- No Redis enablement
- No provider credential rotation
- No signature validation disable
