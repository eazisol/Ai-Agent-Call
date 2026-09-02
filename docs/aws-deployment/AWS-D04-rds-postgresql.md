# AWS-D04 — Amazon RDS PostgreSQL

Phase **AWS-D04** provisions the production PostgreSQL database for EaziAICall using AWS CLI only.

**Status:** Apply with `scripts/aws/d04-rds.ps1` after AWS-D03 PASS.

## Prerequisites

- AWS-D03 complete (`docs/aws-deployment/aws-resource-inventory.json` populated)
- AWS CLI v2 with valid credentials
- Region `us-east-1`

## Windows execution (canonical)

```powershell
aws sts get-caller-identity
aws configure get region

powershell -ExecutionPolicy Bypass -File scripts/aws/d04-rds.ps1
```

## Database configuration

| Setting | Value |
|---|---|
| **DB identifier** | `eaziacall-prod-postgres` |
| **Engine** | PostgreSQL **17.11** (latest available 17.x selected at runtime on 2026-09-01) |
| **DB name** | `eazi_ai_call` |
| **Master username** | `eaziadmin` |
| **Master password** | **RDS-managed** (`--manage-master-user-password`) |
| **Instance class** | `db.t4g.micro` |
| **Storage** | 20 GiB `gp3`, encrypted |
| **Port** | 5432 |
| **Multi-AZ** | `false` |
| **Publicly accessible** | `false` |
| **Backup retention** | 7 days |
| **Deletion protection** | `true` |
| **Copy tags to snapshots** | `true` |
| **Auto minor version upgrade** | `true` |

## Network architecture

RDS runs in **private subnets only**, using D03 resources:

- **VPC:** `eaziacall-prod-vpc`
- **DB subnet group:** `eaziacall-prod-db-subnet-group` (private subnets A + B)
- **Security group:** `eaziacall-prod-rds-sg`
- **Ingress model:** ECS SG → TCP 5432 → RDS SG only

No public PostgreSQL access. No developer IP rules. No bastion host.

## Master credential strategy

- AWS RDS creates and manages the master credential in Secrets Manager via `--manage-master-user-password`
- The script records only the **Secret ARN** in inventory (non-secret infrastructure identifier)
- **Do not** call `get-secret-value` during D04
- Application/migration credential wiring is deferred to AWS-D11/D12

## pgcrypto

Migrations require PostgreSQL `pgcrypto`. RDS PostgreSQL 17 supports this extension. **D04 does not run migrations or `CREATE EXTENSION`.** Extension activation occurs during the controlled migration phase (AWS-D12).

## Explicitly not done in D04

- No migrations
- No application connection
- No application DB users
- No backend/frontend code changes
- No ECS, ALB, CloudFront, S3, Redis, or general application secrets

## Cost note

This phase introduces a **continuously billed** RDS instance:

- `db.t4g.micro` (cost-conscious initial class)
- 20 GiB gp3 encrypted storage
- Single-AZ (no Multi-AZ premium)

Do not upgrade instance class without explicit approval.

## M12 status

**P05-M12-GATE = OPEN** — real-phone manual QA still pending.

## Related

- [AWS-D03 network & security](./AWS-D03-network-security.md)
- Resource inventory: `docs/aws-deployment/aws-resource-inventory.json`

## Next phase

**AWS-D05 — Redis:** deferred (`REDIS_ENABLED=false`)

**Next active phase:** AWS-D06 — S3 + IAM (do not start until instructed)
