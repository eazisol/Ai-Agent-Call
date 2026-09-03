# AWS-D13 — ECS Service + Vercel HTTPS Gateway (No Custom Domain)

**Status:** PART A **PASS** | PART B **PASS** | CloudFront **DELETED**

Canonical public HTTPS base:

`https://eazi-ai-call.vercel.app`

## Architecture

```
Browser
  → https://eazi-ai-call.vercel.app/api/backend/*
  → Vercel Route Handler
  → http://eaziacall-prod-alb-...elb.amazonaws.com/api/v1/*
  → ALB → ECS

Twilio / ElevenLabs
  → https://eazi-ai-call.vercel.app/api/v1/webhooks/*
  → Vercel /api/v1/[...path] Route Handler (raw body + signature headers)
  → ALB /api/v1/webhooks/*
  → ECS
```

Provider webhooks intentionally use `/api/v1/*`, **not** `/api/backend/*`.

## ECS

| Field | Value |
|---|---|
| Task definition | `eaziacall-prod-backend:6` |
| Image | `1553674-20260903t051135z` |
| Desired / running | 1 / 1 |
| PUBLIC_BASE_URL | `https://eazi-ai-call.vercel.app` |
| CORS_ORIGINS | `https://eazi-ai-call.vercel.app` |
| AUTH_PUBLIC_APP_URL | `https://eazi-ai-call.vercel.app` |
| TWILIO_VALIDATE_SIGNATURES | `true` |
| VOICE_AGENT_PROVIDER | `elevenlabs` |
| REDIS_ENABLED | `false` |
| assignPublicIp | ENABLED (outbound) |
| Subnets | public `subnet-005de662efbe236f5`, `subnet-0df3643d8ad0501a8` |

Health: `/health/live` = 200, `/health/ready` = 200

## Vercel proxies

| Purpose | Path | Upstream |
|---|---|---|
| Browser/portal | `/api/backend/*` | ALB `/api/v1/*` |
| Providers | `/api/v1/*` | ALB `/api/v1/*` (1:1 path) |

Twilio signature contract:

`PUBLIC_BASE_URL + originalUrl` =
`https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/incoming-call`

## Provider URLs (live)

| Provider | URL |
|---|---|
| Twilio incoming | `https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/incoming-call` |
| Twilio status | `https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/status-callback` |
| Twilio call-ended (legacy route) | `https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/call-ended` |
| ElevenLabs post-call | `https://eazi-ai-call.vercel.app/api/v1/webhooks/elevenlabs/conversation-events` |

Security negatives:

- Unsigned Twilio → **403** `INVALID_WEBHOOK_SIGNATURE`
- Invalid ElevenLabs HMAC → **401** `Invalid ElevenLabs webhook signature.`

## CloudFront

Former distribution `E1FWWKUHUKYF6J` (`d1skouyk8kdayh.cloudfront.net`) — **DISABLED then DELETED**.

Count: **0**

## ALB security tradeoff

ALB SG `sg-098248934945d61d3` allows TCP **80 from 0.0.0.0/0** so Vercel (dynamic egress IPs) can reach the origin.

- ECS `:3000` remains ALB-SG-only
- RDS `:5432` remains private (ECS SG + intentional temp admin SG)
- Application HTTPS for browsers/providers is terminated at Vercel

## Explicit non-goals remaining

- No custom domain / ACM / ALB HTTPS yet
- No DB migrations
- **P05-M12-GATE remains OPEN**
- Real inbound phone QA is the next manual gate
