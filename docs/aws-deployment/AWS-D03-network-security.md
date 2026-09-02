# AWS-D03 — Network & Security Foundation (AWS CLI)

Phase **AWS-D03** provisions EaziAICall production networking using **AWS CLI only** (no Terraform).

## Deployment method

| Item | Value |
|---|---|
| **Windows script (canonical)** | `scripts/aws/d03-network.ps1` |
| **Linux/macOS script** | `scripts/aws/d03-network.sh` |
| **Resource inventory** | `docs/aws-deployment/aws-resource-inventory.json` |
| **Idempotent** | Safe to re-run; reuses tagged resources |

## Prerequisites

1. AWS CLI v2 configured with valid credentials (profile, SSO, or environment variables).
2. **Explicit AWS region** — set `AWS_REGION`, `AWS_DEFAULT_REGION`, or `aws configure set region`.

Verify identity (never share secret values):

```bash
aws sts get-caller-identity
```

## Execute D03

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/aws/d03-network.ps1
```

**Linux/macOS (Bash):**

```bash
bash scripts/aws/d03-network.sh
```

The script creates or reuses resources tagged:

- `Project=EaziAICall`
- `Environment=production`
- `ManagedBy=aws-cli`

## Architecture summary

```
Internet
   ↓ (later: CloudFront HTTPS)
Public subnets (2 AZ)
   ├── Future ALB (eaziacall-prod-alb-sg)
   └── NAT Gateway (single — cost-conscious)
Private subnets (2 AZ)
   ├── Future ECS Fargate (eaziacall-prod-ecs-sg, assign_public_ip=false)
   └── Future RDS PostgreSQL (eaziacall-prod-rds-sg, eaziacall-prod-db-subnet-group)
```

**Temporary backend URL (later phase):** `https://<distribution-id>.cloudfront.net`

**Custom domain:** not required for initial deployment.

**Redis:** deferred — `REDIS_ENABLED=false`; no ElastiCache in D03.

## CIDR layout

| Resource | CIDR |
|---|---|
| VPC `eaziacall-prod-vpc` | `10.20.0.0/16` |
| `eaziacall-prod-public-a` | `10.20.0.0/24` |
| `eaziacall-prod-public-b` | `10.20.1.0/24` |
| `eaziacall-prod-private-a` | `10.20.10.0/24` |
| `eaziacall-prod-private-b` | `10.20.11.0/24` |

Availability zones are discovered dynamically (`aws ec2 describe-availability-zones`).

## Routing

| Route table | Subnets | Route |
|---|---|---|
| `eaziacall-prod-public-rt` | both public | `0.0.0.0/0` → Internet Gateway |
| `eaziacall-prod-private-rt` | both private | `0.0.0.0/0` → NAT Gateway |

**NAT:** exactly **one** NAT Gateway in the first public subnet (initial cost control; AZ dependency documented).

## Security groups

### `eaziacall-prod-alb-sg`

| Direction | Rule |
|---|---|
| Inbound | TCP 80 from CloudFront origin-facing managed prefix list |
| Outbound | TCP 3000 → ECS security group |

### `eaziacall-prod-ecs-sg`

| Direction | Rule |
|---|---|
| Inbound | TCP 3000 from ALB SG only |
| Outbound | All traffic (via NAT) — document for later least-privilege hardening |

### `eaziacall-prod-rds-sg`

| Direction | Rule |
|---|---|
| Inbound | TCP 5432 from ECS SG only |

## DB subnet group

`eaziacall-prod-db-subnet-group` — both **private** subnets only. RDS instance created in AWS-D04.

## Network ACLs

Default VPC NACL behavior retained. Security groups are the primary filter.

## VPC Flow Logs

**OPTIONAL LATER** — not provisioned in D03.

## Resource inventory

After successful run, non-secret IDs are written to:

`docs/aws-deployment/aws-resource-inventory.json`

Used by AWS-D04+.

## Cost note

D03 creates **chargeable** resources:

- **NAT Gateway** — hourly + data processing (primary ongoing D03 cost)
- **Elastic IP** — no charge while attached to running NAT

Only **one** NAT Gateway is created.

## Verification (post-run)

The script verifies:

- VPC available
- 2 public + 2 private subnets
- Public `MapPublicIpOnLaunch=true`, private `false`
- IGW attached
- Exactly 1 NAT Gateway (available)
- Public/private routes correct
- ECS 3000 not public; RDS 5432 not public
- DB subnet group contains private subnets only
- No SSH port 22 on D03 security groups

Manual check:

```bash
aws ec2 describe-security-groups --group-ids <alb-sg> <ecs-sg> <rds-sg>
```

## Deferred / not created in D03

ECS, ECR, RDS instance, ElastiCache, S3 application bucket, ALB, CloudFront, Secrets Manager application secrets, Route 53, ACM, WAF.

## M12 status

**P05-M12-GATE = OPEN** — real-phone manual QA still pending.

## Related

- [AWS-D02 backend container fixes](./AWS-D02-backend-container-fixes.md)

## Next phase

**AWS-D04 — RDS PostgreSQL**
