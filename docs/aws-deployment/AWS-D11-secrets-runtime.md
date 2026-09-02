# AWS-D11 — Production Secrets + Runtime Task Definition

Phase **AWS-D11** creates production Secrets Manager entries, grants the ECS execution role least-privilege secret access, and registers a secret-aware ECS task definition — **without** starting a service or running migrations.

**Status:** PASS (applied with `scripts/aws/d11-secrets-runtime.ps1` after D10 and new ECR image rebuild).

## Prerequisites

- AWS-D10 complete (`PUBLIC_BASE_URL` from CloudFront)
- New ECR image built after `elevenlabs` added to `VOICE_AGENT_PROVIDER` validation (`EAZI_FORCE_ECR_REBUILD=1` for d07)
- `EAZI_PRODUCTION_FRONTEND_URL=https://eazi-ai-call.vercel.app` (or exact Vercel URL in local config)
- `ELEVENLABS_WEBHOOK_SECRET` in process environment or secure local source
- ElevenLabs post-call webhook configured (HMAC) at CloudFront URL

## Windows execution (canonical)

```powershell
$env:EAZI_PRODUCTION_FRONTEND_URL = "https://eazi-ai-call.vercel.app"
# ELEVENLABS_WEBHOOK_SECRET must be present in process environment

powershell -ExecutionPolicy Bypass -File scripts/aws/d11-secrets-runtime.ps1
```

## Production voice provider

| Setting | Value |
|---|---|
| **VOICE_AGENT_PROVIDER** | `elevenlabs` |
| **M12 inbound path** | `ElevenLabsInboundHandoffAdapter` (not OpenAI Realtime) |
| **OPENAI_API_KEY** | Not provisioned for this configuration |
| **Legacy OpenAI Realtime** | Preserved in codebase for future provider abstraction |

## Secret groups (ARNs only in inventory)

| Logical name | Secret path | Keys |
|---|---|---|
| Database | RDS-managed | `password` (reused) |
| Auth | `eaziacall/prod/auth` | `AUTH_JWT_ACCESS_SECRET` |
| SMTP | `eaziacall/prod/smtp` | `SMTP_USER`, `SMTP_PASSWORD` |
| Twilio | `eaziacall/prod/twilio` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| ElevenLabs | `eaziacall/prod/elevenlabs` | `ELEVENLABS_API_KEY`, `ELEVENLABS_WEBHOOK_SECRET` |
| Voice | `eaziacall/prod/voice` | `VOICE_STREAM_SIGNING_SECRET` |

**Not created:** `eaziacall/prod/openai`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`

## Runtime configuration (non-secret)

| Variable | Production value |
|---|---|
| `PUBLIC_BASE_URL` | `https://dl1t1qnfxrdka.cloudfront.net` |
| `CORS_ORIGINS` | `https://eazi-ai-call.vercel.app` |
| `AUTH_PUBLIC_APP_URL` | `https://eazi-ai-call.vercel.app` |
| `VOICE_AGENT_PROVIDER` | `elevenlabs` |
| `TWILIO_VALIDATE_SIGNATURES` | `true` |
| `REDIS_ENABLED` | `false` |
| `PROTOTYPE_API_ENABLED` | `false` |
| `INBOUND_CALL_DEV_STREAM_FALLBACK` | `false` |

## ECS execution role policy

Policy: `eaziacall-prod-ecs-secrets-access`

- Allows `secretsmanager:GetSecretValue` on exact secret ARNs only
- No `secretsmanager:*` on `*`

## Runtime task definition

- Family: `eaziacall-prod-backend`
- Runtime revision: `3` (secret-aware; uses new image digest)
- Image: digest-pinned from inventory `backendImage.digest`
- `environment[]`: non-secret config only
- `secrets[]`: ARN/`valueFrom` references only

## Canonical image (post-D11 rebuild)

| Field | Value |
|---|---|
| **Tag** | `aa49b93-20260901t140030z` |
| **Digest** | `sha256:65f161a879e82a022ad953fb6334fe0ade8fc0fd93bd7f86a3816c151bac889b` |
| **Scan** | COMPLETE, CRITICAL=0, HIGH=0 |

Previous digest `sha256:98beea…` deprecated (pre-`elevenlabs` env validation).

## Explicitly NOT done in D11

- No ECS service or task
- No database migration (D12)
- No provider console configuration (D14)
- No plaintext secrets in Git, docs, inventory, or ECS `environment[]`

## Next phase

**AWS-D12 — Controlled Production Database Migration**
