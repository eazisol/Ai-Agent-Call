# AWS-D08 — ECS Runtime Foundation

Phase **AWS-D08** creates the ECS cluster, execution role, CloudWatch logging, and task definition for the EaziAICall backend — **without** starting a service or running tasks.

**Status:** Apply with `scripts/aws/d08-ecs-runtime.ps1` after AWS-D07 PASS.

## Prerequisites

- AWS-D03 through D07 complete
- Canonical ECR image: `aa49b93-20260901t125102z` @ `sha256:98beea787f8c3eb93aacab3f6abc27ae3efbe92e6b7657681d0afc74a5dfa1b9`
- Account `812047028300`, region `us-east-1`

## Windows execution (canonical)

```powershell
aws sts get-caller-identity

powershell -ExecutionPolicy Bypass -File scripts/aws/d08-ecs-runtime.ps1
```

## ECS cluster

| Setting | Value |
|---|---|
| **Name** | `eaziacall-prod-cluster` |
| **Launch type (future)** | Fargate |
| **Container Insights** | Enabled |

## IAM role separation

| Role | Name | Purpose |
|---|---|---|
| **Application task role** | `eaziacall-prod-ecs-task-role` (D06) | NestJS → S3 |
| **Task execution role** | `eaziacall-prod-ecs-execution-role` (D08) | ECR pull, CloudWatch logs, future D11 secrets |

Execution role policy: `AmazonECSTaskExecutionRolePolicy` only. No `AdministratorAccess`, no S3 access.

## CloudWatch logging

| Setting | Value |
|---|---|
| **Log group** | `/ecs/eaziacall-prod-backend` |
| **Retention** | 14 days |
| **Stream prefix** | `backend` |

## Task definition

| Setting | Value |
|---|---|
| **Family** | `eaziacall-prod-backend` |
| **CPU / Memory** | 512 (0.5 vCPU) / 1024 MiB |
| **Network mode** | `awsvpc` |
| **Compatibility** | FARGATE |
| **Platform** | LINUX / X86_64 |
| **Container** | `backend` on port 3000 |
| **Image** | Digest-pinned canonical D07 image |

### Non-secret environment (D08)

- `NODE_ENV=production`
- `PORT=3000`
- `LOG_LEVEL=log`
- `REDIS_ENABLED=false`
- `OBJECT_STORAGE_ENABLED=true`
- `OBJECT_STORAGE_REGION=us-east-1`
- `OBJECT_STORAGE_BUCKET=eaziacall-prod-812047028300-us-east-1`
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_NAME`, `DATABASE_SSL=true`

**Not set in D08:** `DATABASE_PASSWORD`, provider secrets, JWT, static AWS keys, `PUBLIC_BASE_URL`, `CORS_ORIGINS`.

### ECS container health check

`http://127.0.0.1:3000/health/live` via Node `fetch` (not `/health/ready`).

## Future network contract (D09+)

| Setting | Value |
|---|---|
| **Subnets** | D03 private-a, private-b |
| **assignPublicIp** | `DISABLED` |
| **Security group** | `eaziacall-prod-ecs-sg` |
| **Ingress** | ALB SG → TCP 3000 |

## Explicitly NOT done in D08

- No ECS **service**
- No `run-task` (application or migration)
- No ALB, CloudFront, application secrets
- No backend deployment

Secrets → **AWS-D11**. Migrations → **AWS-D12**. ALB → **AWS-D09**.

## Billing note

ECS cluster alone does not incur Fargate task compute. No tasks/services = no Fargate hourly charges from D08. Container Insights may incur observability charges. CloudWatch log storage minimal until tasks run.

## M12 / Redis

- **P05-M12-GATE = OPEN**
- **Redis:** DEFERRED (`REDIS_ENABLED=false`)

## Next phase

**AWS-D09 — ALB + Target Group Foundation** (do not start until instructed)
