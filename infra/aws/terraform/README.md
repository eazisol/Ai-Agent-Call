# EaziAICall — AWS Production Networking (Terraform)

Terraform stack for **AWS-D03** network and security foundation only.

## Prerequisites

1. [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured with credentials (profile, SSO, or environment variables).
2. [Terraform >= 1.5](https://developer.hashicorp.com/terraform/install).
3. An **explicit AWS region** — this stack does not default to `us-east-1`.

Verify identity (do not share secret values):

```bash
aws sts get-caller-identity
```

## Quick start

```bash
cd infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set aws_region

terraform fmt -recursive
terraform init
terraform validate
terraform plan
terraform apply
```

Review the plan before apply. Expected resources: VPC, subnets, IGW, NAT, route tables, security groups, DB subnet group only.

## Destroy

```bash
terraform destroy
```

**Warning:** Remove dependent resources (ECS, RDS, ALB, etc.) in later phases before destroying foundational networking.

## State

Initial phase uses **local state** (`terraform.tfstate`), gitignored.

Before multi-developer or CI use, migrate to remote state (S3 + DynamoDB locking). Do not commit state files.

## Outputs

After apply, outputs include `vpc_id`, subnet IDs, security group IDs, and `db_subnet_group_name` for AWS-D04+.

See [AWS-D03 network documentation](../../../docs/aws-deployment/AWS-D03-network-security.md).

## Scope

**Created by this stack:** networking foundation only.

**Not created:** ECS, ECR, RDS instance, ElastiCache, ALB, CloudFront, S3 application bucket, Secrets Manager, Route 53, ACM.
