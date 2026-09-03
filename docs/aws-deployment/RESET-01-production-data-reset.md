# RESET-01 — Controlled Production Application-Data Reset

**Status:** `PASS`

**UTC timestamp (execute complete):** 2026-09-03T ~ post-truncate inventory (same day as snapshot `20260903t072856z`)

**Operator authorizations:**

1. Dry-run inventory / snapshot first
2. Suspect rows reclassified as **ALL disposable QA**
3. Destructive truncate authorized (`EAZI_ALLOW_PROD_DATA_RESET=YES` + `-Execute` + `EAZI_RESET01_OPERATOR_CLEARED_CUSTOMER_GATE=YES`)

## Hard safety gate

| Check | Result |
|---|---|
| AWS account | `812047028300` PASS |
| Region | `us-east-1` PASS |
| RDS identifier | `eaziacall-prod-postgres` PASS |
| Database | `eazi_ai_call` PASS |
| RDS status | `available` PASS |
| PubliclyAccessible | `false` PASS |
| Customer-data risk | Heuristic suspects cleared by operator as disposable QA PASS |
| ECS stopped during truncate | desired=0 running=0 pending=0 PASS |
| ECS restored after | desired=1 running=1 pending=0 PASS |

### Safety inspection (pre-truncate)

Heuristic flagged `ah***@gmail.com` / archived business `Ahmad Akram`. Operator confirmed **all rows disposable QA** (test orgs, bootstrap admin, failed QA call). Truncate proceeded under explicit clearance flag.

## Pre-reset RDS snapshot

| Field | Value |
|---|---|
| Identifier | `eaziacall-prod-pre-clean-reset-20260903t072856z` |
| ARN | `arn:aws:rds:us-east-1:812047028300:snapshot:eaziacall-prod-pre-clean-reset-20260903t072856z` |
| Status | `available` (before truncate) |
| Created (UTC) | `2026-09-03T07:29:03.539Z` |

## Table inventory

- **Total application tables:** 34
- **PRESERVE:** 1 (`eazi_ai_call_migrations`)
- **RESET:** 33
- **pgcrypto:** present (`1.3`) before and after
- **Migrations:** registered 16 / applied 16 / pending 0 (before and after)
- **Migration execution:** NOT RUN
- **Schema:** UNCHANGED (no DROP)

### PRESERVE

| Schema | Table | Before | After |
|---|---|---:|---:|
| public | `eazi_ai_call_migrations` | 16 | 16 |

### RESET row counts

| Table | Before | After |
|---|---:|---:|
| `agent_configs` | 3 | 0 |
| `agent_knowledge_sources` | 0 | 0 |
| `agent_prompts` | 3 | 0 |
| `agent_provider_mappings` | 2 | 0 |
| `ai_agents` | 3 | 0 |
| `ai_configs` | 0 | 0 |
| `business_hours` | 35 | 0 |
| `business_settings` | 5 | 0 |
| `businesses` | 5 | 0 |
| `call_events` | 4 | 0 |
| `call_messages` | 0 | 0 |
| `call_provider_mappings` | 1 | 0 |
| `call_recordings` | 0 | 0 |
| `calls` | 1 | 0 |
| `email_logs` | 0 | 0 |
| `email_verification_tokens` | 1 | 0 |
| `knowledge_provider_mappings` | 1 | 0 |
| `knowledge_sources` | 1 | 0 |
| `organization_invitations` | 0 | 0 |
| `organization_members` | 4 | 0 |
| `organizations` | 4 | 0 |
| `password_reset_tokens` | 2 | 0 |
| `phone_number_assignments` | 1 | 0 |
| `phone_numbers` | 1 | 0 |
| `provider_events` | 2 | 0 |
| `refresh_tokens` | 36 | 0 |
| `telephony_provider_mappings` | 1 | 0 |
| `users` | 2 | 0 |
| `voice_assets` | 21 | 0 |
| `voice_clones` | 1 | 0 |
| `voice_consents` | 1 | 0 |
| `voice_provider_mappings` | 21 | 0 |
| `voice_samples` | 1 | 0 |

### Domain verification (AFTER, post-ECS restore)

| Domain | Expected | Actual |
|---|---:|---:|
| users | 0 | 0 |
| organizations | 0 | 0 |
| businesses | 0 | 0 |
| ai_agents | 0 | 0 |
| agent_provider_mappings | 0 | 0 |
| phone_numbers | 0 | 0 |
| phone_number_assignments | 0 | 0 |
| calls | 0 | 0 |
| call_events | 0 | 0 |

**Dummy/bootstrap recreation after ECS restore:** NONE (post-inventory all RESET tables still 0).

## Controlled scripts

| Path | Purpose |
|---|---|
| `scripts/aws/reset-01-production-data-reset.ps1` | Orchestrator (dry-run default; `-Execute` + allow flag) |
| `scripts/aws/reset-01-inventory.js` | Read-only inventory + safety inspection + migration:show |
| `scripts/aws/reset-01-truncate.js` | TRUNCATE RESET set `RESTART IDENTITY CASCADE` |
| `scripts/aws/reset-01-suspect-detail.js` | Masked suspect-row detail (used during gate review) |

Destructive require:

- `EAZI_ALLOW_PROD_DATA_RESET=YES`
- `-Execute`
- If heuristic suspects remain: `EAZI_RESET01_OPERATOR_CLEARED_CUSTOMER_GATE=YES`

## Post-reset infrastructure

| Item | State |
|---|---|
| ECS | desired=1 running=1 pending=0 |
| Target health | healthy (1) |
| ALB `/health/live` | 200 |
| ALB `/health/ready` | 200 |
| Twilio / ElevenLabs / Vercel | UNCHANGED (out of scope) |
| Secrets | not exposed in logs/docs |
| M12 | P05-M12-GATE = OPEN |

## Acceptance checklist

- [x] AWS account/region confirmed
- [x] no unexpected real customer data found (operator-cleared QA)
- [x] complete DB table inventory captured
- [x] snapshot AVAILABLE before deletion
- [x] ECS stopped during reset
- [x] explicit reset flag required
- [x] all application data removed
- [x] users = 0
- [x] organizations = 0
- [x] businesses = 0
- [x] agents = 0
- [x] agent mappings = 0
- [x] calls = 0
- [x] call_events = 0
- [x] no dummy data recreated
- [x] migration table preserved
- [x] 16 migrations still applied
- [x] pending migrations = 0
- [x] pgcrypto preserved
- [x] schema unchanged
- [x] tables unchanged
- [x] no migration run
- [x] ECS restored 1/1
- [x] target healthy
- [x] `/health/live` 200
- [x] `/health/ready` 200
- [x] no external provider resource deleted
- [x] no secrets exposed
- [x] M12 remains OPEN

## Next phase

**RESET-01 PASS complete.**

**STOP.** Do not start RESET-02 / AWS-D15 / D16 until explicitly instructed.

Only when instructed:

**RESET-02 — Fresh Real Owner Account + Email Verification** (real accessible operator email; no dummy mailboxes).
