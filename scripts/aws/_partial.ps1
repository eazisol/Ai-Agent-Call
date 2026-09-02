# EaziAICall AWS-D12 - Controlled Production PostgreSQL Migration (idempotent, NO ECS service)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:ExpectedRegion = "us-east-1"
$script:ClusterName = "eaziacall-prod-cluster"
$script:TaskDefinitionFamily = "eaziacall-prod-backend"
$script:ExpectedTaskRevision = 3
$script:ContainerName = "backend"
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:MigrationTable = "eazi_ai_call_migrations"
$script:CanonicalDigest = "sha256:65f161a879e82a022ad953fb6334fe0ade8fc0fd93bd7f86a3816c151bac889b"
$script:MigrationCommand = "node dist/database/bootstrap-eazi-migrations.js && node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run"
$script:MigrationShowCommand = "node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:show"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"
$script:MigrationsDir = Join-Path $script:RepoRoot "ai-call-agent-backend/src/database/migrations"

function Write-D12Log {
    param([string]$Message)
    Write-Host "[d12-migrate] $Message"
}

function Stop-D12 {
    param([string]$Message)
    Write-Error "[d12-migrate] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D12 "Required command not found: $Name"
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
        Stop-D12 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D12 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D12 "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d12-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Get-RegisteredMigrationCount {
    if (-not (Test-Path $script:MigrationsDir)) {
        Stop-D12 "Migration source directory not found: $($script:MigrationsDir)"
    }
    $files = @(Get-ChildItem -Path $script:MigrationsDir -Filter "*.ts" -File | Sort-Object Name)
    if ($files.Count -eq 0) {
        Stop-D12 "No registered migration source files found"
    }
    return $files.Count
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
            Stop-D12 "SECRET EXPOSURE DETECTED â€” ROTATION REQUIRED ($Context)"
        }
    }
}

function Test-PreflightIdentity {
    Test-CommandExists "aws"
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ($identity.Account -ne $script:ExpectedAccountId) {
        Stop-D12 "AWS account mismatch: expected $($script:ExpectedAccountId), got $($identity.Account)"
    }
    $region = [string](Invoke-Aws @("configure", "get", "region"))
    if ($region -ne $script:ExpectedRegion) {
        Stop-D12 "AWS region mismatch: expected $($script:ExpectedRegion), got $region"
    }
    $script:Region = $region
    $script:CallerArn = $identity.Arn
}

function Import-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D12 "Inventory file not found: $($script:InventoryFile)"
    }
    $script:Inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Test-PreflightInfrastructure {
    Import-Inventory

    $script:PrivateSubnetIds = @($script:Inventory.network.privateSubnetIds)
    if ($script:PrivateSubnetIds.Count -lt 2) {
        Stop-D12 "Inventory must include two private subnet IDs"
    }
    $script:EcsSecurityGroupId = $script:Inventory.network.ecsSecurityGroupId
    $script:RdsSecurityGroupId = $script:Inventory.network.rdsSecurityGroupId
    $script:DatabaseIdentifier = $script:Inventory.database.identifier
    $script:DatabaseName = $script:Inventory.database.databaseName
    $script:ClusterArn = $script:Inventory.ecs.clusterArn
    $script:TaskRoleArn = $script:Inventory.ecs.applicationTaskRoleArn
    $script:ExecutionRoleArn = $script:Inventory.ecs.executionRoleArn
    $script:TaskDefinitionArn = $script:Inventory.ecs.runtimeTaskDefinitionArn
    $script:CanonicalImageUri = $script:Inventory.ecs.imageUri
    $script:LogGroupName = $script:Inventory.logging.backendLogGroup

    if ($script:Inventory.backendImage.digest -ne $script:CanonicalDigest) {
        Stop-D12 "Inventory backend image digest does not match canonical D11 digest"
    }
    if ([int]$script:Inventory.ecs.runtimeTaskDefinitionRevision -ne $script:ExpectedTaskRevision) {
        Stop-D12 "Expected runtime task definition revision $($script:ExpectedTaskRevision)"
    }
    if (-not $script:Inventory.ecs.secretsConfigured) {
        Stop-D12 "D11 secrets not configured according to inventory"
    }
    if (-not $script:Inventory.secrets.database.arn) {
        Stop-D12 "RDS-managed secret ARN missing from inventory"
    }

    $rds = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-instances", "--region", $script:Region,
        "--db-instance-identifier", $script:DatabaseIdentifier
    )
    $db = $rds.DBInstances[0]
    if ($db.DBInstanceStatus -ne "available") {
        Stop-D12 "RDS status is not available: $($db.DBInstanceStatus)"
    }
    if ($db.PubliclyAccessible) {
        Stop-D12 "RDS must not be publicly accessible"
    }
    if ($db.DBName -ne $script:DatabaseName) {
        Stop-D12 "RDS database name mismatch: expected $($script:DatabaseName), got $($db.DBName)"
    }

    $cluster = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-clusters", "--region", $script:Region,
        "--clusters", $script:ClusterName, "--include", "STATISTICS"
    )
    if ($cluster.clusters[0].status -ne "ACTIVE") {
        Stop-D12 "ECS cluster is not ACTIVE"
    }
    if ([int]$cluster.clusters[0].runningTasksCount -ne 0) {
        Stop-D12 "ECS running tasks must be 0 before D12 (found $($cluster.clusters[0].runningTasksCount))"
    }
    if ([int]$cluster.clusters[0].activeServicesCount -ne 0) {
        Stop-D12 "ECS services must be 0 before D12 (found $($cluster.clusters[0].activeServicesCount))"
    }

    $taskDef = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-task-definition", "--region", $script:Region,
        "--task-definition", "$($script:TaskDefinitionFamily):$($script:ExpectedTaskRevision)",
        "--query", "taskDefinition"
    )
    if ($taskDef.status -ne "ACTIVE") {
        Stop-D12 "Task definition revision $($script:ExpectedTaskRevision) is not ACTIVE"
    }
    $container = $taskDef.containerDefinitions | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    if (-not $container) {
        Stop-D12 "Container $($script:ContainerName) not found in task definition"
    }
    if ($container.image -notmatch [regex]::Escape($script:CanonicalDigest)) {
        Stop-D12 "Task definition image digest does not match canonical digest"
    }
    if (-not $container.secrets -or $container.secrets.Count -eq 0) {
        Stop-D12 "Task definition must include secrets[] from D11"
    }

    Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", "eaziacall-prod-ecs-task-role") | Out-Null
    Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", "eaziacall-prod-ecs-execution-role") | Out-Null

    foreach ($subnetId in $script:PrivateSubnetIds) {
        $subnet = Invoke-AwsJson -AwsArgs @("ec2", "describe-subnets", "--region", $script:Region, "--subnet-ids", $subnetId)
        if (-not $subnet.Subnets -or $subnet.Subnets.Count -eq 0) {
            Stop-D12 "Private subnet not found: $subnetId"
        }
    }

    $ecsRules = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups", "--region", $script:Region,
        "--group-ids", $script:RdsSecurityGroupId
    )
    $ingress = @($ecsRules.SecurityGroups[0].IpPermissions | Where-Object {
            $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 -and
            $_.UserIdGroupPairs.groupId -contains $script:EcsSecurityGroupId
        })
    if ($ingress.Count -eq 0) {
        Stop-D12 "RDS SG must allow TCP 5432 from ECS SG"
    }

    $tgArn = $script:Inventory.targetGroup.arn
    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health", "--region", $script:Region,
        "--target-group-arn", $tgArn
    )
    $script:TargetGroupRegisteredCount = @($health.TargetHealthDescriptions).Count
    if ($script:TargetGroupRegisteredCount -ne 0) {
        Stop-D12 "Target group must have 0 registered targets (found $($script:TargetGroupRegisteredCount))"
    }

    $services = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-services", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($services.serviceArns -and $services.serviceArns.Count -gt 0) {
        Stop-D12 "ECS services must not exist before D12"
    }

    $script:RegisteredMigrationCount = Get-RegisteredMigrationCount
    Write-D12Log "Preflight OK (registered migrations: $($script:RegisteredMigrationCount))"
}

function Get-Base64NodeTaskCommand {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [hashtable]$ExtraEnv = @{}
    )
    if (-not (Test-Path $ScriptPath)) {
        Stop-D12 "Task script not found: $ScriptPath"
    }
    $content = Get-Content -Path $ScriptPath -Raw -Encoding UTF8
    $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
    $envPrefix = ""
    foreach ($key in ($ExtraEnv.Keys | Sort-Object)) {
        $value = [string]$ExtraEnv[$key]
        $envPrefix += ('export {0}={1}; ' -f $key, $value)
    }
    return ($envPrefix + 'echo ' + $b64 + ' | base64 -d > /tmp/d12-task.js && node /tmp/d12-task.js')
}

function Get-ReadOnlyPreflightCommand {
    $scriptPath = Join-Path $PSScriptRoot "d12-preflight.js"
    return Get-Base64NodeTaskCommand -ScriptPath $scriptPath
}

function Get-PostMigrationVerifyCommand {
    param([int]$ExpectedMigrationCount)
    $scriptPath = Join-Path $PSScriptRoot "d12-verify.js"
    return Get-Base64NodeTaskCommand -ScriptPath $scriptPath -ExtraEnv @{
        DAZI_MIGRATION_TABLE          = $script:MigrationTable
        DAZI_EXPECTED_MIGRATION_COUNT = "$ExpectedMigrationCount"
    }
}

function Get-TaskLogText {
    param([string]$TaskArn)
    $taskId = ($TaskArn -split "/")[-1]
    $prefix = "backend/$($script:ContainerName)/$taskId"
    $streams = Invoke-AwsJson -AwsArgs @(
        "logs", "describe-log-streams", "--region", $script:Region,
        "--log-group-name", $script:LogGroupName,
        "--log-stream-name-prefix", $prefix,
        "--order-by", "LastEventTime", "--descending", "--limit", "1"
    ) -AllowFailure
    if (-not $streams -or -not $streams.logStreams -or $streams.logStreams.Count -eq 0) {
        return ""
    }
    $streamName = $streams.logStreams[0].logStreamName
    $events = Invoke-AwsJson -AwsArgs @(
        "logs", "get-log-events", "--region", $script:Region,
        "--log-group-name", $script:LogGroupName,
        "--log-stream-name", $streamName,
        "--limit", "200"
    ) -AllowFailure
    if (-not $events -or -not $events.events) { return "" }
    return (($events.events | ForEach-Object { $_.message }) -join "`n")
}

function Invoke-EcsOneOffTask {
    param(
        [Parameter(Mandatory = $true)][string]$Purpose,
        [Parameter(Mandatory = $true)][string]$ShellCommand
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
                subnets        = @($script:PrivateSubnetIds[0], $script:PrivateSubnetIds[1])
                securityGroups = @($script:EcsSecurityGroupId)
                assignPublicIp = "DISABLED"
            }
        } | ConvertTo-Json -Compress -Depth 5)
    $networkFile = New-AwsCliJsonFile -JsonContent $networkJson

    Write-D12Log "Starting ECS one-off task ($Purpose)"
    $run = Invoke-AwsJson -AwsArgs @(
        "ecs", "run-task",
        "--region", $script:Region,
        "--cluster", $script:ClusterName,
        "--task-definition", "$($script:TaskDefinitionFamily):$($script:ExpectedTaskRevision)",
        "--launch-type", "FARGATE",
        "--network-configuration", $networkFile,
        "--overrides", $overridesFile,
        "--tags", "key=Project,value=$($script:Project)", "key=Environment,value=$($script:Environment)", "key=ManagedBy,value=$($script:ManagedBy)", "key=Purpose,value=$Purpose"
    )

    if (-not $run.tasks -or $run.tasks.Count -eq 0) {
        $failures = if ($run.failures) { ($run.failures | ConvertTo-Json -Compress) } else { "unknown" }
        Stop-D12 "ECS run-task failed for $Purpose :: $failures"
    }

    $taskArn = $run.tasks[0].taskArn
    Write-D12Log "Task started ($Purpose): $taskArn"

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
    $task = $desc.tasks[0]
    $container = $task.containers | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    $exitCode = if ($null -ne $container.exitCode) { [int]$container.exitCode } else { -1 }

    return [ordered]@{
        purpose       = $Purpose
        taskArn       = $taskArn
        lastStatus    = $task.lastStatus
        stopCode      = $task.stopCode
        stoppedReason = $task.stoppedReason
        containerReason = $container.reason
        exitCode      = $exitCode
        assignPublicIp = "DISABLED"
        subnets       = @($script:PrivateSubnetIds[0], $script:PrivateSubnetIds[1])
        securityGroup = $script:EcsSecurityGroupId
    }
}

function New-PreMigrationSnapshot {
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
    $identifier = "eaziacall-prod-pre-d12-$timestamp"
    Write-D12Log "Creating pre-migration RDS snapshot $identifier"
    $created = Invoke-AwsJson -AwsArgs @(
