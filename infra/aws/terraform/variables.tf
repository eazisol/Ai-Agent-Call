variable "aws_region" {
  description = "AWS region for all EaziAICall production networking resources. Must be set explicitly (no silent default)."
  type        = string
}

variable "project_name" {
  description = "Short project name used in resource naming."
  type        = string
  default     = "eaziacall"
}

variable "environment" {
  description = "Deployment environment label."
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the production VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)."
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "AWS-D03 requires exactly two public subnet CIDR blocks (one per AZ)."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private application/database subnets (one per AZ)."
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "AWS-D03 requires exactly two private subnet CIDR blocks (one per AZ)."
  }
}
