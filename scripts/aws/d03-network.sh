#!/usr/bin/env bash
# EaziAICall AWS-D03 — Network & Security Foundation (idempotent, AWS CLI only)
set -euo pipefail

readonly PROJECT="EaziAICall"
readonly ENVIRONMENT="production"
readonly MANAGED_BY="aws-cli"
readonly NAME_PREFIX="eaziacall-prod"
readonly VPC_CIDR="10.20.0.0/16"
readonly PUBLIC_CIDRS=("10.20.0.0/24" "10.20.1.0/24")
readonly PRIVATE_CIDRS=("10.20.10.0/24" "10.20.11.0/24")
readonly PUBLIC_NAMES=("${NAME_PREFIX}-public-a" "${NAME_PREFIX}-public-b")
readonly PRIVATE_NAMES=("${NAME_PREFIX}-private-a" "${NAME_PREFIX}-private-b")
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly INVENTORY_FILE="${REPO_ROOT}/docs/aws-deployment/aws-resource-inventory.json"

log() { printf '[d03-network] %s\n' "$*"; }
die() { printf '[d03-network] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

resolve_region() {
  if [[ -n "${AWS_REGION:-}" ]]; then
    echo "${AWS_REGION}"
    return
  fi
  if [[ -n "${AWS_DEFAULT_REGION:-}" ]]; then
    echo "${AWS_DEFAULT_REGION}"
    return
  fi
  local configured
  configured="$(aws configure get region 2>/dev/null || true)"
  if [[ -n "${configured}" ]]; then
    echo "${configured}"
    return
  fi
  die "AWS region is not configured. Set AWS_REGION or configure AWS CLI region."
}

tag_specifications() {
  local resource_type="$1"
  jq -nc \
    --arg rt "${resource_type}" \
    --arg project "${PROJECT}" \
    --arg environment "${ENVIRONMENT}" \
    --arg managed "${MANAGED_BY}" \
    '[{ResourceType:$rt,Tags:[
      {Key:"Project",Value:$project},
      {Key:"Environment",Value:$environment},
      {Key:"ManagedBy",Value:$managed}
    ]}]'
}

tag_specifications_with_name() {
  local resource_type="$1"
  local name="$2"
  jq -nc \
    --arg rt "${resource_type}" \
    --arg project "${PROJECT}" \
    --arg environment "${ENVIRONMENT}" \
    --arg managed "${MANAGED_BY}" \
    --arg name "${name}" \
    '[{ResourceType:$rt,Tags:[
      {Key:"Name",Value:$name},
      {Key:"Project",Value:$project},
      {Key:"Environment",Value:$environment},
      {Key:"ManagedBy",Value:$managed}
    ]}]'
}

find_vpc_by_name() {
  aws ec2 describe-vpcs \
    --region "${REGION}" \
    --filters \
      "Name=tag:Name,Values=${NAME_PREFIX}-vpc" \
      "Name=tag:Project,Values=${PROJECT}" \
      "Name=cidr-block,Values=${VPC_CIDR}" \
    --query 'Vpcs[0].VpcId' \
    --output text 2>/dev/null | sed 's/None//'
}

find_subnet_by_name() {
  local name="$1"
  aws ec2 describe-subnets \
    --region "${REGION}" \
    --filters \
      "Name=tag:Name,Values=${name}" \
      "Name=tag:Project,Values=${PROJECT}" \
      "Name=vpc-id,Values=${VPC_ID}" \
    --query 'Subnets[0].SubnetId' \
    --output text 2>/dev/null | sed 's/None//'
}

find_igw_by_name() {
  aws ec2 describe-internet-gateways \
    --region "${REGION}" \
    --filters \
      "Name=tag:Name,Values=${NAME_PREFIX}-igw" \
      "Name=tag:Project,Values=${PROJECT}" \
      "Name=attachment.vpc-id,Values=${VPC_ID}" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text 2>/dev/null | sed 's/None//'
}

find_eip_allocation_by_name() {
  aws ec2 describe-addresses \
    --region "${REGION}" \
    --filters \
      "Name=tag:Name,Values=${NAME_PREFIX}-nat-eip" \
      "Name=tag:Project,Values=${PROJECT}" \
    --query 'Addresses[0].AllocationId' \
    --output text 2>/dev/null | sed 's/None//'
}

find_nat_by_name() {
  aws ec2 describe-nat-gateways \
    --region "${REGION}" \
    --filter \
      "Name=tag:Name,Values=${NAME_PREFIX}-nat" \
      "Name=tag:Project,Values=${PROJECT}" \
      "Name=vpc-id,Values=${VPC_ID}" \
      "Name=state,Values=available,pending" \
    --query 'NatGateways[0].NatGatewayId' \
    --output text 2>/dev/null | sed 's/None//'
}

find_route_table_by_name() {
  local name="$1"
  aws ec2 describe-route-tables \
    --region "${REGION}" \
    --filters \
      "Name=tag:Name,Values=${name}" \
      "Name=tag:Project,Values=${PROJECT}" \
      "Name=vpc-id,Values=${VPC_ID}" \
    --query 'RouteTables[0].RouteTableId' \
    --output text 2>/dev/null | sed 's/None//'
}

find_sg_by_name() {
  local name="$1"
  aws ec2 describe-security-groups \
    --region "${REGION}" \
    --filters \
      "Name=group-name,Values=${name}" \
      "Name=tag:Project,Values=${PROJECT}" \
      "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null | sed 's/None//'
}

wait_vpc_available() {
  aws ec2 wait vpc-available --region "${REGION}" --vpc-ids "${VPC_ID}"
}

wait_nat_available() {
  aws ec2 wait nat-gateway-available --region "${REGION}" --nat-gateway-ids "${NAT_GATEWAY_ID}"
}

ensure_route_table_association() {
  local subnet_id="$1"
  local rt_id="$2"
  local current
  current="$(aws ec2 describe-route-tables \
    --region "${REGION}" \
    --filters "Name=association.subnet-id,Values=${subnet_id}" \
    --query 'RouteTables[0].RouteTableId' \
    --output text 2>/dev/null | sed 's/None//')"
  if [[ "${current}" == "${rt_id}" ]]; then
    return
  fi
  if [[ -n "${current}" && "${current}" != "${rt_id}" ]]; then
    die "Subnet ${subnet_id} is associated with unexpected route table ${current}; manual review required."
  fi
  aws ec2 associate-route-table \
    --region "${REGION}" \
    --route-table-id "${rt_id}" \
    --subnet-id "${subnet_id}" >/dev/null
}

ensure_route() {
  local rt_id="$1"
  local dest="$2"
  local route_kind="$3"
  local target_id="$4"
  local existing
  existing="$(aws ec2 describe-route-tables \
    --region "${REGION}" \
    --route-table-ids "${rt_id}" \
    --query "RouteTables[0].Routes[?DestinationCidrBlock=='${dest}'] | [0]" \
    --output json)"

  local current_target=""
  case "${route_kind}" in
    igw) current_target="$(echo "${existing}" | jq -r '.GatewayId // empty')" ;;
    nat) current_target="$(echo "${existing}" | jq -r '.NatGatewayId // empty')" ;;
  esac

  if [[ "${current_target}" == "${target_id}" ]]; then
    return
  fi
  if [[ -n "${current_target}" && "${current_target}" != "null" ]]; then
    die "Route table ${rt_id} has conflicting route ${dest}; manual review required."
  fi

  case "${route_kind}" in
    igw)
      aws ec2 create-route \
        --region "${REGION}" \
        --route-table-id "${rt_id}" \
        --destination-cidr-block "${dest}" \
        --gateway-id "${target_id}" >/dev/null 2>&1 || \
      aws ec2 replace-route \
        --region "${REGION}" \
        --route-table-id "${rt_id}" \
        --destination-cidr-block "${dest}" \
        --gateway-id "${target_id}" >/dev/null
      ;;
    nat)
      aws ec2 create-route \
        --region "${REGION}" \
        --route-table-id "${rt_id}" \
        --destination-cidr-block "${dest}" \
        --nat-gateway-id "${target_id}" >/dev/null 2>&1 || \
      aws ec2 replace-route \
        --region "${REGION}" \
        --route-table-id "${rt_id}" \
        --destination-cidr-block "${dest}" \
        --nat-gateway-id "${target_id}" >/dev/null
      ;;
  esac
}

ensure_sg_rule() {
  local sg_id="$1"
  local protocol="$2"
  local from_port="$3"
  local to_port="$4"
  local source_kind="$5"
  local source_value="$6"
  local description="$7"

  local filters=("Name=group-id,Values=${sg_id}")
  case "${source_kind}" in
    group) filters+=("Name=ip-permission.group-id,Values=${source_value}") ;;
    prefix-list) filters+=("Name=ip-permission.prefix-list-id,Values=${source_value}") ;;
    cidr) filters+=("Name=ip-permission.cidr,Values=${source_value}") ;;
  esac

  local exists
  exists="$(aws ec2 describe-security-groups \
    --region "${REGION}" \
    --group-ids "${sg_id}" \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`${from_port}\` && ToPort==\`${to_port}\` && IpProtocol==\`${protocol}\`]" \
    --output json)"

  if [[ "${exists}" != "[]" && "${exists}" != "null" ]]; then
    return
  fi

  local args=(
    --region "${REGION}"
    --group-id "${sg_id}"
    --ip-permissions "IpProtocol=${protocol},FromPort=${from_port},ToPort=${to_port},${source_kind}=${source_value}"
  )
  aws ec2 authorize-security-group-ingress "${args[@]}" >/dev/null 2>&1 || true
}

ensure_sg_egress_all() {
  local sg_id="$1"
  local has_egress
  has_egress="$(aws ec2 describe-security-groups \
    --region "${REGION}" \
    --group-ids "${sg_id}" \
    --query 'SecurityGroups[0].IpPermissionsEgress' \
    --output json)"
  if [[ "${has_egress}" != "[]" ]]; then
    return
  fi
  aws ec2 authorize-security-group-egress \
    --region "${REGION}" \
    --group-id "${sg_id}" \
    --ip-permissions 'IpProtocol=-1,IpRanges=[{CidrIp=0.0.0.0/0,Description=Outbound via NAT}]' >/dev/null 2>&1 || true
}

write_inventory() {
  mkdir -p "$(dirname "${INVENTORY_FILE}")"
  jq -n \
    --arg environment "production" \
    --arg region "${REGION}" \
    --arg accountId "${ACCOUNT_ID}" \
    --arg vpcId "${VPC_ID}" \
    --argjson azs "$(printf '%s\n' "${AZ1}" "${AZ2}" | jq -R . | jq -s .)" \
    --argjson publicSubnetIds "$(printf '%s\n' "${PUBLIC_SUBNET_A_ID}" "${PUBLIC_SUBNET_B_ID}" | jq -R . | jq -s .)" \
    --argjson privateSubnetIds "$(printf '%s\n' "${PRIVATE_SUBNET_A_ID}" "${PRIVATE_SUBNET_B_ID}" | jq -R . | jq -s .)" \
    --arg internetGatewayId "${IGW_ID}" \
    --arg natGatewayId "${NAT_GATEWAY_ID}" \
    --arg natEipAllocationId "${NAT_EIP_ALLOCATION_ID}" \
    --arg publicRouteTableId "${PUBLIC_RT_ID}" \
    --arg privateRouteTableId "${PRIVATE_RT_ID}" \
    --arg albSecurityGroupId "${ALB_SG_ID}" \
    --arg ecsSecurityGroupId "${ECS_SG_ID}" \
    --arg rdsSecurityGroupId "${RDS_SG_ID}" \
    --arg dbSubnetGroupName "${DB_SUBNET_GROUP_NAME}" \
    '{
      environment: $environment,
      region: $region,
      accountId: $accountId,
      network: {
        vpcId: $vpcId,
        availabilityZones: $azs,
        publicSubnetIds: $publicSubnetIds,
        privateSubnetIds: $privateSubnetIds,
        internetGatewayId: $internetGatewayId,
        natGatewayId: $natGatewayId,
        natEipAllocationId: $natEipAllocationId,
        publicRouteTableId: $publicRouteTableId,
        privateRouteTableId: $privateRouteTableId,
        albSecurityGroupId: $albSecurityGroupId,
        ecsSecurityGroupId: $ecsSecurityGroupId,
        rdsSecurityGroupId: $rdsSecurityGroupId,
        dbSubnetGroupName: $dbSubnetGroupName
      }
    }' > "${INVENTORY_FILE}"
  log "Wrote inventory: ${INVENTORY_FILE}"
}

verify_security_groups() {
  log "Verifying security group rules..."

  local ecs_rules rds_rules
  ecs_rules="$(aws ec2 describe-security-groups --region "${REGION}" --group-ids "${ECS_SG_ID}" --output json)"
  rds_rules="$(aws ec2 describe-security-groups --region "${REGION}" --group-ids "${RDS_SG_ID}" --output json)"

  echo "${ecs_rules}" | jq -e --arg alb "${ALB_SG_ID}" \
    '.SecurityGroups[0].IpPermissions[] | select(.FromPort==3000 and .ToPort==3000) | .UserIdGroupPairs[] | select(.GroupId==$alb)' >/dev/null \
    || die "ECS SG must allow TCP 3000 only from ALB SG"

  echo "${rds_rules}" | jq -e --arg ecs "${ECS_SG_ID}" \
    '.SecurityGroups[0].IpPermissions[] | select(.FromPort==5432 and .ToPort==5432) | .UserIdGroupPairs[] | select(.GroupId==$ecs)' >/dev/null \
    || die "RDS SG must allow TCP 5432 only from ECS SG"

  echo "${ecs_rules}" | jq -e '.SecurityGroups[0].IpPermissions[] | select(.IpRanges[]?.CidrIp=="0.0.0.0/0" and .FromPort==3000)' >/dev/null \
    && die "ECS SG must not allow public TCP 3000" || true

  echo "${rds_rules}" | jq -e '.SecurityGroups[0].IpPermissions[] | select(.IpRanges[]?.CidrIp=="0.0.0.0/0" and .FromPort==5432)' >/dev/null \
    && die "RDS SG must not allow public TCP 5432" || true

  local ssh_open
  ssh_open="$(aws ec2 describe-security-groups \
    --region "${REGION}" \
    --group-ids "${ALB_SG_ID}" "${ECS_SG_ID}" "${RDS_SG_ID}" \
    --query 'SecurityGroups[].IpPermissions[?FromPort==`22`]' \
    --output json)"
  [[ "${ssh_open}" == "[]" || "${ssh_open}" == "[[]]" || "${ssh_open}" == "[[], []]" || "${ssh_open}" == "[[], [], []]" ]] \
    || die "SSH port 22 must not be open on D03 security groups"
}

verify_network() {
  log "Verifying network state..."
  aws ec2 describe-vpcs --region "${REGION}" --vpc-ids "${VPC_ID}" --query 'Vpcs[0].State' --output text | grep -q available

  local nat_count
  nat_count="$(aws ec2 describe-nat-gateways \
    --region "${REGION}" \
    --filter "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Project,Values=${PROJECT}" "Name=state,Values=available,pending" \
    --query 'length(NatGateways)' \
    --output text)"
  [[ "${nat_count}" == "1" ]] || die "Expected exactly 1 NAT Gateway for this deployment, found ${nat_count}"

  aws rds describe-db-subnet-groups \
    --region "${REGION}" \
    --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}" \
    --query 'DBSubnetGroups[0].Subnets[].SubnetIdentifier' \
    --output json | jq -e --arg a "${PRIVATE_SUBNET_A_ID}" --arg b "${PRIVATE_SUBNET_B_ID}" \
    'map(select(. == $a or . == $b)) | length == 2' >/dev/null \
    || die "DB subnet group must contain both private subnets"
}

main() {
  require_cmd aws
  require_cmd jq

  REGION="$(resolve_region)"
  export AWS_DEFAULT_REGION="${REGION}"
  log "Using region: ${REGION}"

  ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
  CALLER_ARN="$(aws sts get-caller-identity --query Arn --output text)"
  log "AWS account: ${ACCOUNT_ID}"
  log "Caller: ${CALLER_ARN}"

  # --- VPC ---
  VPC_ID="$(find_vpc_by_name)"
  if [[ -z "${VPC_ID}" ]]; then
    log "Creating VPC ${NAME_PREFIX}-vpc"
    VPC_ID="$(aws ec2 create-vpc \
      --region "${REGION}" \
      --cidr-block "${VPC_CIDR}" \
      --tag-specifications "$(tag_specifications_with_name vpc "${NAME_PREFIX}-vpc")" \
      --query 'Vpc.VpcId' \
      --output text)"
  else
    log "Reusing VPC ${VPC_ID}"
  fi
  aws ec2 modify-vpc-attribute --region "${REGION}" --vpc-id "${VPC_ID}" --enable-dns-support '{"Value":true}' >/dev/null
  aws ec2 modify-vpc-attribute --region "${REGION}" --vpc-id "${VPC_ID}" --enable-dns-hostnames '{"Value":true}' >/dev/null
  wait_vpc_available

  # --- AZs ---
  mapfile -t AZS < <(aws ec2 describe-availability-zones \
    --region "${REGION}" \
    --filters Name=state,Values=available \
    --query 'AvailabilityZones[].ZoneName' \
    --output text | tr '\t' '\n' | head -n 2)
  [[ "${#AZS[@]}" -eq 2 ]] || die "Need at least 2 availability zones"
  AZ1="${AZS[0]}"
  AZ2="${AZS[1]}"
  log "Using AZs: ${AZ1}, ${AZ2}"

  # --- Public subnets ---
  create_subnet() {
    local name="$1"
    local cidr="$2"
    local az="$3"
    local map_public="$4"
    local existing
    existing="$(find_subnet_by_name "${name}")"
    if [[ -n "${existing}" ]]; then
      echo "${existing}"
      return
    fi
    aws ec2 create-subnet \
      --region "${REGION}" \
      --vpc-id "${VPC_ID}" \
      --cidr-block "${cidr}" \
      --availability-zone "${az}" \
      --tag-specifications "$(tag_specifications_with_name subnet "${name}")" \
      --query 'Subnet.SubnetId' \
      --output text
  }

  PUBLIC_SUBNET_A_ID="$(create_subnet "${PUBLIC_NAMES[0]}" "${PUBLIC_CIDRS[0]}" "${AZ1}" true)"
  PUBLIC_SUBNET_B_ID="$(create_subnet "${PUBLIC_NAMES[1]}" "${PUBLIC_CIDRS[1]}" "${AZ2}" true)"
  PRIVATE_SUBNET_A_ID="$(create_subnet "${PRIVATE_NAMES[0]}" "${PRIVATE_CIDRS[0]}" "${AZ1}" false)"
  PRIVATE_SUBNET_B_ID="$(create_subnet "${PRIVATE_NAMES[1]}" "${PRIVATE_CIDRS[1]}" "${AZ2}" false)"

  aws ec2 modify-subnet-attribute --region "${REGION}" --subnet-id "${PUBLIC_SUBNET_A_ID}" --map-public-ip-on-launch >/dev/null
  aws ec2 modify-subnet-attribute --region "${REGION}" --subnet-id "${PUBLIC_SUBNET_B_ID}" --map-public-ip-on-launch >/dev/null
  aws ec2 modify-subnet-attribute --region "${REGION}" --subnet-id "${PRIVATE_SUBNET_A_ID}" --no-map-public-ip-on-launch >/dev/null
  aws ec2 modify-subnet-attribute --region "${REGION}" --subnet-id "${PRIVATE_SUBNET_B_ID}" --no-map-public-ip-on-launch >/dev/null

  # --- IGW ---
  IGW_ID="$(find_igw_by_name)"
  if [[ -z "${IGW_ID}" ]]; then
    log "Creating Internet Gateway"
    IGW_ID="$(aws ec2 create-internet-gateway \
      --region "${REGION}" \
      --tag-specifications "$(tag_specifications_with_name internet-gateway "${NAME_PREFIX}-igw")" \
      --query 'InternetGateway.InternetGatewayId' \
      --output text)"
    aws ec2 attach-internet-gateway --region "${REGION}" --internet-gateway-id "${IGW_ID}" --vpc-id "${VPC_ID}" >/dev/null
  else
    log "Reusing IGW ${IGW_ID}"
  fi

  # --- Public route table ---
  PUBLIC_RT_ID="$(find_route_table_by_name "${NAME_PREFIX}-public-rt")"
  if [[ -z "${PUBLIC_RT_ID}" ]]; then
    PUBLIC_RT_ID="$(aws ec2 create-route-table \
      --region "${REGION}" \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "$(tag_specifications_with_name route-table "${NAME_PREFIX}-public-rt")" \
      --query 'RouteTable.RouteTableId' \
      --output text)"
  fi
  ensure_route "${PUBLIC_RT_ID}" "0.0.0.0/0" "igw" "${IGW_ID}"
  ensure_route_table_association "${PUBLIC_SUBNET_A_ID}" "${PUBLIC_RT_ID}"
  ensure_route_table_association "${PUBLIC_SUBNET_B_ID}" "${PUBLIC_RT_ID}"

  # --- EIP + NAT ---
  NAT_EIP_ALLOCATION_ID="$(find_eip_allocation_by_name)"
  if [[ -z "${NAT_EIP_ALLOCATION_ID}" ]]; then
    NAT_EIP_ALLOCATION_ID="$(aws ec2 allocate-address \
      --region "${REGION}" \
      --domain vpc \
      --tag-specifications "$(tag_specifications_with_name elastic-ip "${NAME_PREFIX}-nat-eip")" \
      --query 'AllocationId' \
      --output text)"
  fi

  NAT_GATEWAY_ID="$(find_nat_by_name)"
  if [[ -z "${NAT_GATEWAY_ID}" ]]; then
    log "Creating NAT Gateway (single NAT for cost control)"
    NAT_GATEWAY_ID="$(aws ec2 create-nat-gateway \
      --region "${REGION}" \
      --subnet-id "${PUBLIC_SUBNET_A_ID}" \
      --allocation-id "${NAT_EIP_ALLOCATION_ID}" \
      --tag-specifications "$(tag_specifications_with_name natgateway "${NAME_PREFIX}-nat")" \
      --query 'NatGateway.NatGatewayId' \
      --output text)"
  fi
  wait_nat_available

  # --- Private route table ---
  PRIVATE_RT_ID="$(find_route_table_by_name "${NAME_PREFIX}-private-rt")"
  if [[ -z "${PRIVATE_RT_ID}" ]]; then
    PRIVATE_RT_ID="$(aws ec2 create-route-table \
      --region "${REGION}" \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "$(tag_specifications_with_name route-table "${NAME_PREFIX}-private-rt")" \
      --query 'RouteTable.RouteTableId' \
      --output text)"
  fi
  ensure_route "${PRIVATE_RT_ID}" "0.0.0.0/0" "nat" "${NAT_GATEWAY_ID}"
  ensure_route_table_association "${PRIVATE_SUBNET_A_ID}" "${PRIVATE_RT_ID}"
  ensure_route_table_association "${PRIVATE_SUBNET_B_ID}" "${PRIVATE_RT_ID}"

  # --- Security groups ---
  create_sg() {
    local name="$1"
    local description="$2"
    local existing
    existing="$(find_sg_by_name "${name}")"
    if [[ -n "${existing}" ]]; then
      echo "${existing}"
      return
    fi
    aws ec2 create-security-group \
      --region "${REGION}" \
      --group-name "${name}" \
      --description "${description}" \
      --vpc-id "${VPC_ID}" \
      --tag-specifications "$(tag_specifications_with_name security-group "${name}")" \
      --query 'GroupId' \
      --output text
  }

  ALB_SG_ID="$(create_sg "${NAME_PREFIX}-alb-sg" "EaziAICall ALB security group")"
  ECS_SG_ID="$(create_sg "${NAME_PREFIX}-ecs-sg" "EaziAICall ECS Fargate security group")"
  RDS_SG_ID="$(create_sg "${NAME_PREFIX}-rds-sg" "EaziAICall RDS PostgreSQL security group")"

  CF_PREFIX_LIST_ID="$(aws ec2 describe-managed-prefix-lists \
    --region "${REGION}" \
    --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
    --query 'PrefixLists[0].PrefixListId' \
    --output text)"
  [[ -n "${CF_PREFIX_LIST_ID}" && "${CF_PREFIX_LIST_ID}" != "None" ]] || die "CloudFront origin-facing prefix list not found"

  aws ec2 authorize-security-group-ingress \
    --region "${REGION}" \
    --group-id "${ALB_SG_ID}" \
    --ip-permissions "IpProtocol=tcp,FromPort=80,ToPort=80,PrefixListIds=[{PrefixListId=${CF_PREFIX_LIST_ID},Description=CloudFront origin-facing}]" \
    >/dev/null 2>&1 || true

  aws ec2 authorize-security-group-egress \
    --region "${REGION}" \
    --group-id "${ALB_SG_ID}" \
    --ip-permissions "IpProtocol=tcp,FromPort=3000,ToPort=3000,UserIdGroupPairs=[{GroupId=${ECS_SG_ID},Description=To ECS tasks}]" \
    >/dev/null 2>&1 || true

  aws ec2 authorize-security-group-ingress \
    --region "${REGION}" \
    --group-id "${ECS_SG_ID}" \
    --ip-permissions "IpProtocol=tcp,FromPort=3000,ToPort=3000,UserIdGroupPairs=[{GroupId=${ALB_SG_ID},Description=From ALB}]" \
    >/dev/null 2>&1 || true

  ensure_sg_egress_all "${ECS_SG_ID}"

  aws ec2 authorize-security-group-ingress \
    --region "${REGION}" \
    --group-id "${RDS_SG_ID}" \
    --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=${ECS_SG_ID},Description=From ECS}]" \
    >/dev/null 2>&1 || true

  # --- DB subnet group ---
  DB_SUBNET_GROUP_NAME="${NAME_PREFIX}-db-subnet-group"
  if aws rds describe-db-subnet-groups --region "${REGION}" --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}" >/dev/null 2>&1; then
    log "Reusing DB subnet group ${DB_SUBNET_GROUP_NAME}"
  else
    aws rds create-db-subnet-group \
      --region "${REGION}" \
      --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}" \
      --db-subnet-group-description "EaziAICall production private RDS subnet group" \
      --subnet-ids "${PRIVATE_SUBNET_A_ID}" "${PRIVATE_SUBNET_B_ID}" \
      --tags Key=Project,Value="${PROJECT}" Key=Environment,Value="${ENVIRONMENT}" Key=ManagedBy,Value="${MANAGED_BY}" Key=Name,Value="${DB_SUBNET_GROUP_NAME}" \
      >/dev/null
  fi

  verify_security_groups
  verify_network
  write_inventory

  log "AWS-D03 network foundation complete."
}

main "$@"
