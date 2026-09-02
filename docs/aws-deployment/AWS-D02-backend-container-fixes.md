# AWS-D02 — Backend Production Container & Deployment Blocker Fixes

This document records deployment-readiness decisions implemented in **AWS-D02**. It does not cover AWS resource provisioning (AWS-D03+).

## Application container startup

The ECS **application service** must **never** auto-run database migrations. Multiple tasks starting simultaneously could race migrations.

| Role | Command |
|---|---|
| **Normal app container** | `node dist/main.js` |
| **Controlled migration task** | `node dist/database/bootstrap-eazi-migrations.js && node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run` |

The same Docker image includes compiled migration tooling under `dist/database/` for one-off ECS task command overrides.

**TypeORM `synchronize` remains `false`.** Schema changes are migration-only.

## Container health check

Docker `HEALTHCHECK` targets **`GET /health/live`** on `127.0.0.1` inside the container, respecting `PORT` (default `3000`).

- No authentication
- No DB/Redis/Twilio dependency
- ALB target groups should also prefer `/health/live` over `/health/ready`

## Host binding

NestJS explicitly listens on **`0.0.0.0`** using the configured `PORT` so ECS/Fargate and Docker port mapping work reliably.

## Object storage — native AWS S3 via ECS Task Role

Production AWS deployment should use **ECS Task Role → AWS SDK default credential chain → S3**.

| Configuration | Purpose |
|---|---|
| `OBJECT_STORAGE_ENABLED=true` | Enable uploads/health check |
| `OBJECT_STORAGE_REGION` | AWS region |
| `OBJECT_STORAGE_BUCKET` | Target bucket |
| `OBJECT_STORAGE_ENDPOINT` | **Optional** — omit for native AWS S3 |
| `OBJECT_STORAGE_ACCESS_KEY_ID` / `OBJECT_STORAGE_SECRET_ACCESS_KEY` | **Optional** — omit both for IAM Task Role |

**Local/MinIO:** provide both static keys and a custom `OBJECT_STORAGE_ENDPOINT` (path-style enabled automatically).

**Invalid:** only access key **or** only secret key — validation fails at startup.

Static AWS access keys must **not** be placed in production ECS task environment variables when IAM Task Role is available.

## ElevenLabs webhook security

Signature verification uses the **exact raw request bytes** (`request.rawBody`), not `JSON.stringify(request.body)`.

| Environment | Missing `ELEVENLABS_WEBHOOK_SECRET` |
|---|---|
| **production** | Fail closed — request rejected / startup validation error |
| **development/test** | Explicit bypass allowed for local QA only |

Production requires a non-empty `ELEVENLABS_WEBHOOK_SECRET` in environment validation.

## Redis — initial AWS deployment

The application currently uses Redis **only for readiness checks**, not runtime features.

**Initial AWS deployment configuration:**

```env
REDIS_ENABLED=false
```

This allows deferring ElastiCache (AWS-D05) until a runtime feature requires Redis. Readiness skips Redis when disabled.

## Public backend URL

Production uses `PUBLIC_BASE_URL` (not `TWILIO_PUBLIC_BASE_URL`) as the canonical external backend host for Twilio webhook URL generation and signature validation.

## M12 gate status

**P05-M12-GATE remains OPEN.** Real-phone manual QA is still required after AWS deployment and provider URL configuration.

## Out of scope for AWS-D02

- Vercel same-origin proxy (recommended separately for cross-site cookie auth)
- AWS infrastructure provisioning
- Production migrations
- Twilio/ElevenLabs Console URL updates

## Next phase

**AWS-D03 — AWS Network & Security Foundation**
