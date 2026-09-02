locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = "EaziAICall"
    Environment = "production"
    ManagedBy   = "Terraform"
  }

  # Use the first two available AZs in the selected region.
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)

  public_subnet_map = {
    for index, cidr in var.public_subnet_cidrs :
    local.availability_zones[index] => cidr
  }

  private_subnet_map = {
    for index, cidr in var.private_subnet_cidrs :
    local.availability_zones[index] => cidr
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# CloudFront origin-facing managed prefix list for ALB ingress (temporary architecture).
data "aws_ec2_managed_prefix_list" "cloudfront_origin_facing" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}
