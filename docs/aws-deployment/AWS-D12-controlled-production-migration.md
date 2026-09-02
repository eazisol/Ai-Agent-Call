# AWS-D12 — Controlled Production PostgreSQL Migration

Phase **AWS-D12** runs the first controlled production schema migration against private RDS using a **one-off ECS Fargate task** — without creating an ECS service or starting the backend application.

**Status:** PASS (applied with `scripts/aws/d12-migrate.ps1` after D11).

## Prerequisites

- AWS-D11 complete (runtime task definition revision 3, secrets configured)
- Canonical image digest: `sha256:65f161a879e82a022ad953fb6334fe0ade8fc0fd93bd7f86a3816c151bac889b`
- RDS `eaziacall-prod-postgres` available and **not** publicly accessible
- ECS cluster with **0 services** and **0 running tasks**

## Windows execution (canonical)

```powershell
aws sts get-caller-identity
aws configure get region

powershell -ExecutionPolicy Bypass -File scripts/aws/d12-migrate.ps1
```

## Migration source inspection

| Item | Value |
|---|---|
| **synchronize** | `false` (TypeORM `DataSource` + NestJS `AppModule`) |
| **Migration table** | `eazi_ai_call_migrations` |
| **Registered migrations** | 16 (source files under `ai-call-agent-backend/src/database/migrations/`) |
| **Bootstrap script** | `dist/database/bootstrap-eazi-migrations.js` — idempotently creates migration table; backfills legacy rows only when evidence tables exist (does not modify n8n `public.migrations`) |
| **Application startup** | `dist/main.js` — **no** auto-migration on boot |
| **pgcrypto** | Required — created in `FoundationBaseline1724500000000` |

## Production migration command

Executed via ECS container command override on `eaziacall-prod-backend:3`:

```bash
cd /app && node dist/database/bootstrap-eazi-migrations.js && node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
```

## Controlled ECS task model

| Setting | Value |
|---|---|
| **Cluster** | `eaziacall-prod-cluster` |
| **Task definition** | `eaziacall-prod-backend:3` (command override only; no new revision) |
| **Launch type** | FARGATE |
| **Subnets** | `subnet-0fc38aac1eef37201`, `subnet-039f9969241c4bd23` |
| **Security group** | `sg-02fe9d3a2c96b513f` (ECS) |
| **assignPublicIp** | DISABLED |
| **Secrets** | D11 ECS native injection (no manual `get-secret-value`) |

## Pre-migration snapshot

| Field | Value |
|---|---|
| **Identifier** | `eaziacall-prod-pre-d12-20260901t142626z` |
| **ARN** | `arn:aws:rds:us-east-1:812047028300:snapshot:eaziacall-prod-pre-d12-20260901t142626z` |
| **Status** | available |
| **Tags** | Project, Environment, ManagedBy, Purpose=pre-d12-migration |

## Migration ECS task (canonical)

| Field | Value |
|---|---|
| **Task ARN** | `arn:aws:ecs:us-east-1:812047028300:task/eaziacall-prod-cluster/decca4ddccbe47d7bc3d18509aebac02` |
| **Exit code** | 0 |
| **CloudWatch log group** | `/ecs/eaziacall-prod-backend` |

## Post-migration verification

- Migration table `eazi_ai_call_migrations` exists
- Applied count **16** = registered count **16**
- Pending migrations **0** (`migration:show` — all `[X]`)
- `pgcrypto` extension present
- Core tables present: `users`, `organizations`, `businesses`, `calls`

## Rollback policy

The pre-D12 RDS snapshot is the rollback safety point. On migration failure:

- Preserve snapshot, RDS, logs, and failed task metadata
- **Do not** automatically restore the snapshot
- **Do not** manually mark migrations applied or delete production tables

## D11 secret JSON remediation (applied during D12)

D11 initially wrote Secrets Manager values inline via AWS CLI, producing invalid JSON for ECS key extraction. Remediated by:

1. Fixing `d11-secrets-runtime.ps1` to use `file://` for `--secret-string`
2. Running `scripts/aws/d11-repair-secret-json.ps1` once to rewrite existing secrets as valid JSON

No secret values are stored in inventory or docs.

## Idempotency

Re-running `d12-migrate.ps1` when inventory shows PASS and the database has zero pending migrations:

- Skips new snapshot creation
- Skips migration task
- Runs verification only
- Returns PASS (no-op)

## Explicit non-goals (unchanged)

- No ECS backend **service**
- No ALB target registration
- No Vercel / Twilio / ElevenLabs configuration changes
- No Redis enablement
- **P05-M12-GATE remains OPEN**

## Next phase

**AWS-D13** — Controlled ECS Service Activation + Vercel Same-Origin Integration (do not start unless instructed).
