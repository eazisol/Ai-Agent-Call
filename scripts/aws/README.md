# AWS CLI deployment scripts

Idempotent AWS infrastructure scripts for EaziAICall.

| Script | Platform | Phase | Scope |
|---|---|---|---|
| `d03-network.ps1` | **Windows (canonical)** | AWS-D03 | VPC, subnets, IGW, NAT, routes, security groups, DB subnet group |
| `d03-network.sh` | Linux/macOS/Git Bash | AWS-D03 | Same scope as PowerShell script |
| `d04-rds.ps1` | **Windows (canonical)** | AWS-D04 | RDS PostgreSQL instance (RDS-managed master password) |
| `d06-s3-iam.ps1` | **Windows (canonical)** | AWS-D06 | Private S3 bucket + ECS application task IAM role |
| `d07-ecr-image.ps1` | **Windows (canonical)** | AWS-D07 | Private ECR repo + production backend Docker image |
| `d08-ecs-runtime.ps1` | **Windows (canonical)** | AWS-D08 | ECS cluster, execution role, task definition (no service) |
| `d09-alb.ps1` | **Windows (canonical)** | AWS-D09 | Internet-facing ALB, target group, HTTP listener (no ECS service) |
| `d10-cloudfront.ps1` | **Windows (canonical)** | AWS-D10 | CloudFront temporary HTTPS endpoint (no ECS service) |
| `d11-secrets-runtime.ps1` | **Windows (canonical)** | AWS-D11 | Production secrets + runtime task definition (no ECS service) |
| `d12-migrate.ps1` | **Windows (canonical)** | AWS-D12 | Controlled production PostgreSQL migration (one-off ECS task, no service) |
| `d13-ecs-service.ps1` | **Windows (canonical)** | AWS-D13 | ECS backend service activation + health verification (Part A) |

## Requirements

- AWS CLI v2 with valid credentials
- Explicit AWS region configured (`AWS_REGION`, `AWS_DEFAULT_REGION`, or `aws configure set region`)

## Windows execution (canonical on Windows)

```powershell
aws sts get-caller-identity
aws configure get region

powershell -ExecutionPolicy Bypass -File scripts/aws/d03-network.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d04-rds.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d06-s3-iam.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d07-ecr-image.ps1
# Force rebuild after env.validation or application changes:
# $env:EAZI_FORCE_ECR_REBUILD = "1"; powershell -ExecutionPolicy Bypass -File scripts/aws/d07-ecr-image.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d08-ecs-runtime.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d09-alb.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d10-cloudfront.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d11-secrets-runtime.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d12-migrate.ps1
powershell -ExecutionPolicy Bypass -File scripts/aws/d13-ecs-service.ps1
```

## Linux/macOS execution

```bash
export AWS_REGION=your-region
bash scripts/aws/d03-network.sh
```

Never commit credentials. Resource IDs are written to `docs/aws-deployment/aws-resource-inventory.json`.
