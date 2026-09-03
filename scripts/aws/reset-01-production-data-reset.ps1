# EaziAICall RESET-01 — Controlled production application-data reset
# DRY-RUN by default. Destructive truncate requires EAZI_ALLOW_PROD_DATA_RESET=YES
# and -Execute. Does NOT bootstrap users/org/business. Does NOT touch providers.
#Requires -Version 5.1
param(
    [switch]$Execute,
    [switch]$SkipSnapshot,
    [switch]$SkipEcsStop,
    [switch]$InventoryOnly
)
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:ExpectedRegion = "us-east-1"
$script:ClusterName = "eaziacall-prod-cluster"
$script:ServiceName = "eaziacall-prod-backend-service"
$script:TaskDefinitionFamily = "eaziacall-prod-backend"
$script:ContainerName = "backend"
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:DbIdentifier = "eaziacall-prod-postgres"
$script:DbName = "eazi_ai_call"
$script:MigrationTable = "eazi_ai_call_migrations"
$script:ExpectedMigrationCount = 16
$script:AlbDns = "eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com"
$script:PublicBaseUrl = "http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com"
$script:S3Bucket = "eaziacall-prod-812047028300-us-east-1"
$script:S3DeploymentPrefix = "deployment/reset-01"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"
$script:ReportFile = Join-Path $script:RepoRoot "docs/aws-deployment/RESET-01-production-data-reset.md"

function Write-ResetLog {
    param([string]$Message)
    Write-Host "[reset-01] $Message"
}

function Stop-Reset {
    param([string]$Message)
    Write-Error "[reset-01] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-Reset "Required command not found: $Name"
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
        Stop-Reset "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-Reset "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-Reset "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("reset01-{0}.json" -f [Guid]::NewGuid().ToString("N"))
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
        'SMTP_PASSWORD\s*=\s*\S+',
        'TWILIO_AUTH_TOKEN\s*=\s*\S+',
        'ELEVENLABS_API_KEY\s*=\s*\S+',
        'ELEVENLABS_WEBHOOK_SECRET\s*=\s*\S+'
    )
    foreach ($pattern in $patterns) {
        if ($Text -match $pattern) {
            Stop-Reset ('SECRET EXPOSURE DETECTED - ROTATION REQUIRED (' + $Context + ')')
        }
    }
}

function Test-PreflightIdentity {
    Test-CommandExists "aws"
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ("$($identity.Account)" -ne $script:ExpectedAccountId) {
        Stop-Reset "AWS account mismatch: expected $($script:ExpectedAccountId), got $($identity.Account)"
    }
    $region = [string](Invoke-Aws @("configure", "get", "region"))
    if ($region -ne $script:ExpectedRegion) {
        Stop-Reset "AWS region mismatch: expected $($script:ExpectedRegion), got $region"
    }
    $script:Region = $region
    $script:CallerArn = $identity.Arn
    Write-ResetLog "Caller OK account=$($identity.Account) region=$region"
}

function Import-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-Reset "Inventory file not found: $($script:InventoryFile)"
    }
    $script:Inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
    # One-off tasks must match the live service network path (public subnets +
    # assignPublicIp ENABLED). Private+DISABLED cannot reach Secrets Manager/ECR
    # without working VPC endpoints; the production service uses public subnets.
    $script:TaskSubnetIds = @($script:Inventory.network.publicSubnetIds)
    if ($script:TaskSubnetIds.Count -lt 2) {
        Stop-Reset "Inventory must include two public subnet IDs for ECS tasks"
    }
    $script:EcsSecurityGroupId = $script:Inventory.network.ecsSecurityGroupId
    $script:TargetGroupArn = $script:Inventory.targetGroup.arn
    if ($script:Inventory.loadBalancer -and $script:Inventory.loadBalancer.dnsName) {
        $script:AlbDns = [string]$script:Inventory.loadBalancer.dnsName
        $script:PublicBaseUrl = "http://$($script:AlbDns)"
    }
}

function Test-RdsGate {
    $rds = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-instances",
        "--region", $script:Region,
        "--db-instance-identifier", $script:DbIdentifier
    )
    $db = $rds.DBInstances[0]
    if ($db.DBInstanceStatus -ne "available") {
        Stop-Reset "RDS status must be available (got $($db.DBInstanceStatus))"
    }
    if ($db.PubliclyAccessible -eq $true) {
        Stop-Reset "RDS must not be publicly accessible"
    }
    if ("$($db.DBName)" -ne $script:DbName -and "$($db.DBName)" -ne "") {
        # Some RDS describe responses omit DBName; inventory is authoritative for app DB name
        Write-ResetLog "RDS describe DBName='$($db.DBName)' (app DB expected $($script:DbName))"
    }
    Write-ResetLog "RDS OK id=$($script:DbIdentifier) publiclyAccessible=false status=available"
}

function Get-LatestTaskRevision {
    $svc = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-services",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--services", $script:ServiceName
    )
    $td = [string]$svc.services[0].taskDefinition
    if ($td -match ':(\d+)$') {
        return [int]$Matches[1]
    }
    Stop-Reset "Unable to parse task definition revision from $td"
}

function Get-S3NodeTaskCommand {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$RemoteName,
        [hashtable]$ExtraEnv = @{}
    )
    if (-not (Test-Path $ScriptPath)) {
        Stop-Reset "Task script not found: $ScriptPath"
    }
    $s3Key = "$($script:S3DeploymentPrefix)/$RemoteName"
    & aws s3 cp $ScriptPath "s3://$($script:S3Bucket)/$s3Key" --region $script:Region --content-type "application/javascript" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Stop-Reset "Failed to upload ECS task script to S3: $RemoteName"
    }
    $envPrefix = ""
    foreach ($key in ($ExtraEnv.Keys | Sort-Object)) {
        $value = [string]$ExtraEnv[$key]
        $envPrefix += ('export {0}="{1}"; ' -f $key, ($value -replace '"', '\"'))
    }
    $loader = @'
__ENV__export RESET01_S3_BUCKET="__BUCKET__";
export RESET01_S3_KEY="__KEY__";
node -e "const {S3Client,GetObjectCommand}=require('@aws-sdk/client-s3');const fs=require('fs');(async()=>{const c=new S3Client({});const r=await c.send(new GetObjectCommand({Bucket:process.env.RESET01_S3_BUCKET,Key:process.env.RESET01_S3_KEY}));const b=await r.Body.transformToByteArray();fs.writeFileSync('/tmp/reset01-task.js',Buffer.from(b));require('child_process').execSync('NODE_PATH=/app/node_modules node /tmp/reset01-task.js',{stdio:'inherit',env:process.env});})().catch((e)=>{console.error(e.message||e);process.exit(1);});"
'@
    return $loader.Replace('__ENV__', $envPrefix).Replace('__BUCKET__', $script:S3Bucket).Replace('__KEY__', ($s3Key -replace '"', '\"'))
}

function Get-TaskLogText {
    param([string]$TaskArn, [string]$FilterPattern = "RESET01")
    $taskId = ($TaskArn -split "/")[-1]
    $streamName = "backend/$($script:ContainerName)/$taskId"
    Start-Sleep -Seconds 10
    for ($attempt = 1; $attempt -le 24; $attempt++) {
        $filtered = Invoke-AwsJson -AwsArgs @(
            "logs", "filter-log-events", "--region", $script:Region,
            "--log-group-name", $script:LogGroupName,
            "--log-stream-names", $streamName,
            "--filter-pattern", $FilterPattern,
            "--limit", "200"
        ) -AllowFailure
        if ($filtered -and $filtered.events -and $filtered.events.Count -gt 0) {
            return (($filtered.events | ForEach-Object { $_.message }) -join "`n")
        }
        if ($attempt -lt 24) { Start-Sleep -Seconds 5 }
    }
    return ""
}

function Invoke-EcsOneOffTask {
    param(
        [Parameter(Mandatory = $true)][string]$Purpose,
        [Parameter(Mandatory = $true)][string]$ShellCommand,
        [Parameter(Mandatory = $true)][int]$TaskRevision
    )

    $overridesObj = [ordered]@{
        containerOverrides = @(
            [ordered]@{
                name    = $script:ContainerName
                command = @("sh", "-c", $ShellCommand)
            }
        )
    }
    $overridesJson = ($overridesObj | ConvertTo-Json -Compress -Depth 6)
    Test-SecretExposureInText -Text $overridesJson -Context "task overrides"
    $overridesFile = New-AwsCliJsonFile -JsonContent $overridesJson

    $networkJson = (@{
            awsvpcConfiguration = @{
                subnets        = @($script:TaskSubnetIds[0], $script:TaskSubnetIds[1])
                securityGroups = @($script:EcsSecurityGroupId)
                assignPublicIp = "ENABLED"
            }
        } | ConvertTo-Json -Compress -Depth 5)
    $networkFile = New-AwsCliJsonFile -JsonContent $networkJson

    Write-ResetLog "Starting ECS one-off task ($Purpose) td=$($script:TaskDefinitionFamily):$TaskRevision"
    $run = Invoke-AwsJson -AwsArgs @(
        "ecs", "run-task",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--task-definition", "$($script:TaskDefinitionFamily):$TaskRevision",
        "--launch-type", "FARGATE",
        "--network-configuration", $networkFile,
        "--overrides", $overridesFile,
        "--tags", "key=Project,value=$($script:Project)", "key=Environment,value=$($script:Environment)", "key=ManagedBy,value=$($script:ManagedBy)", "key=Purpose,value=$Purpose"
    )

    if (-not $run.tasks -or $run.tasks.Count -eq 0) {
        Stop-Reset "ECS run-task failed for $Purpose"
    }

    $taskArn = $run.tasks[0].taskArn
    Invoke-Aws -AwsArgs @(
        "ecs", "wait", "tasks-stopped",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--tasks", $taskArn
    ) | Out-Null

    $desc = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-tasks",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--tasks", $taskArn
    )
    $container = $desc.tasks[0].containers | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    $exitCode = if ($null -ne $container.exitCode) { [int]$container.exitCode } else { -1 }
    $logText = Get-TaskLogText -TaskArn $taskArn
    Test-SecretExposureInText -Text $logText -Context "task logs $Purpose"
    return [ordered]@{
        purpose  = $Purpose
        taskArn  = $taskArn
        exitCode = $exitCode
        logText  = $logText
    }
}

function New-PreResetSnapshot {
    $ts = (Get-Date).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'").ToLower()
    $snapshotId = "eaziacall-prod-pre-clean-reset-$ts"
    Write-ResetLog "Creating snapshot $snapshotId"
    $created = Invoke-AwsJson -AwsArgs @(
        "rds", "create-db-snapshot",
        "--region", $script:Region,
        "--db-instance-identifier", $script:DbIdentifier,
        "--db-snapshot-identifier", $snapshotId,
        "--tags", "Key=Project,Value=$($script:Project)", "Key=Environment,Value=$($script:Environment)", "Key=ManagedBy,Value=$($script:ManagedBy)", "Key=Purpose,Value=pre-clean-reset"
    )
    Write-ResetLog "Waiting for snapshot available..."
    Invoke-Aws -AwsArgs @(
        "rds", "wait", "db-snapshot-available",
        "--region", $script:Region,
        "--db-snapshot-identifier", $snapshotId
    ) | Out-Null
    $snap = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-snapshots",
        "--region", $script:Region,
        "--db-snapshot-identifier", $snapshotId
    )
    $s = $snap.DBSnapshots[0]
    if ($s.Status -ne "available") {
        Stop-Reset "Snapshot not available: $($s.Status)"
    }
    $script:SnapshotId = $s.DBSnapshotIdentifier
    $script:SnapshotArn = $s.DBSnapshotArn
    $script:SnapshotCreated = [string]$s.SnapshotCreateTime
    Write-ResetLog "Snapshot AVAILABLE id=$($script:SnapshotId)"
}

function Set-EcsDesiredCount {
    param([int]$Count)
    Write-ResetLog "Scaling ECS service desiredCount=$Count"
    Invoke-Aws -AwsArgs @(
        "ecs", "update-service",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--service", $script:ServiceName,
        "--desired-count", "$Count"
    ) | Out-Null

    $deadline = (Get-Date).AddMinutes(15)
    do {
        Start-Sleep -Seconds 10
        $svc = Invoke-AwsJson -AwsArgs @(
            "ecs", "describe-services",
            "--region", $script:Region,
            "--cluster", $script:ClusterName,
            "--services", $script:ServiceName
        )
        $s = $svc.services[0]
        Write-ResetLog "ECS desired=$($s.desiredCount) running=$($s.runningCount) pending=$($s.pendingCount)"
        if ([int]$s.desiredCount -eq $Count -and [int]$s.runningCount -eq $Count -and [int]$s.pendingCount -eq 0) {
            return
        }
    } while ((Get-Date) -lt $deadline)

    Stop-Reset "Timed out waiting for ECS desired/running=$Count pending=0"
}

function Wait-EcsServicesStable {
    Write-ResetLog "Waiting for ECS services-stable"
    Invoke-Aws -AwsArgs @(
        "ecs", "wait", "services-stable",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--services", $script:ServiceName
    ) | Out-Null
}

function Test-TargetHealthy {
    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health",
        "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $healthy = @($health.TargetHealthDescriptions | Where-Object { $_.TargetHealth.State -eq "healthy" })
    if ($healthy.Count -lt 1) {
        Stop-Reset "No healthy ALB targets"
    }
    Write-ResetLog "Target health OK healthy=$($healthy.Count)"
}

function Test-HealthEndpoints {
    $live = (Invoke-WebRequest -Uri "$($script:PublicBaseUrl)/health/live" -UseBasicParsing -TimeoutSec 60).StatusCode
    $ready = (Invoke-WebRequest -Uri "$($script:PublicBaseUrl)/health/ready" -UseBasicParsing -TimeoutSec 60).StatusCode
    Write-ResetLog "Health live=$live ready=$ready"
    if ($live -ne 200 -or $ready -ne 200) {
        Stop-Reset "Health endpoints not 200 (live=$live ready=$ready)"
    }
}

# ---------------- main ----------------
Test-PreflightIdentity
Import-Inventory
Test-RdsGate

$taskRevision = Get-LatestTaskRevision
Write-ResetLog "Using task definition revision $taskRevision"

$mode = if ($Execute) { "execute" } else { "dry-run" }
Write-ResetLog "Mode=$mode InventoryOnly=$InventoryOnly"

if ($Execute) {
    if ($env:EAZI_ALLOW_PROD_DATA_RESET -ne "YES") {
        Stop-Reset "REFUSED: set EAZI_ALLOW_PROD_DATA_RESET=YES exactly to run destructive truncate"
    }
}

# Always run inventory first
$inventoryScript = Join-Path $PSScriptRoot "reset-01-inventory.js"
$invCmd = Get-S3NodeTaskCommand -ScriptPath $inventoryScript -RemoteName "reset-01-inventory.js"
$invResult = Invoke-EcsOneOffTask -Purpose "reset-01-inventory" -ShellCommand $invCmd -TaskRevision $taskRevision
Write-ResetLog $invResult.logText
if ($invResult.exitCode -ne 0 -or $invResult.logText -notmatch 'RESET01 inventory=PASS') {
    Stop-Reset "Inventory ECS task failed (exit $($invResult.exitCode))"
}
if ($invResult.logText -match 'RESET01 real_customer_data_suspect=YES') {
    if ($env:EAZI_RESET01_OPERATOR_CLEARED_CUSTOMER_GATE -eq "YES") {
        Write-ResetLog "Customer-data heuristic flagged suspects; proceeding because EAZI_RESET01_OPERATOR_CLEARED_CUSTOMER_GATE=YES"
    }
    else {
        Stop-Reset "RESET-01 BLOCKED: real customer data suspect - set EAZI_RESET01_OPERATOR_CLEARED_CUSTOMER_GATE=YES only after explicit operator clearance"
    }
}

$script:InventoryLog = $invResult.logText

if ($InventoryOnly) {
    Write-ResetLog "InventoryOnly complete - stopping before snapshot/truncate"
    exit 0
}

if (-not $SkipSnapshot) {
    if ($env:EAZI_RESET01_SNAPSHOT_ID) {
        $script:SnapshotId = $env:EAZI_RESET01_SNAPSHOT_ID
        $snap = Invoke-AwsJson -AwsArgs @(
            "rds", "describe-db-snapshots",
            "--region", $script:Region,
            "--db-snapshot-identifier", $script:SnapshotId
        )
        $s = $snap.DBSnapshots[0]
        if ($s.Status -ne "available") {
            Write-ResetLog "Waiting for existing snapshot $($script:SnapshotId)..."
            Invoke-Aws -AwsArgs @(
                "rds", "wait", "db-snapshot-available",
                "--region", $script:Region,
                "--db-snapshot-identifier", $script:SnapshotId
            ) | Out-Null
            $snap = Invoke-AwsJson -AwsArgs @(
                "rds", "describe-db-snapshots",
                "--region", $script:Region,
                "--db-snapshot-identifier", $script:SnapshotId
            )
            $s = $snap.DBSnapshots[0]
        }
        if ($s.Status -ne "available") {
            Stop-Reset "Provided snapshot not available"
        }
        $script:SnapshotArn = $s.DBSnapshotArn
        $script:SnapshotCreated = [string]$s.SnapshotCreateTime
        Write-ResetLog "Reusing snapshot $($script:SnapshotId) status=available"
    }
    else {
        New-PreResetSnapshot
    }
}

$truncateScript = Join-Path $PSScriptRoot "reset-01-truncate.js"
$extraEnv = @{
    EAZI_RESET_MODE            = $mode
    EAZI_ALLOW_PROD_DATA_RESET = "$(if ($env:EAZI_ALLOW_PROD_DATA_RESET) { $env:EAZI_ALLOW_PROD_DATA_RESET } else { 'NO' })"
}

if ($Execute) {
    if (-not $SkipEcsStop) {
        Set-EcsDesiredCount -Count 0
    }
    $truncCmd = Get-S3NodeTaskCommand -ScriptPath $truncateScript -RemoteName "reset-01-truncate.js" -ExtraEnv $extraEnv
    $truncResult = Invoke-EcsOneOffTask -Purpose "reset-01-truncate" -ShellCommand $truncCmd -TaskRevision $taskRevision
    Write-ResetLog $truncResult.logText
    if ($truncResult.exitCode -ne 0 -or $truncResult.logText -notmatch 'RESET01 truncate=PASS') {
        Stop-Reset "Truncate ECS task failed (exit $($truncResult.exitCode))"
    }
    if (-not $SkipEcsStop) {
        Set-EcsDesiredCount -Count 1
        Wait-EcsServicesStable
        Test-TargetHealthy
        Test-HealthEndpoints
    }
    # Post-reset inventory
    $postCmd = Get-S3NodeTaskCommand -ScriptPath $inventoryScript -RemoteName "reset-01-inventory-post.js"
    $postResult = Invoke-EcsOneOffTask -Purpose "reset-01-inventory-post" -ShellCommand $postCmd -TaskRevision $taskRevision
    Write-ResetLog $postResult.logText
    Write-ResetLog "RESET-01 EXECUTE PASS"
}
else {
    # Dry-run truncate planning (no ECS stop, no mutations)
    $truncCmd = Get-S3NodeTaskCommand -ScriptPath $truncateScript -RemoteName "reset-01-truncate.js" -ExtraEnv $extraEnv
    $truncResult = Invoke-EcsOneOffTask -Purpose "reset-01-truncate-dry-run" -ShellCommand $truncCmd -TaskRevision $taskRevision
    Write-ResetLog $truncResult.logText
    if ($truncResult.exitCode -ne 0 -or $truncResult.logText -notmatch 'RESET01 dry_run=PASS') {
        Stop-Reset "Dry-run truncate planning failed (exit $($truncResult.exitCode))"
    }
    Write-ResetLog "RESET-01 DRY-RUN PASS (no application data deleted)"
}

Write-ResetLog "Done. Review docs/aws-deployment/RESET-01-production-data-reset.md"
