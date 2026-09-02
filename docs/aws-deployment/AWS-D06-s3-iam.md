# AWS-D06 — Private S3 Object Storage + ECS Application IAM Role

Phase **AWS-D06** provisions private backend object storage and the ECS application task IAM role for EaziAICall using AWS CLI only.

**Status:** Apply with `scripts/aws/d06-s3-iam.ps1` after AWS-D03 and AWS-D04 PASS.

## Prerequisites

- AWS-D03/D04 complete (`docs/aws-deployment/aws-resource-inventory.json` populated)
- AWS CLI v2 with valid credentials
- Account `812047028300`, region `us-east-1`

## Windows execution (canonical)

```powershell
aws sts get-caller-identity
aws configure get region

powershell -ExecutionPolicy Bypass -File scripts/aws/d06-s3-iam.ps1
```

## S3 bucket

| Setting | Value |
|---|---|
| **Preferred name** | `eaziacall-prod-812047028300-us-east-1` (provisioned) |
| **Region** | `us-east-1` |
| **Purpose** | Private backend object storage (Knowledge Base files, voice clone samples) |
| **Public access** | All four Block Public Access settings enabled |
| **Object ownership** | `BucketOwnerEnforced` |
| **Encryption** | SSE-S3 (`AES256`) |
| **Versioning** | Enabled |
| **Lifecycle** | Abort incomplete multipart uploads after 7 days |
| **CORS** | Not configured (browser uploads go through NestJS backend) |
| **Website hosting** | Disabled |

## Direct browser S3 access

**DIRECT BROWSER S3 ACCESS REQUIRED: NO**

Current architecture: Browser → NestJS backend → S3. No broad S3 CORS configuration.

## IAM — ECS application task role

| Setting | Value |
|---|---|
| **Role name** | `eaziacall-prod-ecs-task-role` |
| **Trust principal** | `ecs-tasks.amazonaws.com` |
| **Policy name** | `eaziacall-prod-s3-access` |

This is the **application runtime role** (NestJS → S3), not the ECS task execution role (ECR/logs/secrets). Execution role is deferred to ECS/ECR phases.

### Least-privilege S3 policy actions

**Bucket-level** (supports `HeadBucket` health check via `s3:ListBucket`):

- `s3:ListBucket`
- `s3:GetBucketLocation`

**Object-level**:

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`

**Resource scope:** application bucket and `/*` objects only. No `s3:*` on `*`.

No static S3 access keys. No IAM users for runtime S3 access.

## Production object-storage env contract (future ECS)

```env
OBJECT_STORAGE_ENABLED=true
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_BUCKET=<created bucket name>
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_ACCESS_KEY_ID=
OBJECT_STORAGE_SECRET_ACCESS_KEY=
```

When access key env vars are unset, the AWS SDK uses the ECS task role via the default credential chain (verified in AWS-D02 code).

## Backend S3 operations (code reference)

| Operation | SDK command | IAM action |
|---|---|---|
| Health check | `HeadBucketCommand` | `s3:ListBucket` |
| Upload | `PutObjectCommand` | `s3:PutObject` |
| Download | `GetObjectCommand` | `s3:GetObject` |
| Delete | `DeleteObjectCommand` | `s3:DeleteObject` |

## Explicitly not done in D06

- No ECS cluster, task definition, or service
- No ECR, ALB, CloudFront, Redis, Route53, ACM
- No KMS key, no general application Secrets Manager secrets
- No migrations, no backend deployment
- No static S3 credentials

## Terraform cleanup debt

`infra/aws/terraform/` may remain from an earlier attempt. **AWS CLI is canonical.** Do not apply Terraform for this project unless explicitly requested.

## Cost note

Ongoing costs may include:

- S3 stored data
- PUT/GET/LIST requests
- Versioned object storage (replacements/deletes retain versions)

IAM roles/policies have no normal hourly resource charge.

## Redis / M12

- **Redis:** DEFERRED (`REDIS_ENABLED=false`)
- **P05-M12-GATE = OPEN**

## Related

- [AWS-D03 network & security](./AWS-D03-network-security.md)
- [AWS-D04 RDS PostgreSQL](./AWS-D04-rds-postgresql.md)
- Resource inventory: `docs/aws-deployment/aws-resource-inventory.json`

## Next phase

**AWS-D07 — ECR + Backend Docker Image** (do not start until instructed)
