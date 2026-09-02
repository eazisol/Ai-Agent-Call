# EaziAICall AWS-D09 - ALB + Target Group Foundation (idempotent, AWS CLI only, NO ECS service/task)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:AlbName = "eaziacall-prod-alb"
$script:TargetGroupName = "eaziacall-prod-backend-tg"
$script:ListenerPort = 80
$script:TargetPort = 3000
$script:HealthCheckPath = "/health/live"
$script:IdleTimeoutSeconds = 120
$script:DeregistrationDelaySeconds = 30
$script:CloudFrontPrefixListName = "com.amazonaws.global.cloudfront.origin-facing"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D09Log {
    param([string]$Message)
    Write-Host "[d09-alb] $Message"
}

function Stop-D09 {
    param([string]$Message)
    Write-Error "[d09-alb] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D09 "Required command not found: $Name"
    }
}

function Normalize-AwsText {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq "None") { return "" }
    return $Value.Trim()
}

function Invoke-Aws {
    param(
        [Parameter(Mandatory = $true)][string[]]$AwsArgs,
        [switch]$AllowFailure
    )
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @AwsArgs 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    if (-not $AllowFailure -and $exitCode -ne 0) {
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-D09 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    return $output
}

function Invoke-AwsText {
    param([string[]]$AwsArgs, [switch]$AllowFailure)
    $result = Invoke-Aws -AwsArgs ($AwsArgs + @("--output", "text")) -AllowFailure:$AllowFailure
    if ($result -is [System.Array]) { return (Normalize-AwsText ($result -join "`n")) }
    return (Normalize-AwsText ([string]$result))
}

function Invoke-AwsJson {
    param([string[]]$AwsArgs, [switch]$AllowFailure)
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @($AwsArgs + @("--output", "json")) 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    if ($exitCode -ne 0) {
        if ($AllowFailure) { return $null }
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-D09 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D09 "AWS CLI returned empty JSON: aws $($AwsArgs -join ' ')"
    }
    return ($raw | ConvertFrom-Json)
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D09 "AWS region is not configured."
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D09 "Resource inventory not found: $($script:InventoryFile)"
    }
    try {
        return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        Stop-D09 "Failed to parse resource inventory."
    }
}

function Test-PreflightIdentity {
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ($identity.Account -ne $script:ExpectedAccountId) {
        Stop-D09 "Unexpected AWS account: $($identity.Account)"
    }
    $script:Region = Get-ResolvedRegion
    if ($script:Region -ne "us-east-1") {
        Stop-D09 "Unexpected region: $($script:Region) (expected us-east-1)"
    }
    $script:CallerArn = $identity.Arn
    Write-D09Log "Using region: $($script:Region)"
    Write-D09Log "AWS account: $($identity.Account)"
    Write-D09Log "Caller: $($identity.Arn)"
}

function Test-InventoryPrerequisites {
    param($Inventory)
    if ($Inventory.accountId -ne $script:ExpectedAccountId) {
        Stop-D09 "Inventory accountId mismatch"
    }
    if ($Inventory.region -ne $script:Region) {
        Stop-D09 "Inventory region mismatch"
    }
    if (-not $Inventory.network.vpcId) { Stop-D09 "Inventory missing network.vpcId" }
    if (-not $Inventory.network.publicSubnetIds -or $Inventory.network.publicSubnetIds.Count -ne 2) {
        Stop-D09 "Inventory must contain exactly 2 public subnet IDs"
    }
    if (-not $Inventory.network.albSecurityGroupId) { Stop-D09 "Inventory missing albSecurityGroupId" }
    if (-not $Inventory.network.ecsSecurityGroupId) { Stop-D09 "Inventory missing ecsSecurityGroupId" }
    if (-not $Inventory.ecs.clusterName) { Stop-D09 "Inventory missing ecs.clusterName" }
    if (-not $Inventory.ecs.taskDefinitionFamily) { Stop-D09 "Inventory missing ecs.taskDefinitionFamily" }
    if ([int]$Inventory.ecs.containerPort -ne $script:TargetPort) {
        Stop-D09 "Inventory ecs.containerPort must be $($script:TargetPort)"
    }

    $script:VpcId = $Inventory.network.vpcId
    $script:PublicSubnetIds = @($Inventory.network.publicSubnetIds)
    $script:PrivateSubnetIds = @($Inventory.network.privateSubnetIds)
    $script:AlbSgId = $Inventory.network.albSecurityGroupId
    $script:EcsSgId = $Inventory.network.ecsSecurityGroupId
    $script:ClusterName = $Inventory.ecs.clusterName
    $script:TaskDefinitionFamily = $Inventory.ecs.taskDefinitionFamily
    $script:TaskDefinitionArn = $Inventory.ecs.taskDefinitionArn
    $script:ContainerName = $Inventory.ecs.containerName
    $script:ContainerPort = [int]$Inventory.ecs.containerPort
}

function Test-LiveNetworkResources {
    $vpc = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-vpcs", "--region", $script:Region,
        "--vpc-ids", $script:VpcId
    )
    if (-not $vpc.Vpcs -or $vpc.Vpcs.Count -eq 0) {
        Stop-D09 "VPC not found: $($script:VpcId)"
    }

    foreach ($subnetId in $script:PublicSubnetIds) {
        $subnet = Invoke-AwsJson -AwsArgs @(
            "ec2", "describe-subnets", "--region", $script:Region,
            "--subnet-ids", $subnetId
        )
        if (-not $subnet.Subnets -or $subnet.Subnets.Count -eq 0) {
            Stop-D09 "Public subnet not found: $subnetId"
        }
        if ($subnet.Subnets[0].VpcId -ne $script:VpcId) {
            Stop-D09 "Public subnet $subnetId is not in VPC $($script:VpcId)"
        }
    }
}

function Test-LiveEcsPrerequisites {
    $cluster = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-clusters", "--region", $script:Region,
        "--clusters", $script:ClusterName,
        "--include", "SETTINGS"
    )
    if (-not $cluster.clusters -or $cluster.clusters.Count -eq 0 -or $cluster.clusters[0].status -ne "ACTIVE") {
        Stop-D09 "ECS cluster not ACTIVE: $($script:ClusterName)"
    }

    $td = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-task-definition", "--region", $script:Region,
        "--task-definition", $script:TaskDefinitionFamily
    )
    $container = $td.taskDefinition.containerDefinitions | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    if (-not $container) {
        Stop-D09 "Task definition missing container: $($script:ContainerName)"
    }
    $port = [int]$container.portMappings[0].containerPort
    if ($port -ne $script:TargetPort) {
        Stop-D09 "Task definition container port is $port (expected $($script:TargetPort))"
    }
}

function Resolve-CloudFrontPrefixList {
    $lists = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-managed-prefix-lists",
        "--region", $script:Region,
        "--filters", "Name=prefix-list-name,Values=$($script:CloudFrontPrefixListName)"
    )
    if (-not $lists.PrefixLists -or $lists.PrefixLists.Count -eq 0) {
        Stop-D09 "CloudFront origin-facing managed prefix list not found"
    }
    $pl = $lists.PrefixLists[0]
    if ($pl.OwnerId -ne "AWS") {
        Stop-D09 "Prefix list $($pl.PrefixListId) is not AWS-managed"
    }
    $script:CloudFrontPrefixListId = $pl.PrefixListId
    $script:CloudFrontPrefixListNameResolved = $pl.PrefixListName
    Write-D09Log "CloudFront prefix list: $($pl.PrefixListName) ($($pl.PrefixListId))"
}

function Test-SecurityGroupRules {
    $sg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups", "--region", $script:Region,
        "--group-ids", $script:AlbSgId, $script:EcsSgId
    )

    $albSg = $sg.SecurityGroups | Where-Object { $_.GroupId -eq $script:AlbSgId } | Select-Object -First 1
    $ecsSg = $sg.SecurityGroups | Where-Object { $_.GroupId -eq $script:EcsSgId } | Select-Object -First 1
    if (-not $albSg -or -not $ecsSg) {
        Stop-D09 "ALB or ECS security group not found"
    }

    $albIngress80 = $albSg.IpPermissions |
        Where-Object { $_.IpProtocol -eq "tcp" -and $_.FromPort -eq 80 -and $_.ToPort -eq 80 }
    $cfIngress = $albIngress80.PrefixListIds | Where-Object { $_.PrefixListId -eq $script:CloudFrontPrefixListId }
    if (-not $cfIngress) {
        Stop-D09 "ALB SG must allow TCP 80 from CloudFront origin-facing prefix list $($script:CloudFrontPrefixListId)"
    }

    $public3000 = $albSg.IpPermissions |
        Where-Object { $_.IpProtocol -eq "tcp" -and $_.FromPort -eq 3000 -and $_.ToPort -eq 3000 }
    if ($public3000) {
        Stop-D09 "ALB SG must not expose port 3000 inbound"
    }

    $ecsFromAlb = $ecsSg.IpPermissions |
        Where-Object { $_.IpProtocol -eq "tcp" -and $_.FromPort -eq 3000 -and $_.ToPort -eq 3000 } |
        ForEach-Object { $_.UserIdGroupPairs } |
        Where-Object { $_.GroupId -eq $script:AlbSgId }
    if (-not $ecsFromAlb) {
        Stop-D09 "ECS SG must allow TCP 3000 from ALB SG only"
    }

    $script:AlbSgRules = $albSg
    $script:EcsSgRules = $ecsSg
}

function Ensure-AlbSgEgressLeastPrivilege {
    $albSg = $script:AlbSgRules
    $broadEgress = $albSg.IpPermissionsEgress |
        Where-Object { $_.IpProtocol -eq "-1" -and $_.IpRanges.CidrIp -contains "0.0.0.0/0" }

    if ($broadEgress) {
        Write-D09Log "Removing broad IPv4 all-traffic egress from ALB SG"
        Invoke-Aws -AwsArgs @(
            "ec2", "revoke-security-group-egress",
            "--region", $script:Region,
            "--group-id", $script:AlbSgId,
            "--ip-permissions", "IpProtocol=-1,IpRanges=[{CidrIp=0.0.0.0/0}]"
        ) -AllowFailure | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-D09Log "Could not revoke default ALB SG egress; documenting and continuing verification"
        }
    }

    $ecsEgress = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups", "--region", $script:Region,
        "--group-ids", $script:AlbSgId
    )
    $updated = $ecsEgress.SecurityGroups[0]
    $toEcs = $updated.IpPermissionsEgress |
        Where-Object { $_.IpProtocol -eq "tcp" -and $_.FromPort -eq 3000 -and $_.ToPort -eq 3000 } |
        ForEach-Object { $_.UserIdGroupPairs } |
        Where-Object { $_.GroupId -eq $script:EcsSgId }

    if (-not $toEcs) {
        Write-D09Log "Ensuring ALB SG egress TCP 3000 to ECS SG"
        Invoke-Aws -AwsArgs @(
            "ec2", "authorize-security-group-egress",
            "--region", $script:Region,
            "--group-id", $script:AlbSgId,
            "--ip-permissions", "IpProtocol=tcp,FromPort=3000,ToPort=3000,UserIdGroupPairs=[{GroupId=$($script:EcsSgId),Description=To ECS tasks}]"
        ) -AllowFailure | Out-Null
    }

    $final = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups", "--region", $script:Region,
        "--group-ids", $script:AlbSgId
    )
    $script:AlbSgRules = $final.SecurityGroups[0]

    $remainingBroad = $script:AlbSgRules.IpPermissionsEgress |
        Where-Object { $_.IpProtocol -eq "-1" -and ($_.IpRanges.CidrIp -contains "0.0.0.0/0" -or $_.Ipv6Ranges.CidrIpv6 -contains "::/0") }
    if ($remainingBroad) {
        Write-D09Log "Note: ALB SG still has broad egress (AWS may require default rule in some cases)"
    }
}

function Find-LoadBalancerByName {
    $result = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-load-balancers", "--region", $script:Region,
        "--names", $script:AlbName
    ) -AllowFailure
    if ($result -and $result.LoadBalancers -and $result.LoadBalancers.Count -gt 0) {
        return $result.LoadBalancers[0]
    }
    return $null
}

function Test-LoadBalancerCompatible {
    param($Alb)
    if ($Alb.Type -ne "application") { Stop-D09 "Existing ALB type incompatible: $($Alb.Type)" }
    if ($Alb.Scheme -ne "internet-facing") { Stop-D09 "Existing ALB scheme incompatible: $($Alb.Scheme)" }
    if ($Alb.IpAddressType -ne "ipv4") { Stop-D09 "Existing ALB IP type incompatible: $($Alb.IpAddressType)" }
    if ($Alb.VpcId -ne $script:VpcId) { Stop-D09 "Existing ALB VPC incompatible: $($Alb.VpcId)" }

    $subnetSet = @($Alb.AvailabilityZones | ForEach-Object { $_.SubnetId } | Sort-Object)
    $expected = @($script:PublicSubnetIds | Sort-Object)
    if (($subnetSet -join ",") -ne ($expected -join ",")) {
        Stop-D09 "Existing ALB subnets incompatible"
    }

    $sgSet = @($Alb.SecurityGroups | Sort-Object)
    $expectedSg = @($script:AlbSgId)
    if (($sgSet -join ",") -ne ($expectedSg -join ",")) {
        Stop-D09 "Existing ALB security groups incompatible"
    }
}

function New-OrReuseLoadBalancer {
    $existing = Find-LoadBalancerByName
    if ($existing) {
        Test-LoadBalancerCompatible -Alb $existing
        Write-D09Log "Reusing ALB $($script:AlbName)"
        $script:LoadBalancerArn = $existing.LoadBalancerArn
        $script:LoadBalancerDns = $existing.DNSName
        $script:CanonicalHostedZoneId = $existing.CanonicalHostedZoneId
        $script:LoadBalancerState = $existing.State.Code
        $script:LoadBalancerScheme = $existing.Scheme
        $script:LoadBalancerIpType = $existing.IpAddressType
        return
    }

    Write-D09Log "Creating ALB $($script:AlbName)"
    $created = Invoke-AwsJson -AwsArgs @(
        "elbv2", "create-load-balancer",
        "--region", $script:Region,
        "--name", $script:AlbName,
        "--type", "application",
        "--scheme", "internet-facing",
        "--ip-address-type", "ipv4",
        "--subnets", $script:PublicSubnetIds[0], $script:PublicSubnetIds[1],
        "--security-groups", $script:AlbSgId,
        "--tags",
        "Key=Project,Value=$($script:Project)",
        "Key=Environment,Value=$($script:Environment)",
        "Key=ManagedBy,Value=$($script:ManagedBy)",
        "Key=Name,Value=$($script:AlbName)"
    )
    $alb = $created.LoadBalancers[0]
    $script:LoadBalancerArn = $alb.LoadBalancerArn
    $script:LoadBalancerDns = $alb.DNSName
    $script:CanonicalHostedZoneId = $alb.CanonicalHostedZoneId
    $script:LoadBalancerState = $alb.State.Code
    $script:LoadBalancerScheme = $alb.Scheme
    $script:LoadBalancerIpType = $alb.IpAddressType
}

function Wait-LoadBalancerActive {
    Write-D09Log "Waiting for ALB to become active"
    Invoke-Aws -AwsArgs @(
        "elbv2", "wait", "load-balancer-available",
        "--region", $script:Region,
        "--load-balancer-arns", $script:LoadBalancerArn
    ) | Out-Null

    $alb = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-load-balancers", "--region", $script:Region,
        "--load-balancer-arns", $script:LoadBalancerArn
    )
    $script:LoadBalancerState = $alb.LoadBalancers[0].State.Code
    if ($script:LoadBalancerState -ne "active") {
        Stop-D09 "ALB state is $($script:LoadBalancerState) (expected active)"
    }
}

function Find-TargetGroupByName {
    $result = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-groups", "--region", $script:Region,
        "--names", $script:TargetGroupName
    ) -AllowFailure
    if ($result -and $result.TargetGroups -and $result.TargetGroups.Count -gt 0) {
        return $result.TargetGroups[0]
    }
    return $null
}

function Test-TargetGroupCompatible {
    param($TargetGroup)
    if ($TargetGroup.TargetType -ne "ip") { Stop-D09 "Existing target group target type incompatible: $($TargetGroup.TargetType)" }
    if ($TargetGroup.Protocol -ne "HTTP") { Stop-D09 "Existing target group protocol incompatible: $($TargetGroup.Protocol)" }
    if ([int]$TargetGroup.Port -ne $script:TargetPort) { Stop-D09 "Existing target group port incompatible: $($TargetGroup.Port)" }
    if ($TargetGroup.VpcId -ne $script:VpcId) { Stop-D09 "Existing target group VPC incompatible: $($TargetGroup.VpcId)" }
    if ($TargetGroup.ProtocolVersion -and $TargetGroup.ProtocolVersion -ne "HTTP1") {
        Stop-D09 "Existing target group protocol version incompatible: $($TargetGroup.ProtocolVersion)"
    }
}

function New-OrReuseTargetGroup {
    $existing = Find-TargetGroupByName
    if ($existing) {
        Test-TargetGroupCompatible -TargetGroup $existing
        Write-D09Log "Reusing target group $($script:TargetGroupName)"
        $script:TargetGroupArn = $existing.TargetGroupArn
        return
    }

    Write-D09Log "Creating target group $($script:TargetGroupName)"
    $created = Invoke-AwsJson -AwsArgs @(
        "elbv2", "create-target-group",
        "--region", $script:Region,
        "--name", $script:TargetGroupName,
        "--protocol", "HTTP",
        "--port", "$($script:TargetPort)",
        "--vpc-id", $script:VpcId,
        "--target-type", "ip",
        "--protocol-version", "HTTP1",
        "--health-check-protocol", "HTTP",
        "--health-check-path", $script:HealthCheckPath,
        "--health-check-port", "traffic-port",
        "--healthy-threshold-count", "2",
        "--unhealthy-threshold-count", "3",
        "--health-check-interval-seconds", "30",
        "--health-check-timeout-seconds", "5",
        "--matcher", "HttpCode=200",
        "--tags",
        "Key=Project,Value=$($script:Project)",
        "Key=Environment,Value=$($script:Environment)",
        "Key=ManagedBy,Value=$($script:ManagedBy)",
        "Key=Name,Value=$($script:TargetGroupName)"
    )
    $script:TargetGroupArn = $created.TargetGroups[0].TargetGroupArn
}

function Ensure-TargetGroupAttributes {
    Write-D09Log "Configuring target group attributes"
    Invoke-Aws -AwsArgs @(
        "elbv2", "modify-target-group-attributes",
        "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn,
        "--attributes",
        "Key=deregistration_delay.timeout_seconds,Value=$($script:DeregistrationDelaySeconds)",
        "Key=stickiness.enabled,Value=false"
    ) | Out-Null
}

function Ensure-LoadBalancerAttributes {
    Write-D09Log "Configuring ALB attributes"
    Invoke-Aws -AwsArgs @(
        "elbv2", "modify-load-balancer-attributes",
        "--region", $script:Region,
        "--load-balancer-arn", $script:LoadBalancerArn,
        "--attributes",
        "Key=idle_timeout.timeout_seconds,Value=$($script:IdleTimeoutSeconds)",
        "Key=deletion_protection.enabled,Value=false",
        "Key=access_logs.s3.enabled,Value=false"
    ) | Out-Null
}

function Find-HttpListener {
    $listeners = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-listeners", "--region", $script:Region,
        "--load-balancer-arn", $script:LoadBalancerArn
    )
    return ($listeners.Listeners | Where-Object { $_.Port -eq $script:ListenerPort -and $_.Protocol -eq "HTTP" } | Select-Object -First 1)
}

function Ensure-HttpListener {
    $existing = Find-HttpListener
    if ($existing) {
        $action = $existing.DefaultActions | Select-Object -First 1
        if ($action.Type -ne "forward") {
            Stop-D09 "Existing HTTP listener default action is not forward"
        }
        $tgArn = $action.TargetGroupArn
        if (-not $tgArn -and $action.ForwardConfig.TargetGroups.Count -gt 0) {
            $tgArn = $action.ForwardConfig.TargetGroups[0].TargetGroupArn
        }
        if ($tgArn -ne $script:TargetGroupArn) {
            Stop-D09 "Existing HTTP listener forwards to incompatible target group"
        }
        Write-D09Log "Reusing HTTP listener on port $($script:ListenerPort)"
        $script:ListenerArn = $existing.ListenerArn
        return
    }

    Write-D09Log "Creating HTTP listener on port $($script:ListenerPort)"
    $created = Invoke-AwsJson -AwsArgs @(
        "elbv2", "create-listener",
        "--region", $script:Region,
        "--load-balancer-arn", $script:LoadBalancerArn,
        "--protocol", "HTTP",
        "--port", "$($script:ListenerPort)",
        "--default-actions", "Type=forward,TargetGroupArn=$($script:TargetGroupArn)"
    )
    $script:ListenerArn = $created.Listeners[0].ListenerArn
}

function Test-NoEcsServiceOrTasks {
    $services = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-services", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($services.serviceArns -and $services.serviceArns.Count -gt 0) {
        Stop-D09 "ECS services exist; D09 must not create services but found existing ones"
    }

    $tasks = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-tasks", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($tasks.taskArns -and $tasks.taskArns.Count -gt 0) {
        Stop-D09 "ECS tasks running; D09 must not run tasks"
    }
}

function Test-ZeroRegisteredTargets {
    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health", "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $count = 0
    if ($health.TargetHealthDescriptions) {
        $count = $health.TargetHealthDescriptions.Count
    }
    $script:RegisteredTargetCount = $count
    if ($count -ne 0) {
        Stop-D09 "Target group has $count registered targets; D09 expects zero until ECS service activation"
    }
    Write-D09Log "Registered targets: 0 (expected)"
}

function Get-LoadBalancerAttributeValue {
    param([array]$Attributes, [string]$Key)
    $attr = $Attributes | Where-Object { $_.Key -eq $Key } | Select-Object -First 1
    if ($attr) { return $attr.Value }
    return ""
}

function Test-PostCreateVerification {
    $tg = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-groups", "--region", $script:Region,
        "--target-group-arns", $script:TargetGroupArn
    )
    $tgDetail = $tg.TargetGroups[0]
    if ($tgDetail.TargetType -ne "ip") { Stop-D09 "Target type verification failed" }
    if ($tgDetail.HealthCheckPath -ne $script:HealthCheckPath) { Stop-D09 "Health check path verification failed" }
    if ($tgDetail.Matcher.HttpCode -ne "200") { Stop-D09 "Health check matcher verification failed" }

    $tgAttrs = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-group-attributes", "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $deregDelay = Get-LoadBalancerAttributeValue -Attributes $tgAttrs.Attributes -Key "deregistration_delay.timeout_seconds"
    if ($deregDelay -ne "$($script:DeregistrationDelaySeconds)") {
        Stop-D09 "Deregistration delay is $deregDelay (expected $($script:DeregistrationDelaySeconds))"
    }
    $stickiness = Get-LoadBalancerAttributeValue -Attributes $tgAttrs.Attributes -Key "stickiness.enabled"
    if ($stickiness -ne "false") {
        Stop-D09 "Stickiness is $stickiness (expected false)"
    }

    $albAttrs = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-load-balancer-attributes", "--region", $script:Region,
        "--load-balancer-arn", $script:LoadBalancerArn
    )
    $script:IdleTimeoutConfigured = Get-LoadBalancerAttributeValue -Attributes $albAttrs.Attributes -Key "idle_timeout.timeout_seconds"
    $script:DeletionProtection = Get-LoadBalancerAttributeValue -Attributes $albAttrs.Attributes -Key "deletion_protection.enabled"
    $script:AccessLogsEnabled = Get-LoadBalancerAttributeValue -Attributes $albAttrs.Attributes -Key "access_logs.s3.enabled"

    if ($script:IdleTimeoutConfigured -ne "$($script:IdleTimeoutSeconds)") {
        Stop-D09 "Idle timeout is $($script:IdleTimeoutConfigured) (expected $($script:IdleTimeoutSeconds))"
    }

    $script:TargetGroupHealthPath = $tgDetail.HealthCheckPath
    $script:TargetGroupProtocol = $tgDetail.Protocol
    $script:TargetGroupPort = [int]$tgDetail.Port
    $script:TargetGroupType = $tgDetail.TargetType
    $script:HealthyThreshold = [int]$tgDetail.HealthyThresholdCount
    $script:UnhealthyThreshold = [int]$tgDetail.UnhealthyThresholdCount
    $script:HealthCheckInterval = [int]$tgDetail.HealthCheckIntervalSeconds
    $script:HealthCheckTimeout = [int]$tgDetail.HealthCheckTimeoutSeconds
    $script:HealthCheckMatcher = $tgDetail.Matcher.HttpCode
}

function Write-Inventory {
    param($ExistingInventory)

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }

    $inventory["loadBalancer"] = [ordered]@{
        name                   = $script:AlbName
        arn                    = $script:LoadBalancerArn
        dnsName                = $script:LoadBalancerDns
        canonicalHostedZoneId  = $script:CanonicalHostedZoneId
        scheme                 = $script:LoadBalancerScheme
        state                  = $script:LoadBalancerState
        ipAddressType          = $script:LoadBalancerIpType
        securityGroupId        = $script:AlbSgId
        publicSubnetIds        = @($script:PublicSubnetIds)
        idleTimeoutSeconds     = [int]$script:IdleTimeoutSeconds
        cloudFrontPrefixListId = $script:CloudFrontPrefixListId
    }

    $inventory["targetGroup"] = [ordered]@{
        name              = $script:TargetGroupName
        arn               = $script:TargetGroupArn
        protocol          = $script:TargetGroupProtocol
        port              = $script:TargetGroupPort
        targetType        = $script:TargetGroupType
        healthCheckPath   = $script:TargetGroupHealthPath
        registeredTargets = $script:RegisteredTargetCount
    }

    $inventory["albListener"] = [ordered]@{
        arn      = $script:ListenerArn
        protocol = "HTTP"
        port     = $script:ListenerPort
    }

    $json = ($inventory | ConvertTo-Json -Depth 12)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($script:InventoryFile, $json, $utf8NoBom)
    Write-D09Log "Wrote inventory: $($script:InventoryFile)"
}

function Main {
    Test-CommandExists -Name "aws"
    Test-PreflightIdentity

    $inventory = Read-Inventory
    Test-InventoryPrerequisites -Inventory $inventory
    Test-LiveNetworkResources
    Test-LiveEcsPrerequisites
    Resolve-CloudFrontPrefixList
    Test-SecurityGroupRules
    Ensure-AlbSgEgressLeastPrivilege
    Test-NoEcsServiceOrTasks

    New-OrReuseLoadBalancer
    Wait-LoadBalancerActive
    New-OrReuseTargetGroup
    Ensure-TargetGroupAttributes
    Ensure-LoadBalancerAttributes
    Ensure-HttpListener
    Test-ZeroRegisteredTargets
    Test-PostCreateVerification
    Write-Inventory -ExistingInventory $inventory

    Write-D09Log "AWS-D09 ALB + target group foundation complete (no ECS service, no targets registered)."
}

Main
