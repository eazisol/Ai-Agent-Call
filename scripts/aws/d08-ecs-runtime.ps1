# EaziAICall AWS-D08 - ECS Runtime Foundation (idempotent, AWS CLI only, NO service/task run)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:ClusterName = "eaziacall-prod-cluster"
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:LogRetentionDays = 14
$script:ExecutionRoleName = "eaziacall-prod-ecs-execution-role"
$script:TaskDefinitionFamily = "eaziacall-prod-backend"
$script:ContainerName = "backend"
$script:ContainerPort = 3000
$script:TaskCpu = "512"
$script:TaskMemory = "1024"
$script:CanonicalImageTag = "aa49b93-20260901t125102z"
$script:CanonicalImageDigest = "sha256:98beea787f8c3eb93aacab3f6abc27ae3efbe92e6b7657681d0afc74a5dfa1b9"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D08Log {
    param([string]$Message)
    Write-Host "[d08-ecs-runtime] $Message"
}

function Stop-D08 {
    param([string]$Message)
    Write-Error "[d08-ecs-runtime] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D08 "Required command not found: $Name"
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
        Stop-D08 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D08 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D08 "AWS CLI returned empty JSON: aws $($AwsArgs -join ' ')"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d08-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D08 "AWS region is not configured."
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D08 "Resource inventory not found: $($script:InventoryFile)"
    }
    try {
        return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        Stop-D08 "Failed to parse resource inventory."
    }
}

function Test-InventoryPrerequisites {
    param($Inventory)
    foreach ($section in @("network", "database", "objectStorage", "iam", "containerRegistry", "backendImage")) {
        if (-not $Inventory.$section) {
            Stop-D08 "Inventory missing required section: $section"
        }
    }
    if ($Inventory.accountId -and $Inventory.accountId -ne $script:AccountId) {
        Stop-D08 "Inventory accountId mismatch"
    }
    if ($Inventory.backendImage.digest -ne $script:CanonicalImageDigest) {
        Stop-D08 "Inventory backendImage digest does not match canonical D07 digest"
    }
    if ([int]$Inventory.backendImage.scanCriticalCount -gt 0) {
        Stop-D08 "Inventory reports blocked image with CRITICAL scan findings"
    }

    $script:TaskRoleArn = [string]$Inventory.iam.ecsTaskRoleArn
    $script:RepositoryUri = [string]$Inventory.containerRegistry.repositoryUri
    $script:PrivateSubnetAId = [string]$Inventory.network.privateSubnetIds[0]
    $script:PrivateSubnetBId = [string]$Inventory.network.privateSubnetIds[1]
    $script:EcsSecurityGroupId = [string]$Inventory.network.ecsSecurityGroupId
    $script:VpcId = [string]$Inventory.network.vpcId
    $script:DatabaseHost = [string]$Inventory.database.endpoint
    $script:DatabaseUser = [string]$Inventory.database.masterUsername
    $script:DatabaseName = [string]$Inventory.database.databaseName
    $script:ObjectStorageBucket = [string]$Inventory.objectStorage.bucketName
    $script:PinnedImage = "$($script:RepositoryUri)@$($script:CanonicalImageDigest)"
}

function Test-LivePrerequisites {
    Invoke-Aws -AwsArgs @("ec2", "describe-vpcs", "--region", $script:Region, "--vpc-ids", $script:VpcId) | Out-Null
    Invoke-Aws -AwsArgs @(
        "ec2", "describe-subnets", "--region", $script:Region,
        "--subnet-ids", $script:PrivateSubnetAId, $script:PrivateSubnetBId
    ) | Out-Null
    Invoke-Aws -AwsArgs @(
        "ec2", "describe-security-groups", "--region", $script:Region,
        "--group-ids", $script:EcsSecurityGroupId
    ) | Out-Null
    Invoke-Aws -AwsArgs @(
        "rds", "describe-db-instances", "--region", $script:Region,
        "--db-instance-identifier", "eaziacall-prod-postgres"
    ) | Out-Null
    Invoke-Aws -AwsArgs @("s3api", "head-bucket", "--bucket", $script:ObjectStorageBucket) | Out-Null
    Invoke-Aws -AwsArgs @(
        "iam", "get-role", "--role-name", "eaziacall-prod-ecs-task-role"
    ) | Out-Null
}

function Test-CanonicalEcrImage {
    $images = Invoke-AwsJson -AwsArgs @(
        "ecr", "describe-images", "--region", $script:Region,
        "--repository-name", "eaziacall-prod-backend",
        "--image-ids", "imageTag=$($script:CanonicalImageTag)"
    )
    if (-not $images.imageDetails -or $images.imageDetails.Count -eq 0) {
        Stop-D08 "Canonical ECR image tag not found: $($script:CanonicalImageTag)"
    }
    $detail = $images.imageDetails[0]
    if ($detail.imageDigest -ne $script:CanonicalImageDigest) {
        Stop-D08 "Canonical image digest mismatch: expected $($script:CanonicalImageDigest), got $($detail.imageDigest)"
    }

    $findings = Invoke-AwsJson -AwsArgs @(
        "ecr", "describe-image-scan-findings", "--region", $script:Region,
        "--repository-name", "eaziacall-prod-backend",
        "--image-id", "imageTag=$($script:CanonicalImageTag)"
    ) -AllowFailure

    $script:ScanCriticalCount = 0
    $script:ScanHighCount = 0
    if ($findings -and $findings.imageScanFindings -and $findings.imageScanFindings.findingSeverityCounts) {
        $counts = $findings.imageScanFindings.findingSeverityCounts
        $script:ScanCriticalCount = if ($counts.CRITICAL) { [int]$counts.CRITICAL } else { 0 }
        $script:ScanHighCount = if ($counts.HIGH) { [int]$counts.HIGH } else { 0 }
    }
    if ($script:ScanCriticalCount -gt 0) {
        Stop-D08 "Canonical ECR image has CRITICAL scan findings"
    }
    Write-D08Log "Canonical ECR image verified: $($script:CanonicalImageTag) @ $($script:CanonicalImageDigest)"
}

function Get-TrustPolicyDocument {
    return (@{
        Version = "2012-10-17"
        Statement = @(@{
            Effect = "Allow"
            Principal = @{ Service = "ecs-tasks.amazonaws.com" }
            Action = "sts:AssumeRole"
        })
    } | ConvertTo-Json -Compress -Depth 6)
}

function New-OrReuseCluster {
    $existing = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-clusters", "--region", $script:Region,
        "--clusters", $script:ClusterName, "--include", "SETTINGS"
    )
    $cluster = $null
    if ($existing.clusters -and $existing.clusters.Count -gt 0 -and $existing.clusters[0].status -eq "ACTIVE") {
        Write-D08Log "Reusing ECS cluster $($script:ClusterName)"
        $cluster = $existing.clusters[0]
    }
    else {
        Write-D08Log "Creating ECS cluster $($script:ClusterName)"
        $created = Invoke-AwsJson -AwsArgs @(
            "ecs", "create-cluster", "--region", $script:Region,
            "--cluster-name", $script:ClusterName,
            "--settings", "name=containerInsights,value=enabled",
            "--tags",
            "key=Project,value=$($script:Project)",
            "key=Environment,value=$($script:Environment)",
            "key=ManagedBy,value=$($script:ManagedBy)",
            "key=Name,value=$($script:ClusterName)"
        )
        $cluster = $created.cluster
    }

    if ($cluster.status -ne "ACTIVE") {
        Stop-D08 "ECS cluster is not ACTIVE: $($cluster.status)"
    }
    $script:ClusterArn = $cluster.clusterArn
    $insights = @($cluster.settings | Where-Object { $_.name -eq "containerInsights" })
    $script:ContainerInsights = ($insights.Count -gt 0 -and $insights[0].value -eq "enabled")
    if (-not $script:ContainerInsights) {
        Write-D08Log "Enabling Container Insights on cluster"
        Invoke-Aws -AwsArgs @(
            "ecs", "update-cluster-settings", "--region", $script:Region,
            "--cluster", $script:ClusterName,
            "--settings", "name=containerInsights,value=enabled"
        ) | Out-Null
        $script:ContainerInsights = $true
    }
}

function New-OrReuseLogGroup {
    $existing = Invoke-AwsJson -AwsArgs @(
        "logs", "describe-log-groups", "--region", $script:Region,
        "--log-group-name-prefix", $script:LogGroupName
    ) -AllowFailure
    $found = $false
    if ($existing -and $existing.logGroups) {
        $found = @($existing.logGroups | Where-Object { $_.logGroupName -eq $script:LogGroupName }).Count -gt 0
    }
    if (-not $found) {
        Write-D08Log "Creating CloudWatch log group $($script:LogGroupName)"
        Invoke-Aws -AwsArgs @(
            "logs", "create-log-group", "--region", $script:Region,
            "--log-group-name", $script:LogGroupName,
            "--tags", "Project=$($script:Project),Environment=$($script:Environment),ManagedBy=$($script:ManagedBy)"
        ) | Out-Null
    }
    else {
        Write-D08Log "Reusing CloudWatch log group $($script:LogGroupName)"
    }
    Invoke-Aws -AwsArgs @(
        "logs", "put-retention-policy", "--region", $script:Region,
        "--log-group-name", $script:LogGroupName,
        "--retention-in-days", "$($script:LogRetentionDays)"
    ) | Out-Null
    $retention = Invoke-AwsText -AwsArgs @(
        "logs", "describe-log-groups", "--region", $script:Region,
        "--log-group-name-prefix", $script:LogGroupName,
        "--query", "logGroups[?logGroupName=='$($script:LogGroupName)'].retentionInDays | [0]"
    )
    if ([int]$retention -ne $script:LogRetentionDays) {
        Stop-D08 "Log group retention expected $($script:LogRetentionDays), got $retention"
    }
}

function New-OrReuseExecutionRole {
    $existing = Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", $script:ExecutionRoleName) -AllowFailure
    if ($existing) {
        Write-D08Log "Reusing execution role $($script:ExecutionRoleName)"
        $script:ExecutionRoleArn = $existing.Role.Arn
    }
    else {
        Write-D08Log "Creating execution role $($script:ExecutionRoleName)"
        $trustFile = New-AwsCliJsonFile -JsonContent (Get-TrustPolicyDocument)
        $created = Invoke-AwsJson -AwsArgs @(
            "iam", "create-role",
            "--role-name", $script:ExecutionRoleName,
            "--assume-role-policy-document", $trustFile,
            "--tags",
            "Key=Project,Value=$($script:Project)",
            "Key=Environment,Value=$($script:Environment)",
            "Key=ManagedBy,Value=$($script:ManagedBy)"
        )
        $script:ExecutionRoleArn = $created.Role.Arn
    }

    $attached = Invoke-AwsJson -AwsArgs @(
        "iam", "list-attached-role-policies", "--role-name", $script:ExecutionRoleName
    )
    $execPolicyArn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
    if (-not (@($attached.AttachedPolicies | Where-Object { $_.PolicyArn -eq $execPolicyArn }))) {
        Write-D08Log "Attaching AmazonECSTaskExecutionRolePolicy"
        Invoke-Aws -AwsArgs @(
            "iam", "attach-role-policy",
            "--role-name", $script:ExecutionRoleName,
            "--policy-arn", $execPolicyArn
        ) | Out-Null
    }

    foreach ($policy in $attached.AttachedPolicies) {
        if ($policy.PolicyName -in @("AdministratorAccess", "AmazonS3FullAccess")) {
            Stop-D08 "Execution role must not have broad policy: $($policy.PolicyName)"
        }
    }
    $script:TrustPrincipal = "ecs-tasks.amazonaws.com"
}

function Test-ApplicationTaskRole {
    $role = Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", "eaziacall-prod-ecs-task-role")
    if ($role.Role.Arn -ne $script:TaskRoleArn) {
        Stop-D08 "Application task role ARN mismatch"
    }
    $attached = Invoke-AwsJson -AwsArgs @(
        "iam", "list-attached-role-policies", "--role-name", "eaziacall-prod-ecs-task-role"
    )
    $script:ApplicationTaskRolePolicies = @($attached.AttachedPolicies | ForEach-Object { $_.PolicyName })
    foreach ($policy in $attached.AttachedPolicies) {
        if ($policy.PolicyName -in @("AdministratorAccess", "AmazonS3FullAccess")) {
            Stop-D08 "Application task role must not have broad policy: $($policy.PolicyName)"
        }
    }
}

function Get-DesiredTaskDefinitionObject {
    $healthCmd = "node -e `"fetch('http://127.0.0.1:3000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))`""
    return [ordered]@{
        family                  = $script:TaskDefinitionFamily
        networkMode             = "awsvpc"
        requiresCompatibilities = @("FARGATE")
        cpu                     = $script:TaskCpu
        memory                  = $script:TaskMemory
        taskRoleArn             = $script:TaskRoleArn
        executionRoleArn        = $script:ExecutionRoleArn
        runtimePlatform         = [ordered]@{
            operatingSystemFamily = "LINUX"
            cpuArchitecture       = "X86_64"
        }
        containerDefinitions    = @(
            [ordered]@{
                name              = $script:ContainerName
                image             = $script:PinnedImage
                essential         = $true
                privileged        = $false
                portMappings      = @(
                    [ordered]@{
                        containerPort = $script:ContainerPort
                        protocol      = "tcp"
                    }
                )
                environment       = @(
                    @{ name = "NODE_ENV"; value = "production" },
                    @{ name = "PORT"; value = "3000" },
                    @{ name = "LOG_LEVEL"; value = "log" },
                    @{ name = "REDIS_ENABLED"; value = "false" },
                    @{ name = "OBJECT_STORAGE_ENABLED"; value = "true" },
                    @{ name = "OBJECT_STORAGE_REGION"; value = "us-east-1" },
                    @{ name = "OBJECT_STORAGE_BUCKET"; value = $script:ObjectStorageBucket },
                    @{ name = "DATABASE_HOST"; value = $script:DatabaseHost },
                    @{ name = "DATABASE_PORT"; value = "5432" },
                    @{ name = "DATABASE_USER"; value = $script:DatabaseUser },
                    @{ name = "DATABASE_NAME"; value = $script:DatabaseName },
                    @{ name = "DATABASE_SSL"; value = "true" }
                )
                logConfiguration  = [ordered]@{
                    logDriver = "awslogs"
                    options   = [ordered]@{
                        "awslogs-group"         = $script:LogGroupName
                        "awslogs-region"        = $script:Region
                        "awslogs-stream-prefix" = "backend"
                    }
                }
                healthCheck       = [ordered]@{
                    command     = @("CMD-SHELL", $healthCmd)
                    interval    = 30
                    timeout     = 5
                    retries     = 3
                    startPeriod = 30
                }
            }
        )
    }
}

function Test-TaskDefinitionJsonSecrets {
    param([string]$JsonContent)
    $forbiddenEnvNames = @(
        "DATABASE_PASSWORD",
        "AUTH_JWT_ACCESS_SECRET",
        "SMTP_PASSWORD",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_API_KEY_SECRET",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_WEBHOOK_SECRET",
        "OPENAI_API_KEY",
        "VOICE_STREAM_SIGNING_SECRET",
        "OBJECT_STORAGE_ACCESS_KEY_ID",
        "OBJECT_STORAGE_SECRET_ACCESS_KEY"
    )
    foreach ($name in $forbiddenEnvNames) {
        if ($JsonContent -match ('"name"\s*:\s*"' + [regex]::Escape($name) + '"')) {
            Stop-D08 "SECRET EXPOSURE DETECTED - task definition contains forbidden env name: $name"
        }
    }
    if ($JsonContent -match 'AKIA[0-9A-Z]{16}') {
        Stop-D08 "SECRET EXPOSURE DETECTED - AWS access key pattern in task definition"
    }
    if ($JsonContent -match '"value"\s*:\s*"(changeme|dummy-secret|production-secret)"') {
        Stop-D08 "SECRET EXPOSURE DETECTED - placeholder secret value in task definition"
    }
}

function Get-NormalizedEnvFingerprint {
    param($Environment)
    if (-not $Environment) { return "" }
    $pairs = @($Environment | ForEach-Object { "$($_.name)=$($_.value)" } | Sort-Object)
    return ($pairs -join "|")
}

function Get-NormalizedHealthCheckFingerprint {
    param($HealthCheck)
    if (-not $HealthCheck) { return "" }
    $command = ($HealthCheck.command | ForEach-Object { "$_" }) -join " "
    return ("$command|interval=$($HealthCheck.interval)|timeout=$($HealthCheck.timeout)|retries=$($HealthCheck.retries)|startPeriod=$($HealthCheck.startPeriod)")
}

function Compare-TaskDefinition {
    param($Existing, $Desired)
    if ($Existing.family -ne $Desired.family) { return $false }
    if ($Existing.networkMode -ne $Desired.networkMode) { return $false }
    if ($Existing.cpu -ne $Desired.cpu) { return $false }
    if ($Existing.memory -ne $Desired.memory) { return $false }
    if ($Existing.taskRoleArn -ne $Desired.taskRoleArn) { return $false }
    if ($Existing.executionRoleArn -ne $Desired.executionRoleArn) { return $false }
    if ($Existing.runtimePlatform.cpuArchitecture -ne $Desired.runtimePlatform.cpuArchitecture) { return $false }
    if ($Existing.runtimePlatform.operatingSystemFamily -ne $Desired.runtimePlatform.operatingSystemFamily) { return $false }

    $container = $Existing.containerDefinitions[0]
    $desiredContainer = $Desired.containerDefinitions[0]
    if ($container.name -ne $desiredContainer.name) { return $false }
    if ($container.image -ne $desiredContainer.image) { return $false }
    if ([bool]$container.essential -ne [bool]$desiredContainer.essential) { return $false }
    if ([bool]$container.privileged -ne [bool]$desiredContainer.privileged) { return $false }
    if ([int]$container.portMappings[0].containerPort -ne [int]$desiredContainer.portMappings[0].containerPort) { return $false }

    if ((Get-NormalizedEnvFingerprint $container.environment) -ne (Get-NormalizedEnvFingerprint $desiredContainer.environment)) {
        return $false
    }

    $existingLogs = ($container.logConfiguration.options | ConvertTo-Json -Compress -Depth 4)
    $desiredLogs = ($desiredContainer.logConfiguration.options | ConvertTo-Json -Compress -Depth 4)
    if ($existingLogs -ne $desiredLogs) { return $false }

    if ((Get-NormalizedHealthCheckFingerprint $container.healthCheck) -ne (Get-NormalizedHealthCheckFingerprint $desiredContainer.healthCheck)) {
        return $false
    }

    return $true
}

function Register-OrReuseTaskDefinition {
    $desired = Get-DesiredTaskDefinitionObject
    $desiredJson = ($desired | ConvertTo-Json -Compress -Depth 10)
    Test-TaskDefinitionJsonSecrets -JsonContent $desiredJson

    $latest = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-task-definition", "--region", $script:Region,
        "--task-definition", $script:TaskDefinitionFamily,
        "--query", "taskDefinition"
    ) -AllowFailure

    if ($latest -and (Compare-TaskDefinition -Existing $latest -Desired $desired)) {
        Write-D08Log "Reusing compatible task definition revision $($latest.revision)"
        $script:TaskDefinitionArn = $latest.taskDefinitionArn
        $script:TaskDefinitionRevision = [int]$latest.revision
        $script:TaskDefinitionStatus = $latest.status
        $script:TaskDefinitionRegisteredAt = $latest.registeredAt
        return
    }

    Write-D08Log "Registering new task definition revision for $($script:TaskDefinitionFamily)"
    $file = New-AwsCliJsonFile -JsonContent $desiredJson
    $registered = Invoke-AwsJson -AwsArgs @(
        "ecs", "register-task-definition", "--region", $script:Region,
        "--cli-input-json", $file
    )
    $td = $registered.taskDefinition
    $script:TaskDefinitionArn = $td.taskDefinitionArn
    $script:TaskDefinitionRevision = [int]$td.revision
    $script:TaskDefinitionStatus = $td.status
    $script:TaskDefinitionRegisteredAt = $td.registeredAt
}

function Test-NoEcsServiceOrTasks {
    $services = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-services", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($services.serviceArns -and $services.serviceArns.Count -gt 0) {
        Stop-D08 "ECS services already exist on cluster; D08 must not create services"
    }
}

function Write-Inventory {
    param($ExistingInventory)

    $ecs = [ordered]@{
        clusterName              = $script:ClusterName
        clusterArn               = $script:ClusterArn
        containerInsights        = [bool]$script:ContainerInsights
        applicationTaskRoleArn   = $script:TaskRoleArn
        executionRoleName        = $script:ExecutionRoleName
        executionRoleArn         = $script:ExecutionRoleArn
        taskDefinitionFamily     = $script:TaskDefinitionFamily
        taskDefinitionArn        = $script:TaskDefinitionArn
        taskDefinitionRevision   = $script:TaskDefinitionRevision
        cpu                      = $script:TaskCpu
        memory                   = $script:TaskMemory
        networkMode              = "awsvpc"
        runtimePlatform          = [ordered]@{
            operatingSystem = "LINUX"
            cpuArchitecture = "X86_64"
        }
        containerName            = $script:ContainerName
        containerPort            = $script:ContainerPort
        imageDigest              = $script:CanonicalImageDigest
        imageUri                 = $script:PinnedImage
        serviceCreated           = $false
        taskRun                  = $false
    }

    $logging = [ordered]@{
        backendLogGroup = $script:LogGroupName
        retentionDays   = $script:LogRetentionDays
    }

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }
    $inventory.environment = $script:Environment
    $inventory.region = $script:Region
    $inventory.accountId = $script:AccountId
    $inventory.ecs = $ecs
    $inventory.logging = $logging

    ($inventory | ConvertTo-Json -Depth 12) | Set-Content -Path $script:InventoryFile -Encoding utf8
    Write-D08Log "Wrote inventory: $($script:InventoryFile)"
}

# --- Main ---
Test-CommandExists "aws"

$script:Region = Get-ResolvedRegion
if ($script:Region -ne "us-east-1") { Stop-D08 "Region must be us-east-1" }

$identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
$script:AccountId = $identity.Account
$script:CallerArn = $identity.Arn
if ($script:AccountId -ne $script:ExpectedAccountId) {
    Stop-D08 "Expected account $($script:ExpectedAccountId)"
}

Write-D08Log "Using region: $($script:Region)"
Write-D08Log "AWS account: $($script:AccountId)"
Write-D08Log "Caller: $($script:CallerArn)"

$inventory = Read-Inventory
Test-InventoryPrerequisites -Inventory $inventory
Test-LivePrerequisites
Test-CanonicalEcrImage
New-OrReuseCluster
New-OrReuseLogGroup
New-OrReuseExecutionRole
Test-ApplicationTaskRole
Register-OrReuseTaskDefinition
Test-NoEcsServiceOrTasks
Write-Inventory -ExistingInventory $inventory

Write-D08Log "AWS-D08 ECS runtime foundation complete (no service, no task run)."
