output "region" {
  description = "AWS region for this stack."
  value       = var.aws_region
}

output "vpc_id" {
  description = "Production VPC identifier."
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "Production VPC CIDR block."
  value       = aws_vpc.main.cidr_block
}

output "availability_zones" {
  description = "Availability zones used by public/private subnets."
  value       = local.availability_zones
}

output "public_subnet_ids" {
  description = "Public subnet IDs (ALB, NAT)."
  value       = [for az in local.availability_zones : aws_subnet.public[az].id]
}

output "private_subnet_ids" {
  description = "Private subnet IDs (ECS, RDS)."
  value       = [for az in local.availability_zones : aws_subnet.private[az].id]
}

output "public_subnet_details" {
  description = "Public subnet metadata for documentation and later phases."
  value = {
    for az, subnet in aws_subnet.public :
    az => {
      id   = subnet.id
      cidr = subnet.cidr_block
      name = subnet.tags.Name
    }
  }
}

output "private_subnet_details" {
  description = "Private subnet metadata for documentation and later phases."
  value = {
    for az, subnet in aws_subnet.private :
    az => {
      id   = subnet.id
      cidr = subnet.cidr_block
      name = subnet.tags.Name
    }
  }
}

output "internet_gateway_id" {
  description = "Internet Gateway attached to the VPC."
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_id" {
  description = "NAT Gateway for private subnet outbound traffic."
  value       = aws_nat_gateway.main.id
}

output "nat_gateway_public_ip" {
  description = "Elastic IP address associated with the NAT Gateway."
  value       = aws_eip.nat.public_ip
}

output "nat_eip_allocation_id" {
  description = "Elastic IP allocation ID for the NAT Gateway."
  value       = aws_eip.nat.id
}

output "alb_security_group_id" {
  description = "Security group for the future Application Load Balancer."
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security group for ECS Fargate tasks."
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Security group for RDS PostgreSQL."
  value       = aws_security_group.rds.id
}

output "db_subnet_group_name" {
  description = "RDS DB subnet group spanning private subnets."
  value       = aws_db_subnet_group.main.name
}

output "name_prefix" {
  description = "Resource naming prefix used across this stack."
  value       = local.name_prefix
}
