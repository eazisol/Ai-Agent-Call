# EaziAICall AWS-D13 PART A - Controlled ECS Service Activation (idempotent)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:ExpectedRegion = "us-east-1"
$script:ClusterName = "eaziacall-prod-cluster"
$script:ServiceName = "eaziacall-prod-backend-service"
$script:TaskDefinitionFamily = "eaziacall-prod-backend"
$script:ExpectedTaskRevision = 3
$script:ContainerName = "backend"
$script:ContainerPort = 3000
$script:CanonicalDigest = "sha256:65f161a879e82a022ad953fb6334fe0ade8fc0fd93bd7f86a3816c151bac889b"
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:HealthCheckGracePeriodSeconds = 60
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D13Log {
    param([string]$Message)
    Write-Host "[d13-ecs-service] $Message"
}

function Stop-D13 {
    param([string]$Message)
    Write-Error "[d13-ecs-service] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D13 "Required command not found: $Name"
    }
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
        Stop-D13 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    return $output
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
        Stop-D13 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D13 "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d13-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Test-SecretExposureInText {
    param([string]$Text, [string]$Context)
    $patterns = @(
        'AKIA[0-9A-Z]{16}',
        'DATABASE_PASSWORD\s*=\s*\S+',
        'AUTH_JWT_ACCESS_SECRET\s*=\s*\S+',
        'VERCEL_TOKEN\s*=\s*\S+'
    )
    foreach ($pattern in $patterns) {
        if ($Text -match $pattern) {
            Stop-D13 ('SECRET EXPOSURE DETECTED - ROTATION REQUIRED (' + $Context + ')')
        }
    }
}

function Import-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D13 "Inventory file not found"
    }
    $script:Inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Test-Preflight {
    Test-CommandExists "aws"
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ($identity.Account -ne $script:ExpectedAccountId) {
        Stop-D13 "AWS account mismatch"
    }
    $region = [string](Invoke-Aws @("configure", "get", "region"))
    if ($region -ne $script:ExpectedRegion) {
        Stop-D13 "AWS region mismatch"
    }
    $script:Region = $region

    Import-Inventory
    if (-not $script:Inventory.databaseMigration -or $script:Inventory.databaseMigration.status -ne "PASS") {
        Stop-D13 "D12 migration status must be PASS"
    }
    if ([int]$script:Inventory.databaseMigration.pendingMigrationCount -ne 0) {
        Stop-D13 "Pending migrations must be 0 before D13"
    }
    if ($script:Inventory.backendImage.digest -ne $script:CanonicalDigest) {
        Stop-D13 "Canonical image digest mismatch"
    }
    if (-not $script:Inventory.ecs.secretsConfigured) {
        Stop-D13 "D11 secrets not configured"
    }

    $script:PrivateSubnetIds = @($script:Inventory.network.privateSubnetIds)
    $script:EcsSecurityGroupId = $script:Inventory.network.ecsSecurityGroupId
    $script:TargetGroupArn = $script:Inventory.targetGroup.arn
    $script:CloudFrontUrl = $script:Inventory.cloudFront.publicBaseUrl.TrimEnd("/")

    $cluster = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-clusters", "--region", $script:Region,
        "--clusters", $script:ClusterName, "--include", "STATISTICS"
    )
    if ($cluster.clusters[0].status -ne "ACTIVE") {
        Stop-D13 "ECS cluster not ACTIVE"
    }

    $taskDef = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-task-definition", "--region", $script:Region,
        "--task-definition", "$($script:TaskDefinitionFamily):$($script:ExpectedTaskRevision)",
        "--query", "taskDefinition"
    )
    if ($taskDef.status -ne "ACTIVE") {
        Stop-D13 "Task definition revision $($script:ExpectedTaskRevision) not ACTIVE"
    }
    $container = $taskDef.containerDefinitions | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    if ($container.image -notmatch [regex]::Escape($script:CanonicalDigest)) {
        Stop-D13 "Task definition image digest mismatch"
    }

    $alb = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-load-balancers", "--region", $script:Region,
        "--load-balancer-arns", $script:Inventory.loadBalancer.arn
    )
    if ($alb.LoadBalancers[0].State.Code -ne "active") {
        Stop-D13 "ALB not active"
    }

    $tg = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-groups", "--region", $script:Region,
        "--target-group-arns", $script:TargetGroupArn
    )
    if ($tg.TargetGroups[0].TargetType -ne "ip") {
        Stop-D13 "Target group target type must be ip"
    }
    if ($tg.TargetGroups[0].HealthCheckPath -ne "/health/live") {
        Stop-D13 "Target group health path must be /health/live"
    }

    $rds = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-instances", "--region", $script:Region,
        "--db-instance-identifier", $script:Inventory.database.identifier
    )
    if ($rds.DBInstances[0].PubliclyAccessible) {
        Stop-D13 "RDS must be private"
    }

    $cf = Invoke-AwsJson -AwsArgs @(
        "cloudfront", "get-distribution", "--region", $script:Region,
        "--id", $script:Inventory.cloudFront.distributionId
    )
    if ($cf.Distribution.Status -ne "Deployed") {
        Stop-D13 "CloudFront distribution not Deployed"
    }

    Write-D13Log "Preflight OK"
}

function Get-ExistingService {
    $result = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-services", "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--services", $script:ServiceName
    )
    if ($result.services.Count -eq 0 -or $result.services[0].status -eq "INACTIVE") {
        return $null
    }
    return $result.services[0]
}

function New-BackendService {
    $networkJson = (@{
            awsvpcConfiguration = @{
                subnets        = @($script:PrivateSubnetIds[0], $script:PrivateSubnetIds[1])
                securityGroups = @($script:EcsSecurityGroupId)
                assignPublicIp = "DISABLED"
            }
        } | ConvertTo-Json -Compress -Depth 5)
    $networkFile = New-AwsCliJsonFile -JsonContent $networkJson

    $deploymentJson = (@{
            deploymentCircuitBreaker = @{
                enable   = $true
                rollback = $true
            }
            maximumPercent       = 200
            minimumHealthyPercent = 100
        } | ConvertTo-Json -Compress -Depth 5)
    $deploymentFile = New-AwsCliJsonFile -JsonContent $deploymentJson

    Write-D13Log "Creating ECS service $($script:ServiceName)"
    $created = Invoke-AwsJson -AwsArgs @(
        "ecs", "create-service",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--service-name", $script:ServiceName,
        "--task-definition", "$($script:TaskDefinitionFamily):$($script:ExpectedTaskRevision)",
        "--desired-count", "1",
        "--launch-type", "FARGATE",
        "--platform-version", "LATEST",
        "--network-configuration", $networkFile,
        "--load-balancers", "targetGroupArn=$($script:TargetGroupArn),containerName=$($script:ContainerName),containerPort=$($script:ContainerPort)",
        "--deployment-configuration", $deploymentFile,
        "--health-check-grace-period-seconds", "$($script:HealthCheckGracePeriodSeconds)",
        "--tags",
        "key=Project,value=$($script:Project)",
        "key=Environment,value=$($script:Environment)",
        "key=ManagedBy,value=$($script:ManagedBy)"
    )
    return $created.service
}

function Test-ServiceConfiguration {
    param($Service)
    if ($Service.launchType -ne "FARGATE") {
        Stop-D13 "Service must use FARGATE"
    }
    if ([int]$Service.desiredCount -ne 1) {
        Stop-D13 "Service desiredCount must be 1"
    }
    $lb = $Service.loadBalancers | Where-Object { $_.containerName -eq $script:ContainerName } | Select-Object -First 1
    if (-not $lb -or $lb.targetGroupArn -ne $script:TargetGroupArn) {
        Stop-D13 "Service load balancer configuration mismatch"
    }
    $net = $Service.networkConfiguration.awsvpcConfiguration
    if ($net.assignPublicIp -ne "DISABLED") {
        Stop-D13 "Service assignPublicIp must be DISABLED"
    }
}

function Wait-ServiceStable {
    Write-D13Log "Waiting for service stable"
    Invoke-Aws -AwsArgs @(
        "ecs", "wait", "services-stable",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--services", $script:ServiceName
    ) | Out-Null
}

function Test-TargetHealth {
    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health",
        "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $targets = @($health.TargetHealthDescriptions)
    $healthy = @($targets | Where-Object { $_.TargetHealth.State -eq "healthy" })
    if ($targets.Count -ne 1) {
        Stop-D13 "Expected exactly 1 registered target, found $($targets.Count)"
    }
    if ($healthy.Count -ne 1) {
        $reason = ($targets | ForEach-Object { $_.TargetHealth.State + ":" + $_.TargetHealth.Reason }) -join "; "
        Stop-D13 "Target not healthy: $reason"
    }
    return [ordered]@{
        registered = $targets.Count
        healthy    = $healthy.Count
        reason     = $healthy[0].TargetHealth.Reason
    }
}

function Invoke-CloudFrontHealthCheck {
    param([string]$Path)
    $url = "$($script:CloudFrontUrl)$Path"
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 30
        return [ordered]@{
            path   = $Path
            status = [int]$response.StatusCode
            body   = $response.Content
        }
    }
    catch {
        if ($_.Exception.Response) {
            return [ordered]@{
                path   = $Path
                status = [int]$_.Exception.Response.StatusCode.value__
                body   = ""
            }
        }
        Stop-D13 "CloudFront health check failed for $Path :: $($_.Exception.Message)"
    }
}

function Get-RunningTaskDetails {
    $tasks = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-tasks", "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--service-name", $script:ServiceName,
        "--desired-status", "RUNNING"
    )
    if (-not $tasks.taskArns -or $tasks.taskArns.Count -eq 0) {
        Stop-D13 "No running tasks for service"
    }
    $desc = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-tasks", "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--tasks", $tasks.taskArns[0]
    )
    $task = $desc.tasks[0]
    $container = $task.containers | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    $eni = ($task.attachments | Where-Object { $_.type -eq "ElasticNetworkInterface" }).details |
        Where-Object { $_.name -eq "networkInterfaceId" } | Select-Object -First 1
    $publicIp = "none"
    if ($eni) {
        $ni = Invoke-AwsJson -AwsArgs @(
            "ec2", "describe-network-interfaces", "--region", $script:Region,
            "--network-interface-ids", $eni.value
        )
        $assoc = $ni.NetworkInterfaces[0].Association
        if ($assoc -and $assoc.PublicIp) {
            $publicIp = $assoc.PublicIp
        }
    }
    return [ordered]@{
        taskArn       = $task.taskArn
        lastStatus    = $task.lastStatus
        healthStatus  = $container.healthStatus
        subnetId      = ($task.attachments.details | Where-Object { $_.name -eq "subnetId" }).value
        publicIp      = $publicIp
    }
}

function Test-StartupLogs {
    param([string]$TaskArn)
    $taskId = ($TaskArn -split "/")[-1]
    $prefix = "backend/$($script:ContainerName)/$taskId"
    Start-Sleep -Seconds 10
    $streams = Invoke-AwsJson -AwsArgs @(
        "logs", "describe-log-streams", "--region", $script:Region,
        "--log-group-name", $script:LogGroupName,
        "--log-stream-name-prefix", $prefix
    ) -AllowFailure
    if (-not $streams -or -not $streams.logStreams) {
        Write-D13Log "Startup logs not yet available"
        return
    }
    $events = Invoke-AwsJson -AwsArgs @(
        "logs", "get-log-events", "--region", $script:Region,
        "--log-group-name", $script:LogGroupName,
        "--log-stream-name", $streams.logStreams[0].logStreamName,
        "--limit", "100"
    )
    $text = (($events.events | ForEach-Object { $_.message }) -join "`n")
    Test-SecretExposureInText -Text $text -Context "startup logs"
    $forbidden = @(
        "migration:run",
        "synchronize",
        "env validation",
        "Secrets Manager injection failed",
        "DATABASE_PASSWORD",
        "EADDRINUSE"
    )
    foreach ($pattern in $forbidden) {
        if ($text -match [regex]::Escape($pattern)) {
            if ($pattern -eq "DATABASE_PASSWORD") {
                Stop-D13 "Startup logs contain DATABASE_PASSWORD reference"
            }
            if ($pattern -in @("migration:run", "synchronize")) {
                Stop-D13 "Startup logs indicate schema mutation: $pattern"
            }
        }
    }
    if ($text -match "EaziAiCall API listening") {
        Write-D13Log "Startup log confirms application bootstrap"
    }
}

function Update-Inventory {
    param($Service, $Task, $TargetHealth, $Live, $Ready)
    $inventoryObj = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $inventoryObj.ecs | Add-Member -NotePropertyName serviceName -NotePropertyValue $script:ServiceName -Force
    $inventoryObj.ecs | Add-Member -NotePropertyName serviceArn -NotePropertyValue $Service.serviceArn -Force
    $inventoryObj.ecs | Add-Member -NotePropertyName desiredCount -NotePropertyValue ([int]$Service.desiredCount) -Force
    $inventoryObj.ecs | Add-Member -NotePropertyName runningCount -NotePropertyValue ([int]$Service.runningCount) -Force
    $inventoryObj.ecs | Add-Member -NotePropertyName serviceStable -NotePropertyValue $true -Force
    $inventoryObj.ecs | Add-Member -NotePropertyName serviceCreated -NotePropertyValue $true -Force
    $inventoryObj.ecs | Add-Member -NotePropertyName assignPublicIp -NotePropertyValue $false -Force
    $inventoryObj | Add-Member -NotePropertyName runtimeHealth -NotePropertyValue ([pscustomobject]@{
            cloudFrontLive  = $Live.status
            cloudFrontReady = $Ready.status
            targetHealthy   = $true
            targetRegistered = $TargetHealth.registered
        }) -Force
    $json = $inventoryObj | ConvertTo-Json -Depth 12
    Test-SecretExposureInText -Text $json -Context "inventory"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($script:InventoryFile, $json, $utf8NoBom)
}

# --- Main ---
Write-D13Log "AWS-D13 PART A starting"
Test-Preflight

$existing = Get-ExistingService
if ($existing) {
    Write-D13Log "Reusing existing ECS service $($script:ServiceName)"
    Test-ServiceConfiguration -Service $existing
    if ([int]$existing.runningCount -ne 1 -or [int]$existing.pendingCount -gt 0) {
        Wait-ServiceStable
        $existing = Get-ExistingService
    }
}
else {
    $existing = New-BackendService
    Wait-ServiceStable
    $existing = Get-ExistingService
}

if ([int]$existing.desiredCount -ne 1) { Stop-D13 "desiredCount must be 1" }
if ([int]$existing.runningCount -ne 1) { Stop-D13 "runningCount must be 1" }
if ([int]$existing.pendingCount -ne 0) { Stop-D13 "pendingCount must be 0" }

$targetHealth = Test-TargetHealth
$task = Get-RunningTaskDetails
if ($task.publicIp -ne "none") {
    Stop-D13 "Task must not have public IP (found $($task.publicIp))"
}

Test-StartupLogs -TaskArn $task.taskArn

$live = Invoke-CloudFrontHealthCheck -Path "/health/live"
if ($live.status -ne 200) {
    Stop-D13 "CloudFront /health/live returned $($live.status)"
}
Write-D13Log "CloudFront /health/live = $($live.status)"

$ready = Invoke-CloudFrontHealthCheck -Path "/health/ready"
if ($ready.status -ne 200) {
    Stop-D13 "CloudFront /health/ready returned $($ready.status)"
}
Write-D13Log "CloudFront /health/ready = $($ready.status)"

Update-Inventory -Service $existing -Task $task -TargetHealth $targetHealth -Live $live -Ready $ready
Write-D13Log "AWS-D13 PART A complete"
