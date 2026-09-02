# EaziAICall AWS-D03 — Network & Security Foundation (idempotent, AWS CLI only)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:NamePrefix = "eaziacall-prod"
$script:VpcCidr = "10.20.0.0/16"
$script:PublicCidrs = @("10.20.0.0/24", "10.20.1.0/24")
$script:PrivateCidrs = @("10.20.10.0/24", "10.20.11.0/24")
$script:PublicNames = @("$($script:NamePrefix)-public-a", "$($script:NamePrefix)-public-b")
$script:PrivateNames = @("$($script:NamePrefix)-private-a", "$($script:NamePrefix)-private-b")
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D03Log {
    param([string]$Message)
    Write-Host "[d03-network] $Message"
}

function Stop-D03 {
    param([string]$Message)
    Write-Error "[d03-network] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D03 "Required command not found: $Name"
    }
}

function Normalize-AwsText {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq "None") {
        return ""
    }
    return $Value.Trim()
}

function Invoke-Aws {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$AwsArgs,
        [switch]$AllowFailure
    )
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @AwsArgs 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction

    if (-not $AllowFailure -and $exitCode -ne 0) {
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-D03 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    return $output
}

function Invoke-AwsText {
    param([string[]]$AwsArgs)
    $result = Invoke-Aws -AwsArgs ($AwsArgs + @("--output", "text"))
    if ($result -is [System.Array]) {
        return (Normalize-AwsText ($result -join "`n"))
    }
    return (Normalize-AwsText ([string]$result))
}

function Invoke-AwsJson {
    param([string[]]$AwsArgs)
    $raw = Invoke-Aws -AwsArgs ($AwsArgs + @("--output", "json"))
    if ($raw -is [System.Array]) {
        $raw = $raw -join "`n"
    }
    return ($raw | ConvertFrom-Json)
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D03 "AWS region is not configured. Set AWS_REGION or configure AWS CLI region."
}

function Escape-JsonString {
    param([string]$Value)
    if ($null -eq $Value) { return "" }
    return ($Value.Replace('\', '\\').Replace('"', '\"'))
}

function Get-TagSpecificationsJson {
    param(
        [Parameter(Mandatory = $true)][string]$ResourceType,
        [string]$Name
    )
    $tagParts = @()
    if ($Name) {
        $tagParts += ('{{"Key":"Name","Value":"{0}"}}' -f (Escape-JsonString $Name))
    }
    $tagParts += ('{{"Key":"Project","Value":"{0}"}}' -f (Escape-JsonString $script:Project))
    $tagParts += ('{{"Key":"Environment","Value":"{0}"}}' -f (Escape-JsonString $script:Environment))
    $tagParts += ('{{"Key":"ManagedBy","Value":"{0}"}}' -f (Escape-JsonString $script:ManagedBy))
    return ('[{{"ResourceType":"{0}","Tags":[{1}]}}]' -f (Escape-JsonString $ResourceType), ($tagParts -join ','))
}

function Get-TagSpecificationsFileArg {
    param(
        [Parameter(Mandatory = $true)][string]$ResourceType,
        [string]$Name
    )
    $json = Get-TagSpecificationsJson -ResourceType $ResourceType -Name $Name
    $tempPath = Join-Path $env:TEMP ("d03-tag-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $json, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Find-VpcByName {
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-vpcs",
        "--region", $script:Region,
        "--filters",
        "Name=tag:Name,Values=$($script:NamePrefix)-vpc",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=cidr-block,Values=$($script:VpcCidr)",
        "--query", "Vpcs[0].VpcId"
    )))
}

function Find-SubnetByName {
    param([string]$Name)
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-subnets",
        "--region", $script:Region,
        "--filters",
        "Name=tag:Name,Values=$Name",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=vpc-id,Values=$($script:VpcId)",
        "--query", "Subnets[0].SubnetId"
    )))
}

function Find-IgwByName {
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-internet-gateways",
        "--region", $script:Region,
        "--filters",
        "Name=tag:Name,Values=$($script:NamePrefix)-igw",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=attachment.vpc-id,Values=$($script:VpcId)",
        "--query", "InternetGateways[0].InternetGatewayId"
    )))
}

function Find-EipAllocationByName {
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-addresses",
        "--region", $script:Region,
        "--filters",
        "Name=tag:Name,Values=$($script:NamePrefix)-nat-eip",
        "Name=tag:Project,Values=$($script:Project)",
        "--query", "Addresses[0].AllocationId"
    )))
}

function Find-NatByName {
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-nat-gateways",
        "--region", $script:Region,
        "--filter",
        "Name=tag:Name,Values=$($script:NamePrefix)-nat",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=vpc-id,Values=$($script:VpcId)",
        "Name=state,Values=available,pending",
        "--query", "NatGateways[0].NatGatewayId"
    )))
}

function Find-RouteTableByName {
    param([string]$Name)
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-route-tables",
        "--region", $script:Region,
        "--filters",
        "Name=tag:Name,Values=$Name",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=vpc-id,Values=$($script:VpcId)",
        "--query", "RouteTables[0].RouteTableId"
    )))
}

function Find-SgByName {
    param([string]$Name)
    return (Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--filters",
        "Name=group-name,Values=$Name",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=vpc-id,Values=$($script:VpcId)",
        "--query", "SecurityGroups[0].GroupId"
    )))
}

function Wait-VpcAvailable {
    Invoke-Aws -AwsArgs @(
        "ec2", "wait", "vpc-available",
        "--region", $script:Region,
        "--vpc-ids", $script:VpcId
    ) | Out-Null
}

function Wait-NatAvailable {
    Invoke-Aws -AwsArgs @(
        "ec2", "wait", "nat-gateway-available",
        "--region", $script:Region,
        "--nat-gateway-ids", $script:NatGatewayId
    ) | Out-Null
}

function Ensure-RouteTableAssociation {
    param(
        [string]$SubnetId,
        [string]$RouteTableId
    )
    $current = Normalize-AwsText (Invoke-AwsText -AwsArgs @(
        "ec2", "describe-route-tables",
        "--region", $script:Region,
        "--filters", "Name=association.subnet-id,Values=$SubnetId",
        "--query", "RouteTables[0].RouteTableId"
    ))
    if ($current -eq $RouteTableId) { return }
    if ($current) {
        Stop-D03 "Subnet $SubnetId is associated with unexpected route table $current; manual review required."
    }
    Invoke-Aws -AwsArgs @(
        "ec2", "associate-route-table",
        "--region", $script:Region,
        "--route-table-id", $RouteTableId,
        "--subnet-id", $SubnetId
    ) | Out-Null
}

function Ensure-Route {
    param(
        [string]$RouteTableId,
        [string]$Destination,
        [ValidateSet("igw", "nat")][string]$RouteKind,
        [string]$TargetId
    )
    $existing = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-route-tables",
        "--region", $script:Region,
        "--route-table-ids", $RouteTableId,
        "--query", "RouteTables[0].Routes[?DestinationCidrBlock=='$Destination'] | [0]"
    )
    $currentTarget = ""
    if ($RouteKind -eq "igw" -and $existing.GatewayId) {
        $currentTarget = [string]$existing.GatewayId
    }
    if ($RouteKind -eq "nat" -and $existing.NatGatewayId) {
        $currentTarget = [string]$existing.NatGatewayId
    }
    if ($currentTarget -eq $TargetId) { return }
    if ($currentTarget) {
        Stop-D03 "Route table $RouteTableId has conflicting route $Destination; manual review required."
    }
    $createArgs = @(
        "ec2", "create-route",
        "--region", $script:Region,
        "--route-table-id", $RouteTableId,
        "--destination-cidr-block", $Destination
    )
    if ($RouteKind -eq "igw") {
        $createArgs += @("--gateway-id", $TargetId)
    } else {
        $createArgs += @("--nat-gateway-id", $TargetId)
    }
    Invoke-Aws -AwsArgs $createArgs -AllowFailure | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $replaceArgs = @(
            "ec2", "replace-route",
            "--region", $script:Region,
            "--route-table-id", $RouteTableId,
            "--destination-cidr-block", $Destination
        )
        if ($RouteKind -eq "igw") {
            $replaceArgs += @("--gateway-id", $TargetId)
        } else {
            $replaceArgs += @("--nat-gateway-id", $TargetId)
        }
        Invoke-Aws -AwsArgs $replaceArgs | Out-Null
    }
}

function Ensure-SgEgressAll {
    param([string]$SecurityGroupId)
    $sg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--group-ids", $SecurityGroupId
    )
    if ($sg.SecurityGroups[0].IpPermissionsEgress.Count -gt 0) { return }
    Invoke-Aws -AwsArgs @(
        "ec2", "authorize-security-group-egress",
        "--region", $script:Region,
        "--group-id", $SecurityGroupId,
        "--ip-permissions", "IpProtocol=-1,IpRanges=[{CidrIp=0.0.0.0/0,Description=Outbound via NAT}]"
    ) -AllowFailure | Out-Null
}

function New-OrReuseSubnet {
    param(
        [string]$Name,
        [string]$Cidr,
        [string]$Az
    )
    $existing = Find-SubnetByName -Name $Name
    if ($existing) { return $existing }
    return (Invoke-AwsText -AwsArgs @(
        "ec2", "create-subnet",
        "--region", $script:Region,
        "--vpc-id", $script:VpcId,
        "--cidr-block", $Cidr,
        "--availability-zone", $Az,
        "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "subnet" -Name $Name),
        "--query", "Subnet.SubnetId"
    ))
}

function New-OrReuseSecurityGroup {
    param(
        [string]$Name,
        [string]$Description
    )
    $existing = Find-SgByName -Name $Name
    if ($existing) { return $existing }
    return (Invoke-AwsText -AwsArgs @(
        "ec2", "create-security-group",
        "--region", $script:Region,
        "--group-name", $Name,
        "--description", $Description,
        "--vpc-id", $script:VpcId,
        "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "security-group" -Name $Name),
        "--query", "GroupId"
    ))
}

function Write-Inventory {
    $inventory = [ordered]@{
        environment = "production"
        region      = $script:Region
        accountId   = $script:AccountId
        network     = [ordered]@{
            vpcId               = $script:VpcId
            availabilityZones   = @($script:Az1, $script:Az2)
            publicSubnetIds     = @($script:PublicSubnetAId, $script:PublicSubnetBId)
            privateSubnetIds    = @($script:PrivateSubnetAId, $script:PrivateSubnetBId)
            internetGatewayId   = $script:IgwId
            natGatewayId        = $script:NatGatewayId
            natEipAllocationId  = $script:NatEipAllocationId
            publicRouteTableId  = $script:PublicRtId
            privateRouteTableId = $script:PrivateRtId
            albSecurityGroupId  = $script:AlbSgId
            ecsSecurityGroupId  = $script:EcsSgId
            rdsSecurityGroupId  = $script:RdsSgId
            dbSubnetGroupName   = $script:DbSubnetGroupName
        }
    }
    $dir = Split-Path $script:InventoryFile -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    ($inventory | ConvertTo-Json -Depth 6) | Set-Content -Path $script:InventoryFile -Encoding utf8
    Write-D03Log "Wrote inventory: $($script:InventoryFile)"
}

function Test-SecurityGroups {
    Write-D03Log "Verifying security group rules..."

    $ecsRules = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--group-ids", $script:EcsSgId
    )
    $rdsRules = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--group-ids", $script:RdsSgId
    )

    $ecsFromAlb = $ecsRules.SecurityGroups[0].IpPermissions |
        Where-Object { $_.FromPort -eq 3000 -and $_.ToPort -eq 3000 } |
        ForEach-Object { $_.UserIdGroupPairs } |
        Where-Object { $_.GroupId -eq $script:AlbSgId }
    if (-not $ecsFromAlb) {
        Stop-D03 "ECS SG must allow TCP 3000 only from ALB SG"
    }

    $rdsFromEcs = $rdsRules.SecurityGroups[0].IpPermissions |
        Where-Object { $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 } |
        ForEach-Object { $_.UserIdGroupPairs } |
        Where-Object { $_.GroupId -eq $script:EcsSgId }
    if (-not $rdsFromEcs) {
        Stop-D03 "RDS SG must allow TCP 5432 only from ECS SG"
    }

    $ecsPublic = $ecsRules.SecurityGroups[0].IpPermissions |
        Where-Object {
            $_.FromPort -eq 3000 -and
            $_.IpRanges -and
            ($_.IpRanges | Where-Object { $_.CidrIp -eq "0.0.0.0/0" })
        }
    if ($ecsPublic) { Stop-D03 "ECS SG must not allow public TCP 3000" }

    $rdsPublic = $rdsRules.SecurityGroups[0].IpPermissions |
        Where-Object {
            $_.FromPort -eq 5432 -and
            $_.IpRanges -and
            ($_.IpRanges | Where-Object { $_.CidrIp -eq "0.0.0.0/0" })
        }
    if ($rdsPublic) { Stop-D03 "RDS SG must not allow public TCP 5432" }

    $allSgs = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--group-ids", $script:AlbSgId, $script:EcsSgId, $script:RdsSgId
    )
    foreach ($sg in $allSgs.SecurityGroups) {
        $ssh = $sg.IpPermissions | Where-Object { $_.FromPort -eq 22 -or $_.ToPort -eq 22 }
        if ($ssh) {
            Stop-D03 "SSH port 22 must not be open on D03 security groups"
        }
    }
}

function Test-NetworkState {
    Write-D03Log "Verifying network state..."

    $vpcState = Invoke-AwsText -AwsArgs @(
        "ec2", "describe-vpcs",
        "--region", $script:Region,
        "--vpc-ids", $script:VpcId,
        "--query", "Vpcs[0].State"
    )
    if ($vpcState -ne "available") {
        Stop-D03 "VPC is not available (state=$vpcState)"
    }

    $natCount = Invoke-AwsText -AwsArgs @(
        "ec2", "describe-nat-gateways",
        "--region", $script:Region,
        "--filter",
        "Name=vpc-id,Values=$($script:VpcId)",
        "Name=tag:Project,Values=$($script:Project)",
        "Name=state,Values=available,pending",
        "--query", "length(NatGateways)"
    )
    if ($natCount -ne "1") {
        Stop-D03 "Expected exactly 1 NAT Gateway for this deployment, found $natCount"
    }

    $subnetIds = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-subnet-groups",
        "--region", $script:Region,
        "--db-subnet-group-name", $script:DbSubnetGroupName,
        "--query", "DBSubnetGroups[0].Subnets[].SubnetIdentifier"
    )
    $matched = @($subnetIds | Where-Object { $_ -eq $script:PrivateSubnetAId -or $_ -eq $script:PrivateSubnetBId })
    if ($matched.Count -ne 2) {
        Stop-D03 "DB subnet group must contain both private subnets"
    }
}

function Main {
    Test-CommandExists -Name "aws"

    $script:Region = Get-ResolvedRegion
    $env:AWS_DEFAULT_REGION = $script:Region
    Write-D03Log "Using region: $($script:Region)"

    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    $script:AccountId = [string]$identity.Account
    $script:CallerArn = [string]$identity.Arn
    Write-D03Log "AWS account: $($script:AccountId)"
    Write-D03Log "Caller: $($script:CallerArn)"

    $script:VpcId = Find-VpcByName
    if (-not $script:VpcId) {
        Write-D03Log "Creating VPC $($script:NamePrefix)-vpc"
        $script:VpcId = Invoke-AwsText -AwsArgs @(
            "ec2", "create-vpc",
            "--region", $script:Region,
            "--cidr-block", $script:VpcCidr,
            "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "vpc" -Name "$($script:NamePrefix)-vpc"),
            "--query", "Vpc.VpcId"
        )
    } else {
        Write-D03Log "Reusing VPC $($script:VpcId)"
    }

    Invoke-Aws -AwsArgs @(
        "ec2", "modify-vpc-attribute",
        "--region", $script:Region,
        "--vpc-id", $script:VpcId,
        "--enable-dns-support"
    ) | Out-Null
    Invoke-Aws -AwsArgs @(
        "ec2", "modify-vpc-attribute",
        "--region", $script:Region,
        "--vpc-id", $script:VpcId,
        "--enable-dns-hostnames"
    ) | Out-Null
    Wait-VpcAvailable

    $azResponse = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-availability-zones",
        "--region", $script:Region,
        "--filters", "Name=state,Values=available",
        "--query", "AvailabilityZones[].ZoneName"
    )
    $azs = @($azResponse | Select-Object -First 2)
    if ($azs.Count -lt 2) {
        Stop-D03 "Need at least 2 availability zones"
    }
    $script:Az1 = [string]$azs[0]
    $script:Az2 = [string]$azs[1]
    Write-D03Log "Using AZs: $($script:Az1), $($script:Az2)"

    $script:PublicSubnetAId = New-OrReuseSubnet -Name $script:PublicNames[0] -Cidr $script:PublicCidrs[0] -Az $script:Az1
    $script:PublicSubnetBId = New-OrReuseSubnet -Name $script:PublicNames[1] -Cidr $script:PublicCidrs[1] -Az $script:Az2
    $script:PrivateSubnetAId = New-OrReuseSubnet -Name $script:PrivateNames[0] -Cidr $script:PrivateCidrs[0] -Az $script:Az1
    $script:PrivateSubnetBId = New-OrReuseSubnet -Name $script:PrivateNames[1] -Cidr $script:PrivateCidrs[1] -Az $script:Az2

    Invoke-Aws -AwsArgs @("ec2", "modify-subnet-attribute", "--region", $script:Region, "--subnet-id", $script:PublicSubnetAId, "--map-public-ip-on-launch") | Out-Null
    Invoke-Aws -AwsArgs @("ec2", "modify-subnet-attribute", "--region", $script:Region, "--subnet-id", $script:PublicSubnetBId, "--map-public-ip-on-launch") | Out-Null
    Invoke-Aws -AwsArgs @("ec2", "modify-subnet-attribute", "--region", $script:Region, "--subnet-id", $script:PrivateSubnetAId, "--no-map-public-ip-on-launch") | Out-Null
    Invoke-Aws -AwsArgs @("ec2", "modify-subnet-attribute", "--region", $script:Region, "--subnet-id", $script:PrivateSubnetBId, "--no-map-public-ip-on-launch") | Out-Null

    $script:IgwId = Find-IgwByName
    if (-not $script:IgwId) {
        Write-D03Log "Creating Internet Gateway"
        $script:IgwId = Invoke-AwsText -AwsArgs @(
            "ec2", "create-internet-gateway",
            "--region", $script:Region,
            "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "internet-gateway" -Name "$($script:NamePrefix)-igw"),
            "--query", "InternetGateway.InternetGatewayId"
        )
        Invoke-Aws -AwsArgs @(
            "ec2", "attach-internet-gateway",
            "--region", $script:Region,
            "--internet-gateway-id", $script:IgwId,
            "--vpc-id", $script:VpcId
        ) | Out-Null
    } else {
        Write-D03Log "Reusing IGW $($script:IgwId)"
    }

    $script:PublicRtId = Find-RouteTableByName -Name "$($script:NamePrefix)-public-rt"
    if (-not $script:PublicRtId) {
        $script:PublicRtId = Invoke-AwsText -AwsArgs @(
            "ec2", "create-route-table",
            "--region", $script:Region,
            "--vpc-id", $script:VpcId,
            "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "route-table" -Name "$($script:NamePrefix)-public-rt"),
            "--query", "RouteTable.RouteTableId"
        )
    }
    Ensure-Route -RouteTableId $script:PublicRtId -Destination "0.0.0.0/0" -RouteKind "igw" -TargetId $script:IgwId
    Ensure-RouteTableAssociation -SubnetId $script:PublicSubnetAId -RouteTableId $script:PublicRtId
    Ensure-RouteTableAssociation -SubnetId $script:PublicSubnetBId -RouteTableId $script:PublicRtId

    $script:NatEipAllocationId = Find-EipAllocationByName
    if (-not $script:NatEipAllocationId) {
        $script:NatEipAllocationId = Invoke-AwsText -AwsArgs @(
            "ec2", "allocate-address",
            "--region", $script:Region,
            "--domain", "vpc",
            "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "elastic-ip" -Name "$($script:NamePrefix)-nat-eip"),
            "--query", "AllocationId"
        )
    }

    $script:NatGatewayId = Find-NatByName
    if (-not $script:NatGatewayId) {
        Write-D03Log "Creating NAT Gateway (single NAT for cost control)"
        $script:NatGatewayId = Invoke-AwsText -AwsArgs @(
            "ec2", "create-nat-gateway",
            "--region", $script:Region,
            "--subnet-id", $script:PublicSubnetAId,
            "--allocation-id", $script:NatEipAllocationId,
            "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "natgateway" -Name "$($script:NamePrefix)-nat"),
            "--query", "NatGateway.NatGatewayId"
        )
    }
    Wait-NatAvailable

    $script:PrivateRtId = Find-RouteTableByName -Name "$($script:NamePrefix)-private-rt"
    if (-not $script:PrivateRtId) {
        $script:PrivateRtId = Invoke-AwsText -AwsArgs @(
            "ec2", "create-route-table",
            "--region", $script:Region,
            "--vpc-id", $script:VpcId,
            "--tag-specifications", (Get-TagSpecificationsFileArg -ResourceType "route-table" -Name "$($script:NamePrefix)-private-rt"),
            "--query", "RouteTable.RouteTableId"
        )
    }
    Ensure-Route -RouteTableId $script:PrivateRtId -Destination "0.0.0.0/0" -RouteKind "nat" -TargetId $script:NatGatewayId
    Ensure-RouteTableAssociation -SubnetId $script:PrivateSubnetAId -RouteTableId $script:PrivateRtId
    Ensure-RouteTableAssociation -SubnetId $script:PrivateSubnetBId -RouteTableId $script:PrivateRtId

    $script:AlbSgId = New-OrReuseSecurityGroup -Name "$($script:NamePrefix)-alb-sg" -Description "EaziAICall ALB security group"
    $script:EcsSgId = New-OrReuseSecurityGroup -Name "$($script:NamePrefix)-ecs-sg" -Description "EaziAICall ECS Fargate security group"
    $script:RdsSgId = New-OrReuseSecurityGroup -Name "$($script:NamePrefix)-rds-sg" -Description "EaziAICall RDS PostgreSQL security group"

    $cfPrefixListId = Invoke-AwsText -AwsArgs @(
        "ec2", "describe-managed-prefix-lists",
        "--region", $script:Region,
        "--filters", "Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing",
        "--query", "PrefixLists[0].PrefixListId"
    )
    if (-not $cfPrefixListId) {
        Stop-D03 "CloudFront origin-facing prefix list not found"
    }

    Invoke-Aws -AwsArgs @(
        "ec2", "authorize-security-group-ingress",
        "--region", $script:Region,
        "--group-id", $script:AlbSgId,
        "--ip-permissions", "IpProtocol=tcp,FromPort=80,ToPort=80,PrefixListIds=[{PrefixListId=$cfPrefixListId,Description=CloudFront origin-facing}]"
    ) -AllowFailure | Out-Null

    Invoke-Aws -AwsArgs @(
        "ec2", "authorize-security-group-egress",
        "--region", $script:Region,
        "--group-id", $script:AlbSgId,
        "--ip-permissions", "IpProtocol=tcp,FromPort=3000,ToPort=3000,UserIdGroupPairs=[{GroupId=$($script:EcsSgId),Description=To ECS tasks}]"
    ) -AllowFailure | Out-Null

    Invoke-Aws -AwsArgs @(
        "ec2", "authorize-security-group-ingress",
        "--region", $script:Region,
        "--group-id", $script:EcsSgId,
        "--ip-permissions", "IpProtocol=tcp,FromPort=3000,ToPort=3000,UserIdGroupPairs=[{GroupId=$($script:AlbSgId),Description=From ALB}]"
    ) -AllowFailure | Out-Null

    Ensure-SgEgressAll -SecurityGroupId $script:EcsSgId

    Invoke-Aws -AwsArgs @(
        "ec2", "authorize-security-group-ingress",
        "--region", $script:Region,
        "--group-id", $script:RdsSgId,
        "--ip-permissions", "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=$($script:EcsSgId),Description=From ECS}]"
    ) -AllowFailure | Out-Null

    $script:DbSubnetGroupName = "$($script:NamePrefix)-db-subnet-group"
    Invoke-Aws -AwsArgs @(
        "rds", "describe-db-subnet-groups",
        "--region", $script:Region,
        "--db-subnet-group-name", $script:DbSubnetGroupName
    ) -AllowFailure | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-D03Log "Reusing DB subnet group $($script:DbSubnetGroupName)"
    } else {
        Invoke-Aws -AwsArgs @(
            "rds", "create-db-subnet-group",
            "--region", $script:Region,
            "--db-subnet-group-name", $script:DbSubnetGroupName,
            "--db-subnet-group-description", "EaziAICall production private RDS subnet group",
            "--subnet-ids", $script:PrivateSubnetAId, $script:PrivateSubnetBId,
            "--tags",
            "Key=Project,Value=$($script:Project)",
            "Key=Environment,Value=$($script:Environment)",
            "Key=ManagedBy,Value=$($script:ManagedBy)",
            "Key=Name,Value=$($script:DbSubnetGroupName)"
        ) | Out-Null
    }

    Test-SecurityGroups
    Test-NetworkState
    Write-Inventory

    Write-D03Log "AWS-D03 network foundation complete."
}

Main
