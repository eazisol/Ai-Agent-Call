# AWS-D09 — Application Load Balancer + Target Group Foundation

Phase **AWS-D09** creates the internet-facing ALB, backend target group, and HTTP listener — **without** starting an ECS service or registering targets.

**Status:** Apply with `scripts/aws/d09-alb.ps1` after AWS-D08 PASS.

## Architecture

```
Internet
   ↓
CloudFront HTTPS                 [AWS-D10 — not yet created]
   ↓
Internet-facing ALB HTTP :80     [AWS-D09]
   ↓
Target Group HTTP :3000          [AWS-D09]
   ↓
ECS Fargate private tasks        [service activation later]
```

CloudFront is the intended temporary public HTTPS entry point (D10). The ALB DNS name is **not** the final browser/API URL.

## Prerequisites

- AWS-D03 (network + security groups)
- AWS-D08 (ECS cluster + task definition)
- Account `812047028300`, region `us-east-1`

## Windows execution (canonical)

```powershell
aws sts get-caller-identity

powershell -ExecutionPolicy Bypass -File scripts/aws/d09-alb.ps1
```

## Application Load Balancer

| Setting | Value |
|---|---|
| **Name** | `eaziacall-prod-alb` |
| **Type** | application |
| **Scheme** | internet-facing |
| **IP type** | ipv4 |
| **Subnets** | D03 public-a, public-b |
| **Security group** | `eaziacall-prod-alb-sg` |
| **Idle timeout** | 120 seconds |
| **Deletion protection** | false |
| **Access logs** | disabled |

## Security group chain

| Direction | Rule |
|---|---|
| **ALB inbound** | TCP 80 from CloudFront origin-facing managed prefix list (`com.amazonaws.global.cloudfront.origin-facing`) |
| **ALB outbound** | TCP 3000 → ECS SG only (broad default egress removed where safe) |
| **ECS inbound** | TCP 3000 from ALB SG only |
| **ECS outbound** | unchanged (NAT for external APIs) |

Direct HTTP requests from a developer laptop to the ALB are **expected to fail** — ingress is CloudFront-restricted. Validate via AWS control-plane APIs, not curl.

## Target group

| Setting | Value |
|---|---|
| **Name** | `eaziacall-prod-backend-tg` |
| **Target type** | `ip` (required for Fargate awsvpc) |
| **Protocol** | HTTP / HTTP1 |
| **Port** | 3000 |
| **Health check** | HTTP `/health/live` on traffic-port |
| **Matcher** | 200 |
| **Healthy / unhealthy** | 2 / 3 |
| **Interval / timeout** | 30s / 5s |
| **Deregistration delay** | 30 seconds |
| **Stickiness** | disabled |

### Zero targets is expected

At D09 completion, **registered targets = 0**. This is correct because:

- No ECS service exists yet
- Application secrets not loaded (D11)
- Migrations not run (D12)

Do not manually register IP targets.

## HTTP listener

| Setting | Value |
|---|---|
| **Protocol** | HTTP |
| **Port** | 80 |
| **Default action** | forward → `eaziacall-prod-backend-tg` |

No HTTPS :443 listener (no ACM/custom domain yet).

## Future ECS service contract

| Setting | Value |
|---|---|
| **Cluster** | `eaziacall-prod-cluster` |
| **Task definition** | `eaziacall-prod-backend:<revision>` |
| **Subnets** | private-a, private-b |
| **Security group** | `eaziacall-prod-ecs-sg` |
| **assignPublicIp** | DISABLED |
| **Load balancer** | `eaziacall-prod-backend-tg` |
| **Container** | `backend:3000` |

ECS will register/deregister task ENI IPs automatically when the service is created.

## CloudFront D10 origin contract (deferred)

| Setting | Value |
|---|---|
| **Origin domain** | ALB DNS name |
| **Origin protocol** | HTTP-only |
| **Origin port** | 80 |
| **Viewer** | HTTPS (`https://<distribution>.cloudfront.net`) |

CloudFront must forward methods, headers (Authorization, webhook signatures), cookies, query strings, and bodies. API routes must disable caching.

**Do not configure Vercel/Twilio/ElevenLabs to the ALB DNS directly.**

## Explicitly NOT done in D09

- No ECS service or task
- No CloudFront, ACM, Route53
- No migration run
- No application secrets
- No backend deployment

## Billing note

ALB introduces ongoing charges (hourly + LCU). Target group and listener share ALB billing. NAT/RDS/S3 costs from prior phases continue.

## M12 / Redis

- **P05-M12-GATE = OPEN**
- **Redis:** DEFERRED (`REDIS_ENABLED=false`)

## Next phase

**AWS-D10 — CloudFront Temporary HTTPS Endpoint** (do not start until instructed)
