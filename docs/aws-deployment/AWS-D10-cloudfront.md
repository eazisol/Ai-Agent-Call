# AWS-D10 — CloudFront Temporary HTTPS Endpoint

Phase **AWS-D10** creates the CloudFront distribution that provides temporary public HTTPS access to the backend API via the D09 ALB.

**Status:** Apply with `scripts/aws/d10-cloudfront.ps1` after AWS-D09 PASS.

## Architecture

```
Internet (HTTPS)
   ↓
CloudFront (*.cloudfront.net)     [D10]
   ↓ HTTP :80
ALB (CloudFront-restricted)       [D09]
   ↓ HTTP :3000
Target Group (0 targets)          [until ECS service]
```

## Prerequisites

- AWS-D09 complete (ALB, target group, HTTP listener)
- Account `812047028300`, region `us-east-1`

## Windows execution (canonical)

```powershell
aws sts get-caller-identity

powershell -ExecutionPolicy Bypass -File scripts/aws/d10-cloudfront.ps1
```

## CloudFront configuration

| Setting | Value |
|---|---|
| **Comment** | EaziAICall Production Backend API |
| **Origin** | ALB DNS (HTTP-only, port 80) |
| **Viewer protocol** | Redirect HTTP → HTTPS |
| **Cache policy** | `Managed-CachingDisabled` |
| **Origin request policy** | `Managed-AllViewerExceptHostHeader` |
| **Allowed methods** | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| **Price class** | PriceClass_200 (includes Asia/Middle East for Pakistan access) |
| **Custom domain** | None (uses `*.cloudfront.net`) |

## Forwarding model

Origin request policy forwards:

- All query strings
- All cookies
- Authorization, Origin, Content-Type
- Provider signature headers (X-Twilio-Signature, x-elevenlabs-signature)
- WebSocket Upgrade/Connection headers

Viewer `Host` is **not** forwarded (ALB receives its own hostname).

## Security

- ALB SG remains CloudFront origin-facing prefix list only
- No `0.0.0.0/0` on ALB port 80
- ECS port 3000 remains ALB-SG-only
- RDS port 5432 remains ECS-SG-only

## Temporary public URLs

After deployment, inventory captures:

- `PUBLIC_BASE_URL` = `https://<distribution>.cloudfront.net` (no trailing slash)
- API base = `PUBLIC_BASE_URL/api/v1`

Future provider webhook URLs (configure in D14, not D10):

| Provider | Path |
|---|---|
| Twilio incoming | `/api/v1/webhooks/twilio/incoming-call` |
| Twilio status | `/api/v1/webhooks/twilio/status-callback` |
| Twilio call-ended | `/api/v1/webhooks/twilio/call-ended` |
| ElevenLabs events | `/api/v1/webhooks/elevenlabs/conversation-events` |

**Do not** configure Vercel/Twilio/ElevenLabs to ALB DNS directly.

## Expected HTTP behavior

Because no ECS service exists yet:

```
GET <PUBLIC_BASE_URL>/health/live
```

May return **502/503** (no healthy targets). This is **expected** and not a D10 failure.

## Explicitly NOT done in D10

- No ECS service or task
- No CloudFront custom domain / ACM / Route53
- No WAF, Lambda@Edge, CloudFront Functions
- No access logs to application S3 bucket

## Next phase

**AWS-D11 — Production Secrets + Runtime Task Definition** (requires D10 PASS)
