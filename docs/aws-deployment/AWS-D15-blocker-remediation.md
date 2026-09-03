# AWS-D15 — Production Receptionist ElevenLabs mapping remediation

**Result:** **D15 REMEDIATION PASS**  
**Date (UTC):** 2026-09-03  
**M12 gate:** `P05-M12-GATE = OPEN`  
**Real phone call:** NOT PLACED  
**AWS-D16:** NOT STARTED

AWS-D15 real-phone QA remains **BLOCKED** until a separate retry with a live inbound call.

## Root cause

`AgentProviderSyncService.syncForUser` treated any stored `externalAgentId` as update-only. After the remote ConvAI agent was deleted (live GET 404), sync PATCHed the missing id, failed, and left DB `sync_status=synced`. Routing trusted DB `synced` without a live existence check.

Evidence:

- DB: `external_agent_id=agent_6501m1gemh0bfxg8dk41mwhny9yf`, `sync_status=synced`
- `GET /v1/convai/agents/agent_6501…` = 404 (still 404 after remediation)
- Adapter `getStatus()` already mapped 404 → `exists: false` but sync did not use it before update

## Canonical config (pre-provision)

Production Receptionist was complete: name, role Receptionist, greeting (66 chars), instructions (138), language `en`, voice preference `neutral`, status `active`, business EaziAICall Production Line.

## Method

Code fix in existing `AgentProviderSyncService`: `getStatus` → if missing, clear stale id and `create`; `synced` only after successful create/update. Status check marks `error` when DB says `synced` but remote is missing.

Deployed image `eda8cf7-20260903t063402z` (scan CRITICAL=0 HIGH=0). Service on task definition **:8**. Re-sync via Nest `syncForUser` (one-off Fargate, same secrets).

## Outcome

| Item | Value |
|---|---|
| New external id | `agent_6401m1k0r28fevcr9q3fxcvevyzk` |
| Provider GET | 200, name Production Receptionist |
| DB sync_status | synced |
| HR Agent | UNCHANGED `agent_7101m1gta10mf2nba3gb7c7tz50y` |
| Phone `+18314809958` | same business, same assignment, new mapping |
| Routing preflight | ok; no UNSYNCED_AGENT; no HANDOFF_FAILED |
| Schema / migrations | UNCHANGED / NOT RUN |
| Temp EC2 `i-063eef61082c18699` | not modified (describe-only) |

## Next

RETRY AWS-D15 — Real Phone End-to-End M12 QA. Do not start AWS-D16.
