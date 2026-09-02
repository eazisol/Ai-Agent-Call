# EaziAICall emergency CloudFront restore (production outage recovery)
# Bypasses D10 preflight that requires zero ECS targets / no running service.
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:ExpectedAccountId = "812047028300"
$script:Region = "us-east-1"
$script:AlbDns = "eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com"
$script:OriginId = "eaziacall-prod-alb-origin"
$script:DistributionComment = "EaziAICall Production Backend API (TEMPORARY RESTORE)"
$script:CachePolicyId = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
$script:OriginRequestPolicyId = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-Log { param([string]$Message) Write-Host "[emergency-cf-restore] $Message" }
function Stop-Restore { param([string]$Message) Write-Error "[emergency-cf-restore] ERROR: $Message"; exit 1 }

function Invoke-AwsJson {
    param([string[]]$AwsArgs, [switch]$AllowFailure)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @($AwsArgs + @("--output", "json")) 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previous
    if ($exitCode -ne 0) {
        if ($AllowFailure) { return $null }
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-Restore "AWS failed: aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) { $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n" }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("emergency-cf-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Find-ExistingDistribution {
    $list = Invoke-AwsJson -AwsArgs @("cloudfront", "list-distributions") -AllowFailure
    if (-not $list -or -not $list.DistributionList -or -not $list.DistributionList.Items) { return $null }
    foreach ($summary in $list.DistributionList.Items) {
        $detail = Invoke-AwsJson -AwsArgs @("cloudfront", "get-distribution", "--id", $summary.Id)
        $origin = $detail.Distribution.DistributionConfig.Origins.Items |
            Where-Object { $_.DomainName -eq $script:AlbDns } |
            Select-Object -First 1
        if ($origin) { return $detail }
    }
    return $null
}

function New-DistributionConfig {
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
                Quantity      = 7
                Items         = @("GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE")
                CachedMethods = [ordered]@{
                    Quantity = 2
                    Items    = @("GET", "HEAD")
                }
            }
            Compress              = $true
            CachePolicyId         = $script:CachePolicyId
            OriginRequestPolicyId = $script:OriginRequestPolicyId
        }
        DefaultRootObject = ""
    }
}

function Update-InventoryCloudFront {
    param(
        [string]$DistributionId,
        [string]$DistributionArn,
        [string]$Domain,
        [string]$Status,
        [bool]$Enabled
    )
    if (-not (Test-Path $script:InventoryFile)) { Stop-Restore "Inventory not found" }
    $inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $publicBaseUrl = "https://$Domain"
    $apiBaseUrl = "$publicBaseUrl/api/v1"

    $cloudFront = [ordered]@{
        distributionId        = $DistributionId
        distributionArn       = $DistributionArn
        domainName            = $Domain
        status                = $Status
        enabled               = $Enabled
        temporaryRestore      = $true
        migrationTarget       = "https://api.eaziacall.com"
        publicBaseUrl         = $publicBaseUrl
        apiBaseUrl            = $apiBaseUrl
        originAlbDns          = $script:AlbDns
        cachePolicy           = "Managed-CachingDisabled"
        originRequestPolicy   = "Managed-AllViewerExceptHostHeader"
        viewerProtocol        = "redirect-to-https"
        originProtocol        = "http-only"
        webhookUrls           = [ordered]@{
            twilioIncoming   = "$apiBaseUrl/webhooks/twilio/incoming-call"
            twilioStatus     = "$apiBaseUrl/webhooks/twilio/status-callback"
            twilioCallEnded  = "$apiBaseUrl/webhooks/twilio/call-ended"
            elevenLabsEvents = "$apiBaseUrl/webhooks/elevenlabs/conversation-events"
        }
    }

    $inventory | Add-Member -NotePropertyName "cloudFront" -NotePropertyValue ([pscustomobject]$cloudFront) -Force
    $json = ($inventory | ConvertTo-Json -Depth 12)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($script:InventoryFile, $json, $utf8NoBom)
    Write-Log "Updated inventory with CloudFront domain=$Domain id=$DistributionId"
    Write-Log "PUBLIC_BASE_URL=$publicBaseUrl"
}

# Preflight
$identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
if ($identity.Account -ne $script:ExpectedAccountId) {
    Stop-Restore "Unexpected account $($identity.Account)"
}
Write-Log "Account $($identity.Account) region $($script:Region)"

$alb = Invoke-AwsJson -AwsArgs @("elbv2", "describe-load-balancers", "--region", $script:Region, "--names", "eaziacall-prod-alb")
if ($alb.LoadBalancers[0].State.Code -ne "active") { Stop-Restore "ALB not active" }

$tgArn = [string](& aws elbv2 describe-target-groups --region $script:Region --names eaziacall-prod-backend-tg --query "TargetGroups[0].TargetGroupArn" --output text)
$health = Invoke-AwsJson -AwsArgs @("elbv2", "describe-target-health", "--region", $script:Region, "--target-group-arn", $tgArn)
$healthy = @($health.TargetHealthDescriptions | Where-Object { $_.TargetHealth.State -eq "healthy" })
if ($healthy.Count -lt 1) { Stop-Restore "No healthy ALB targets" }
Write-Log "ALB active, $($healthy.Count) healthy target(s)"

$sg = Invoke-AwsJson -AwsArgs @("ec2", "describe-security-groups", "--region", $script:Region, "--group-ids", "sg-098248934945d61d3")
$cfRule = $sg.SecurityGroups[0].IpPermissions | Where-Object { $_.PrefixListIds.Count -gt 0 }
if (-not $cfRule) { Stop-Restore "ALB SG missing CloudFront prefix list rule" }
Write-Log "ALB SG still allows CloudFront prefix list ingress"

$rds = Invoke-AwsJson -AwsArgs @("rds", "describe-db-instances", "--region", $script:Region, "--db-instance-identifier", "eaziacall-prod-postgres")
if ($rds.DBInstances[0].PubliclyAccessible -eq $true) { Stop-Restore "RDS must remain private" }
Write-Log "RDS private confirmed"

$existing = Find-ExistingDistribution
if ($existing) {
    $DistributionId = $existing.Distribution.Id
    $DistributionArn = $existing.Distribution.ARN
    $DistributionDomain = $existing.Distribution.DomainName
    Write-Log "Reusing existing distribution $DistributionId ($DistributionDomain)"
} else {
    Write-Log "Creating new CloudFront distribution"
    $callerRef = "eaziacall-emergency-restore-$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
    $config = New-DistributionConfig -CallerReference $callerRef
    $file = New-AwsCliJsonFile -JsonContent (($config | ConvertTo-Json -Depth 12 -Compress))
    $created = Invoke-AwsJson -AwsArgs @("cloudfront", "create-distribution", "--distribution-config", $file)
    $DistributionId = $created.Distribution.Id
    $DistributionArn = $created.Distribution.ARN
    $DistributionDomain = $created.Distribution.DomainName
    Write-Log "Created distribution $DistributionId domain $DistributionDomain"
}

Write-Log "Waiting for CloudFront deployment (this may take several minutes)"
& aws cloudfront wait distribution-deployed --id $DistributionId
if ($LASTEXITCODE -ne 0) { Stop-Restore "CloudFront wait failed" }

$detail = Invoke-AwsJson -AwsArgs @("cloudfront", "get-distribution", "--id", $DistributionId)
$status = $detail.Distribution.Status
$enabled = [bool]$detail.Distribution.DistributionConfig.Enabled
if ($status -ne "Deployed") { Stop-Restore "Status is $status (expected Deployed)" }

Update-InventoryCloudFront -DistributionId $DistributionId -DistributionArn $DistributionArn -Domain $DistributionDomain -Status $status -Enabled $enabled

Write-Log "RESTORE_DOMAIN=$DistributionDomain"
Write-Log "RESTORE_DISTRIBUTION_ID=$DistributionId"
Write-Log "RESTORE_STATUS=$status"
