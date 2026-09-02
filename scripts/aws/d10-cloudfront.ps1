# EaziAICall AWS-D10 - CloudFront Temporary HTTPS (idempotent, AWS CLI only, NO ECS service/task)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:DistributionComment = "EaziAICall Production Backend API"
$script:OriginId = "eaziacall-prod-alb-origin"
$script:CachePolicyName = "Managed-CachingDisabled"
$script:OriginRequestPolicyName = "Managed-AllViewerExceptHostHeader"
$script:CloudFrontPrefixListName = "com.amazonaws.global.cloudfront.origin-facing"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D10Log {
    param([string]$Message)
    Write-Host "[d10-cloudfront] $Message"
}

function Stop-D10 {
    param([string]$Message)
    Write-Error "[d10-cloudfront] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D10 "Required command not found: $Name"
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
        Stop-D10 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D10 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D10 "AWS CLI returned empty JSON: aws $($AwsArgs -join ' ')"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d10-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D10 "AWS region is not configured."
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D10 "Resource inventory not found: $($script:InventoryFile)"
    }
    try {
        return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        Stop-D10 "Failed to parse resource inventory."
    }
}

function Test-PreflightIdentity {
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ($identity.Account -ne $script:ExpectedAccountId) {
        Stop-D10 "Unexpected AWS account: $($identity.Account)"
    }
    $script:Region = Get-ResolvedRegion
    if ($script:Region -ne "us-east-1") {
        Stop-D10 "Unexpected region: $($script:Region) (expected us-east-1)"
    }
    $script:CallerArn = $identity.Arn
    Write-D10Log "Using region: $($script:Region)"
    Write-D10Log "AWS account: $($identity.Account)"
    Write-D10Log "Caller: $($identity.Arn)"
}

function Test-InventoryPrerequisites {
    param($Inventory)
    if (-not $Inventory.loadBalancer.arn) { Stop-D10 "Inventory missing loadBalancer.arn" }
    if (-not $Inventory.loadBalancer.dnsName) { Stop-D10 "Inventory missing loadBalancer.dnsName" }
    if (-not $Inventory.targetGroup.arn) { Stop-D10 "Inventory missing targetGroup.arn" }
    if (-not $Inventory.ecs.clusterName) { Stop-D10 "Inventory missing ecs.clusterName" }
    if (-not $Inventory.backendImage.digest) { Stop-D10 "Inventory missing backendImage.digest" }

    $script:AlbArn = $Inventory.loadBalancer.arn
    $script:AlbDns = $Inventory.loadBalancer.dnsName
    $script:AlbSgId = $Inventory.loadBalancer.securityGroupId
    $script:TargetGroupArn = $Inventory.targetGroup.arn
    $script:ClusterName = $Inventory.ecs.clusterName
    $script:CanonicalImageDigest = $Inventory.backendImage.digest
    $script:CanonicalImageTag = $Inventory.backendImage.tag
    $script:ExecutionRoleArn = $Inventory.ecs.executionRoleArn
    $script:TaskRoleArn = $Inventory.ecs.applicationTaskRoleArn
}

function Test-LiveD09Resources {
    $alb = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-load-balancers", "--region", $script:Region,
        "--load-balancer-arns", $script:AlbArn
    )
    if (-not $alb.LoadBalancers -or $alb.LoadBalancers[0].State.Code -ne "active") {
        Stop-D10 "ALB is not active"
    }

    $listeners = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-listeners", "--region", $script:Region,
        "--load-balancer-arn", $script:AlbArn
    )
    $httpListener = $listeners.Listeners | Where-Object { $_.Port -eq 80 -and $_.Protocol -eq "HTTP" } | Select-Object -First 1
    if (-not $httpListener) {
        Stop-D10 "ALB HTTP :80 listener not found"
    }

    $tg = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-groups", "--region", $script:Region,
        "--target-group-arns", $script:TargetGroupArn
    )
    if (-not $tg.TargetGroups) { Stop-D10 "Target group not found" }
    if ($tg.TargetGroups[0].TargetType -ne "ip") { Stop-D10 "Target group must be target-type ip" }

    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health", "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $targetCount = 0
    if ($health.TargetHealthDescriptions) { $targetCount = $health.TargetHealthDescriptions.Count }
    if ($targetCount -ne 0) {
        Stop-D10 "Target group must have 0 registered targets at D10 (found $targetCount)"
    }

    $cluster = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-clusters", "--region", $script:Region,
        "--clusters", $script:ClusterName
    )
    if ($cluster.clusters[0].status -ne "ACTIVE") {
        Stop-D10 "ECS cluster not ACTIVE"
    }

    $scan = Invoke-AwsJson -AwsArgs @(
        "ecr", "describe-image-scan-findings", "--region", $script:Region,
        "--repository-name", "eaziacall-prod-backend",
        "--image-id", "imageTag=$($script:CanonicalImageTag)"
    )
    if ($scan.imageScanStatus.status -ne "COMPLETE") {
        Stop-D10 "ECR scan not complete for canonical image"
    }
    $counts = $scan.imageScanFindings.findingSeverityCounts
    if ($counts.CRITICAL -and [int]$counts.CRITICAL -gt 0) { Stop-D10 "ECR CRITICAL > 0" }
    if ($counts.HIGH -and [int]$counts.HIGH -gt 0) { Stop-D10 "ECR HIGH > 0" }

    Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", "eaziacall-prod-ecs-task-role") | Out-Null
    Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", "eaziacall-prod-ecs-execution-role") | Out-Null

    $rds = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-instances", "--region", $script:Region,
        "--db-instance-identifier", "eaziacall-prod-postgres"
    )
    if ($rds.DBInstances[0].DBInstanceStatus -ne "available") {
        Stop-D10 "RDS instance not available"
    }
    if ($rds.DBInstances[0].PubliclyAccessible -eq $true) {
        Stop-D10 "RDS must not be publicly accessible"
    }

    Invoke-AwsJson -AwsArgs @(
        "s3api", "head-bucket", "--bucket", "eaziacall-prod-812047028300-us-east-1"
    ) | Out-Null

    Write-D10Log "D09/D08 prerequisites verified (ALB active, 0 targets, ECS cluster active, ECR scan clean)"
}

function Resolve-CloudFrontPrefixList {
    $lists = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-managed-prefix-lists",
        "--region", $script:Region,
        "--filters", "Name=prefix-list-name,Values=$($script:CloudFrontPrefixListName)"
    )
    $pl = $lists.PrefixLists[0]
    if (-not $pl -or $pl.OwnerId -ne "AWS") {
        Stop-D10 "CloudFront origin-facing managed prefix list not found"
    }
    $script:CloudFrontPrefixListId = $pl.PrefixListId
    $script:CloudFrontPrefixListNameResolved = $pl.PrefixListName
}

function Test-AlbSecurityGroup {
    Resolve-CloudFrontPrefixList
    $sg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups", "--region", $script:Region,
        "--group-ids", $script:AlbSgId
    )
    $albSg = $sg.SecurityGroups[0]
    $cfIngress = $albSg.IpPermissions |
        Where-Object { $_.FromPort -eq 80 -and $_.ToPort -eq 80 } |
        ForEach-Object { $_.PrefixListIds } |
        Where-Object { $_.PrefixListId -eq $script:CloudFrontPrefixListId }
    if (-not $cfIngress) {
        Stop-D10 "ALB SG must allow TCP 80 from CloudFront origin-facing prefix list only"
    }
    $public80 = $albSg.IpPermissions |
        Where-Object { $_.FromPort -eq 80 -and $_.ToPort -eq 80 -and $_.IpRanges.Count -gt 0 }
    if ($public80) {
        Stop-D10 "ALB SG must not allow public 0.0.0.0/0 on port 80"
    }
}

function Resolve-ManagedPolicyId {
    param(
        [string]$PolicyType,
        [string]$PolicyName
    )
    if ($PolicyType -eq "cache") {
        $items = Invoke-AwsJson -AwsArgs @("cloudfront", "list-cache-policies", "--type", "managed")
        foreach ($item in $items.CachePolicyList.Items) {
            if ($item.CachePolicy.CachePolicyConfig.Name -eq $PolicyName) {
                return $item.CachePolicy.Id
            }
        }
    }
    else {
        $items = Invoke-AwsJson -AwsArgs @("cloudfront", "list-origin-request-policies", "--type", "managed")
        foreach ($item in $items.OriginRequestPolicyList.Items) {
            if ($item.OriginRequestPolicy.OriginRequestPolicyConfig.Name -eq $PolicyName) {
                return $item.OriginRequestPolicy.Id
            }
        }
    }
    Stop-D10 "Managed policy not found: $PolicyName"
}

function Find-DistributionByOrigin {
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws cloudfront list-distributions --output json 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    if ($exitCode -ne 0) {
        Stop-D10 "Failed to list CloudFront distributions"
    }
    if ([string]::IsNullOrWhiteSpace([string]$output)) {
        return $null
    }
    $list = ($output | ConvertFrom-Json)
    if (-not $list.DistributionList -or -not $list.DistributionList.Items) {
        return $null
    }
    foreach ($summary in $list.DistributionList.Items) {
        $detail = Invoke-AwsJson -AwsArgs @(
            "cloudfront", "get-distribution", "--id", $summary.Id
        )
        $origin = $detail.Distribution.DistributionConfig.Origins.Items |
            Where-Object { $_.DomainName -eq $script:AlbDns } |
            Select-Object -First 1
        if ($origin) {
            return $detail
        }
    }
    return $null
}

function Get-DesiredDistributionConfig {
    param([string]$CallerReference)
    return [ordered]@{
        CallerReference = $CallerReference
        Comment         = $script:DistributionComment
        Enabled         = $true
        PriceClass      = "PriceClass_200"
        HttpVersion     = "http2and3"
        IsIPV6Enabled   = $true
        Origins         = [ordered]@{
            Quantity = 1
            Items    = @(
                [ordered]@{
                    Id                 = $script:OriginId
                    DomainName         = $script:AlbDns
                    CustomOriginConfig = [ordered]@{
                        HTTPPort             = 80
                        HTTPSPort            = 443
                        OriginProtocolPolicy = "http-only"
                        OriginSslProtocols   = [ordered]@{
                            Quantity = 1
                            Items    = @("TLSv1.2")
                        }
                        OriginReadTimeout      = 60
                        OriginKeepaliveTimeout = 5
                    }
                }
            )
        }
        DefaultCacheBehavior = [ordered]@{
            TargetOriginId       = $script:OriginId
            ViewerProtocolPolicy = "redirect-to-https"
            AllowedMethods       = [ordered]@{
                Quantity     = 7
                Items        = @("GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE")
                CachedMethods = [ordered]@{
                    Quantity = 2
                    Items    = @("GET", "HEAD")
                }
            }
            Compress               = $true
            CachePolicyId          = $script:CachePolicyId
            OriginRequestPolicyId  = $script:OriginRequestPolicyId
        }
        DefaultRootObject = ""
    }
}

function Test-DistributionCompatible {
    param($Config)
    if ($Config.Comment -ne $script:DistributionComment) { return $false }
    if ($Config.Enabled -ne $true) { return $false }
    $origin = $Config.Origins.Items | Select-Object -First 1
    if ($origin.DomainName -ne $script:AlbDns) { return $false }
    if ($origin.CustomOriginConfig.OriginProtocolPolicy -ne "http-only") { return $false }
    $behavior = $Config.DefaultCacheBehavior
    if ($behavior.ViewerProtocolPolicy -ne "redirect-to-https") { return $false }
    if ($behavior.CachePolicyId -ne $script:CachePolicyId) { return $false }
    if ($behavior.OriginRequestPolicyId -ne $script:OriginRequestPolicyId) { return $false }
    $methods = @($behavior.AllowedMethods.Items | Sort-Object)
    $expected = @("DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT")
    if (($methods -join ",") -ne ($expected -join ",")) { return $false }
    return $true
}

function New-OrUpdateDistribution {
    $existing = Find-DistributionByOrigin
    $callerRef = "eaziacall-prod-backend-$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
    $desired = Get-DesiredDistributionConfig -CallerReference $callerRef

    if ($existing) {
        $config = $existing.Distribution.DistributionConfig
        if (-not (Test-DistributionCompatible -Config $config)) {
            Stop-D10 "Existing CloudFront distribution for ALB origin is incompatible; manual review required"
        }
        Write-D10Log "Reusing CloudFront distribution $($existing.Distribution.Id)"
        $script:DistributionId = $existing.Distribution.Id
        $script:DistributionArn = $existing.Distribution.ARN
        $script:DistributionDomain = $existing.Distribution.DomainName
        $script:DistributionStatus = $existing.Distribution.Status
        $script:DistributionEnabled = [bool]$config.Enabled
        return
    }

    Write-D10Log "Creating CloudFront distribution"
    $desiredJson = ($desired | ConvertTo-Json -Depth 12 -Compress)
    $file = New-AwsCliJsonFile -JsonContent $desiredJson
    $created = Invoke-AwsJson -AwsArgs @(
        "cloudfront", "create-distribution",
        "--distribution-config", $file
    )
    $script:DistributionId = $created.Distribution.Id
    $script:DistributionArn = $created.Distribution.ARN
    $script:DistributionDomain = $created.Distribution.DomainName
    $script:DistributionStatus = $created.Distribution.Status
    $script:DistributionEnabled = [bool]$created.Distribution.DistributionConfig.Enabled
}

function Wait-DistributionDeployed {
    Write-D10Log "Waiting for CloudFront distribution to deploy"
    Invoke-Aws -AwsArgs @(
        "cloudfront", "wait", "distribution-deployed",
        "--id", $script:DistributionId
    ) | Out-Null

    $detail = Invoke-AwsJson -AwsArgs @(
        "cloudfront", "get-distribution", "--id", $script:DistributionId
    )
    $script:DistributionStatus = $detail.Distribution.Status
    $script:DistributionEnabled = [bool]$detail.Distribution.DistributionConfig.Enabled
    if ($script:DistributionStatus -ne "Deployed") {
        Stop-D10 "CloudFront status is $($script:DistributionStatus) (expected Deployed)"
    }
}

function Test-NoEcsServiceOrTasks {
    $services = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-services", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($services.serviceArns -and $services.serviceArns.Count -gt 0) {
        Stop-D10 "ECS services must not exist during D10"
    }
    $tasks = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-tasks", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($tasks.taskArns -and $tasks.taskArns.Count -gt 0) {
        Stop-D10 "ECS tasks must not run during D10"
    }
}

function Write-Inventory {
    param($ExistingInventory)

    $publicBaseUrl = "https://$($script:DistributionDomain)"
    $apiBaseUrl = "$publicBaseUrl/api/v1"

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }

    $inventory["cloudFront"] = [ordered]@{
        distributionId   = $script:DistributionId
        distributionArn  = $script:DistributionArn
        domainName       = $script:DistributionDomain
        status           = $script:DistributionStatus
        enabled          = [bool]$script:DistributionEnabled
        publicBaseUrl    = $publicBaseUrl
        apiBaseUrl       = $apiBaseUrl
        originAlbDns     = $script:AlbDns
        cachePolicy      = $script:CachePolicyName
        originRequestPolicy = $script:OriginRequestPolicyName
        viewerProtocol   = "redirect-to-https"
        originProtocol   = "http-only"
        webhookUrls      = [ordered]@{
            twilioIncoming   = "$apiBaseUrl/webhooks/twilio/incoming-call"
            twilioStatus     = "$apiBaseUrl/webhooks/twilio/status-callback"
            twilioCallEnded  = "$apiBaseUrl/webhooks/twilio/call-ended"
            elevenLabsEvents = "$apiBaseUrl/webhooks/elevenlabs/conversation-events"
        }
    }

    $json = ($inventory | ConvertTo-Json -Depth 12)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($script:InventoryFile, $json, $utf8NoBom)
    Write-D10Log "Wrote inventory: $($script:InventoryFile)"
    Write-D10Log "PUBLIC_BASE_URL=$publicBaseUrl"
}

function Main {
    Test-CommandExists -Name "aws"
    Test-PreflightIdentity

    $inventory = Read-Inventory
    Test-InventoryPrerequisites -Inventory $inventory
    Test-LiveD09Resources
    Test-AlbSecurityGroup
    Test-NoEcsServiceOrTasks

    $script:CachePolicyId = Resolve-ManagedPolicyId -PolicyType "cache" -PolicyName $script:CachePolicyName
    $script:OriginRequestPolicyId = Resolve-ManagedPolicyId -PolicyType "origin-request" -PolicyName $script:OriginRequestPolicyName
    Write-D10Log "Cache policy: $($script:CachePolicyName) ($($script:CachePolicyId))"
    Write-D10Log "Origin request policy: $($script:OriginRequestPolicyName) ($($script:OriginRequestPolicyId))"

    New-OrUpdateDistribution
    Wait-DistributionDeployed
    Write-Inventory -ExistingInventory $inventory

    Write-D10Log "AWS-D10 CloudFront foundation complete (5xx from /health/live is expected until ECS service exists)."
}

Main
