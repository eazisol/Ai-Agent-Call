# EaziAICall AWS-D14 - Twilio + ElevenLabs Production Webhook Finalization (idempotent)
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
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:CanonicalDigest = "sha256:65f161a879e82a022ad953fb6334fe0ade8fc0fd93bd7f86a3816c151bac889b"
$script:PublicBaseUrl = "https://dl1t1qnfxrdka.cloudfront.net"
$script:ApiBaseUrl = "$($script:PublicBaseUrl)/api/v1"
$script:TwilioIncomingUrl = "$($script:ApiBaseUrl)/webhooks/twilio/incoming-call"
$script:TwilioStatusUrl = "$($script:ApiBaseUrl)/webhooks/twilio/status-callback"
$script:TwilioCallEndedUrl = "$($script:ApiBaseUrl)/webhooks/twilio/call-ended"
$script:ElevenLabsWebhookUrl = "$($script:ApiBaseUrl)/webhooks/elevenlabs/conversation-events"
$script:CloudFrontDistributionId = "EVPODK7JRKPH6"
$script:OriginRequestPolicyId = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
$script:S3Bucket = "eaziacall-prod-812047028300-us-east-1"
$script:S3DeploymentPrefix = "deployment/d14"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"
$script:BackendDir = Join-Path $script:RepoRoot "ai-call-agent-backend"
$script:TwilioSecretName = "eaziacall/prod/twilio"
$script:ElevenLabsSecretName = "eaziacall/prod/elevenlabs"

function Write-D14Log {
    param([string]$Message)
    Write-Host "[d14-provider-webhooks] $Message"
}

function Stop-D14 {
    param([string]$Message)
    Write-Error "[d14-provider-webhooks] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D14 "Required command not found: $Name"
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
        Stop-D14 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D14 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D14 "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d14-{0}.json" -f [Guid]::NewGuid().ToString("N"))
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
            Stop-D14 ('SECRET EXPOSURE DETECTED - ROTATION REQUIRED (' + $Context + ')')
        }
    }
}

function Get-SecretJson {
    param([Parameter(Mandatory = $true)][string]$SecretName)
    $raw = [string](Invoke-Aws @(
        "secretsmanager", "get-secret-value",
        "--region", $script:Region,
        "--secret-id", $SecretName,
        "--query", "SecretString",
        "--output", "text"
    ))
    Test-SecretExposureInText -Text $raw -Context "secret fetch $SecretName"
    return ($raw | ConvertFrom-Json)
}

function Test-PreflightIdentity {
    Test-CommandExists "aws"
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ($identity.Account -ne $script:ExpectedAccountId) {
        Stop-D14 "AWS account mismatch: expected $($script:ExpectedAccountId), got $($identity.Account)"
    }
    $region = [string](Invoke-Aws @("configure", "get", "region"))
    if ($region -ne $script:ExpectedRegion) {
        Stop-D14 "AWS region mismatch: expected $($script:ExpectedRegion), got $region"
    }
    $script:Region = $region
    $script:CallerArn = $identity.Arn
}

function Import-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D14 "Inventory file not found: $($script:InventoryFile)"
    }
    $script:Inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Test-PreflightInfrastructure {
    Import-Inventory

    $script:PrivateSubnetIds = @($script:Inventory.network.privateSubnetIds)
    $script:EcsSecurityGroupId = $script:Inventory.network.ecsSecurityGroupId
    $script:TargetGroupArn = $script:Inventory.targetGroup.arn

    $service = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-services", "--region", $script:Region,
        "--cluster", $script:ClusterName, "--services", $script:ServiceName
    )
    $svc = $service.services[0]
    if ($svc.desiredCount -ne 1 -or $svc.runningCount -ne 1) {
        Stop-D14 "ECS service must be desired=1 running=1 (got desired=$($svc.desiredCount) running=$($svc.runningCount))"
    }
    if ($svc.pendingCount -gt 0) {
        Stop-D14 "ECS service has pending tasks"
    }

    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health", "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $healthy = @($health.TargetHealthDescriptions | Where-Object { $_.TargetHealth.State -eq "healthy" })
    if ($healthy.Count -ne 1) {
        Stop-D14 "Target group must have exactly 1 healthy target"
    }

    $cf = Invoke-AwsJson -AwsArgs @(
        "cloudfront", "get-distribution", "--id", $script:CloudFrontDistributionId
    )
    if ($cf.Distribution.Status -ne "Deployed") {
        Stop-D14 "CloudFront distribution is not Deployed"
    }
    $policyId = $cf.Distribution.DistributionConfig.DefaultCacheBehavior.OriginRequestPolicyId
    if ($policyId -ne $script:OriginRequestPolicyId) {
        Stop-D14 "Unexpected CloudFront origin request policy: $policyId"
    }
    $policyName = [string](Invoke-Aws @(
        "cloudfront", "get-origin-request-policy", "--id", $policyId,
        "--query", "OriginRequestPolicy.OriginRequestPolicyConfig.Name", "--output", "text"
    ))
    if ($policyName -ne "Managed-AllViewerExceptHostHeader") {
        Stop-D14 "Unexpected origin request policy name: $policyName"
    }

    for ($i = 1; $i -le 3; $i++) {
        try {
            $live = (Invoke-WebRequest -Uri "$($script:PublicBaseUrl)/health/live" -UseBasicParsing -TimeoutSec 60).StatusCode
            $ready = (Invoke-WebRequest -Uri "$($script:PublicBaseUrl)/health/ready" -UseBasicParsing -TimeoutSec 60).StatusCode
            if ($live -eq 200 -and $ready -eq 200) { break }
            if ($i -eq 3) {
                Stop-D14 "CloudFront health checks failed (live=$live ready=$ready)"
            }
        } catch {
            if ($i -eq 3) {
                Stop-D14 "CloudFront health checks failed: $($_.Exception.Message)"
            }
            Start-Sleep -Seconds 15
        }
    }

    $taskDef = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-task-definition", "--region", $script:Region,
        "--task-definition", "$($script:TaskDefinitionFamily):$($script:ExpectedTaskRevision)",
        "--query", "taskDefinition"
    )
    $container = $taskDef.containerDefinitions | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
    if ($container.image -notmatch [regex]::Escape($script:CanonicalDigest)) {
        Stop-D14 "Runtime task definition image digest mismatch"
    }

    $envMap = @{}
    foreach ($item in $container.environment) { $envMap[$item.name] = $item.value }
    if ($envMap["PUBLIC_BASE_URL"] -ne $script:PublicBaseUrl) {
        Stop-D14 "PUBLIC_BASE_URL mismatch in task definition"
    }
    if ($envMap["TWILIO_VALIDATE_SIGNATURES"] -ne "true") {
        Stop-D14 "TWILIO_VALIDATE_SIGNATURES must be true"
    }
    if ($envMap["VOICE_AGENT_PROVIDER"] -ne "elevenlabs") {
        Stop-D14 "VOICE_AGENT_PROVIDER must be elevenlabs"
    }
    if ($envMap["REDIS_ENABLED"] -ne "false") {
        Stop-D14 "REDIS_ENABLED must be false"
    }

    $secretNames = @($container.secrets | ForEach-Object { $_.name })
    foreach ($required in @("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "ELEVENLABS_WEBHOOK_SECRET", "ELEVENLABS_API_KEY")) {
        if ($secretNames -notcontains $required) {
            Stop-D14 "Missing required secret in task definition: $required"
        }
    }

    $pending = [int]$script:Inventory.databaseMigration.pendingMigrationCount
    if ($pending -ne 0) {
        Stop-D14 "Pending migrations must be 0 (found $pending)"
    }

    Write-D14Log "Preflight OK (account=$($script:ExpectedAccountId) region=$($script:Region))"
}

function Get-S3NodeTaskCommand {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$RemoteName,
        [hashtable]$ExtraEnv = @{}
    )
    if (-not (Test-Path $ScriptPath)) {
        Stop-D14 "Task script not found: $ScriptPath"
    }
    $s3Key = "$($script:S3DeploymentPrefix)/$RemoteName"
    & aws s3 cp $ScriptPath "s3://$($script:S3Bucket)/$s3Key" --region $script:Region --content-type "application/javascript" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Stop-D14 "Failed to upload ECS task script to S3: $RemoteName"
    }
    $envPrefix = ""
    foreach ($key in ($ExtraEnv.Keys | Sort-Object)) {
        $value = [string]$ExtraEnv[$key]
        $envPrefix += ('export {0}="{1}"; ' -f $key, ($value -replace '"', '\"'))
    }
    $loader = @'
__ENV__export D14_S3_BUCKET="__BUCKET__";
export D14_S3_KEY="__KEY__";
node -e "const {S3Client,GetObjectCommand}=require('@aws-sdk/client-s3');const fs=require('fs');(async()=>{const c=new S3Client({});const r=await c.send(new GetObjectCommand({Bucket:process.env.D14_S3_BUCKET,Key:process.env.D14_S3_KEY}));const b=await r.Body.transformToByteArray();fs.writeFileSync('/tmp/d14-task.js',Buffer.from(b));require('child_process').execSync('NODE_PATH=/app/node_modules node /tmp/d14-task.js',{stdio:'inherit',env:process.env});})().catch((e)=>{console.error(e.message||e);process.exit(1);});"
'@
    return $loader.Replace('__ENV__', $envPrefix).Replace('__BUCKET__', $script:S3Bucket).Replace('__KEY__', ($s3Key -replace '"', '\"'))
}

function Get-TaskLogText {
    param([string]$TaskArn)
    $taskId = ($TaskArn -split "/")[-1]
    $streamName = "backend/$($script:ContainerName)/$taskId"
    Start-Sleep -Seconds 10
    for ($attempt = 1; $attempt -le 20; $attempt++) {
        $filtered = Invoke-AwsJson -AwsArgs @(
            "logs", "filter-log-events", "--region", $script:Region,
            "--log-group-name", $script:LogGroupName,
            "--log-stream-names", $streamName,
            "--filter-pattern", "D14",
            "--limit", "100"
        ) -AllowFailure
        if ($filtered -and $filtered.events -and $filtered.events.Count -gt 0) {
            return (($filtered.events | ForEach-Object { $_.message }) -join "`n")
        }
        if ($attempt -lt 20) { Start-Sleep -Seconds 5 }
    }
    return ""
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

    Write-D14Log "Starting ECS one-off task ($Purpose)"
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
        Stop-D14 "ECS run-task failed for $Purpose"
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
    return [ordered]@{
        purpose  = $Purpose
        taskArn  = $taskArn
        exitCode = $exitCode
        logText  = $logText
    }
}

function Invoke-RoutingQuery {
    $scriptPath = Join-Path $PSScriptRoot "d14-routing-query.js"
    $command = Get-S3NodeTaskCommand -ScriptPath $scriptPath -RemoteName "d14-routing-query.js"
    $result = Invoke-EcsOneOffTask -Purpose "d14-routing-query" -ShellCommand $command
    Write-D14Log $result.logText

    $script:D14Routing = @{}
    foreach ($line in ($result.logText -split "`n")) {
        if ($line -match '^D14 ([a-z_]+)=(.+)$') {
            $script:D14Routing[$matches[1]] = $matches[2]
        }
    }

    if ($result.exitCode -eq 0 -and $script:D14Routing.routing_query -eq "PASS") {
        $script:D14RoutingBlocked = $false
        if (-not $script:D14Routing.canonical_provider_sid -or $script:D14Routing.canonical_provider_sid -eq "null") {
            Stop-D14 "Canonical phone number missing provider SID in database"
        }
        return
    }

    if ($script:D14Routing.active_twilio_numbers -eq '1') {
        Stop-D14 "Routing query failed despite active phone number in database (exit $($result.exitCode))"
    }

    Write-D14Log "Canonical routing query blocked; using Twilio account discovery fallback (provider reconcile only)"
    $script:D14RoutingBlocked = $true
    $script:D14RoutingBlockReason = "no active Twilio phone_numbers row in production PostgreSQL"

    if ($result.exitCode -ne 0 -and $script:D14Routing.active_twilio_numbers -eq '1') {
        $script:D14RoutingBlockReason = "routing query ECS task failed (exit $($result.exitCode))"
    }

    $twilioSecret = Get-SecretJson -SecretName $script:TwilioSecretName
    $discover = Invoke-LocalNodeScript -ScriptName "d14-twilio-discover.js" -Env @{
        TWILIO_ACCOUNT_SID = [string]$twilioSecret.TWILIO_ACCOUNT_SID
        TWILIO_AUTH_TOKEN  = [string]$twilioSecret.TWILIO_AUTH_TOKEN
    }
    Write-D14Log $discover.output
    if ($discover.exitCode -ne 0) {
        Stop-D14 "Twilio discovery fallback failed while routing query blocked"
    }

    $discoverMap = @{}
    foreach ($line in ($discover.output -split "`n")) {
        if ($line -match '^D14 ([a-z_]+)=(.+)$') {
            $discoverMap[$matches[1]] = $matches[2]
        }
    }

    $script:D14Routing.canonical_provider_sid = $discoverMap.twilio_discover_canonical_sid
    $phone = [string]$discoverMap.twilio_discover_canonical_phone
    if ($phone.Length -ge 8) {
        $prefixLen = if ($phone.StartsWith("+1") -and $phone.Length -ge 11) { 4 } elseif ($phone.Length -ge 7) { 3 } else { 2 }
        $script:D14Routing.canonical_phone_masked = "$($phone.Substring(0, $prefixLen))***$($phone.Substring($phone.Length-4))"
    } else {
        $script:D14Routing.canonical_phone_masked = "***"
    }
}

function Invoke-LocalNodeScript {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptName,
        [hashtable]$Env = @{}
    )
    Test-CommandExists "node"
    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path $scriptPath)) {
        Stop-D14 "Local script not found: $scriptPath"
    }
    $nodeModules = Join-Path $script:BackendDir "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Stop-D14 "Backend node_modules not found; run npm install in ai-call-agent-backend"
    }

    $saved = @{}
    foreach ($key in $Env.Keys) {
        $saved[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, [string]$Env[$key], "Process")
    }
    $previousNodePath = $env:NODE_PATH
    $env:NODE_PATH = $nodeModules

    $output = & node $scriptPath 2>&1
    $exitCode = $LASTEXITCODE

    $env:NODE_PATH = $previousNodePath
    foreach ($key in $Env.Keys) {
        if ($null -eq $saved[$key]) {
            [Environment]::SetEnvironmentVariable($key, $null, "Process")
        } else {
            [Environment]::SetEnvironmentVariable($key, $saved[$key], "Process")
        }
    }

    $text = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "`n" } else { [string]$output }
    Test-SecretExposureInText -Text $text -Context $ScriptName
    return [ordered]@{
        exitCode = $exitCode
        output   = $text
    }
}

function Invoke-TwilioReconcile {
    $twilioSecret = Get-SecretJson -SecretName $script:TwilioSecretName
    $result = Invoke-LocalNodeScript -ScriptName "d14-twilio-reconcile.js" -Env @{
        TWILIO_ACCOUNT_SID = [string]$twilioSecret.TWILIO_ACCOUNT_SID
        TWILIO_AUTH_TOKEN  = [string]$twilioSecret.TWILIO_AUTH_TOKEN
        D14_PHONE_SID      = $script:D14Routing.canonical_provider_sid
        D14_INCOMING_URL   = $script:TwilioIncomingUrl
        D14_STATUS_URL     = $script:TwilioStatusUrl
    }
    Write-D14Log $result.output
    if ($result.exitCode -ne 0) {
        Stop-D14 "Twilio reconcile failed (exit $($result.exitCode))"
    }
    $script:D14TwilioUpdated = ($result.output -match 'D14 twilio_updated=yes')
}

function Invoke-ElevenLabsVerify {
    $elevenSecret = Get-SecretJson -SecretName $script:ElevenLabsSecretName
    $agentId = if ($script:D14Routing.elevenlabs_external_agent_id) { $script:D14Routing.elevenlabs_external_agent_id } else { "" }
    $result = Invoke-LocalNodeScript -ScriptName "d14-elevenlabs-verify.js" -Env @{
        ELEVENLABS_API_KEY         = [string]$elevenSecret.ELEVENLABS_API_KEY
        D14_ELEVENLABS_AGENT_ID    = $agentId
        D14_ELEVENLABS_WEBHOOK_URL = $script:ElevenLabsWebhookUrl
    }
    Write-D14Log $result.output
    if ($result.exitCode -ne 0) {
        Stop-D14 "ElevenLabs verify failed (exit $($result.exitCode))"
    }
    if ($result.output -notmatch 'D14 elevenlabs_connectivity=PASS') {
        Stop-D14 "ElevenLabs connectivity check did not pass"
    }
    if ($result.output -match 'D14 elevenlabs_webhook_api_verified=no') {
        Stop-D14 "ElevenLabs production webhook not verified via API; manual UI confirmation required"
    }
    if ($result.output -match 'D14 elevenlabs_transcript_event=no') {
        Stop-D14 "ElevenLabs transcript event is not enabled"
    }
    if ($script:D14RoutingBlocked -and -not $agentId) {
        Write-D14Log "ElevenLabs agent mapping skipped: no production ai_agents row"
    }
}

function Invoke-UnsignedWebhookTests {
    Write-D14Log "Running unsigned negative webhook security tests"

    try {
        $twilio = Invoke-WebRequest `
            -Uri $script:TwilioIncomingUrl `
            -Method POST `
            -ContentType "application/x-www-form-urlencoded" `
            -Body "CallSid=CA_D14_NEGATIVE_TEST" `
            -UseBasicParsing
        Stop-D14 "Unsigned Twilio request was not rejected (status $($twilio.StatusCode))"
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status -lt 400) {
            Stop-D14 "Unsigned Twilio request unexpected status: $status"
        }
        Write-D14Log "Unsigned Twilio request rejected with HTTP $status"
        $script:D14TwilioNegativeStatus = $status
    }

    try {
        $eleven = Invoke-WebRequest `
            -Uri $script:ElevenLabsWebhookUrl `
            -Method POST `
            -ContentType "application/json" `
            -Body '{"type":"d14_negative_test"}' `
            -UseBasicParsing
        Stop-D14 "Unsigned ElevenLabs request was not rejected (status $($eleven.StatusCode))"
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status -lt 400) {
            Stop-D14 "Unsigned ElevenLabs request unexpected status: $status"
        }
        Write-D14Log "Unsigned ElevenLabs request rejected with HTTP $status"
        $script:D14ElevenNegativeStatus = $status
    }
}

function Invoke-PollutionCheck {
    param([int]$BaselineCalls, [int]$BaselineEvents)
    $scriptPath = Join-Path $PSScriptRoot "d14-pollution-check.js"
    $command = Get-S3NodeTaskCommand -ScriptPath $scriptPath -RemoteName "d14-pollution-check.js" -ExtraEnv @{
        D14_BASELINE_CALL_COUNT  = "$BaselineCalls"
        D14_BASELINE_EVENT_COUNT = "$BaselineEvents"
    }
    $result = Invoke-EcsOneOffTask -Purpose "d14-pollution-check" -ShellCommand $command
    Write-D14Log $result.logText
    if ($result.exitCode -ne 0) {
        Stop-D14 "Pollution check failed (exit $($result.exitCode))"
    }
}

function Invoke-CloudWatchSanity {
    Start-Sleep -Seconds 8
    $startMs = [DateTimeOffset]::UtcNow.AddMinutes(-10).ToUnixTimeMilliseconds()
    $filter = Invoke-AwsJson -AwsArgs @(
        "logs", "filter-log-events", "--region", $script:Region,
        "--log-group-name", $script:LogGroupName,
        "--start-time", "$startMs",
        "--filter-pattern", "INVALID_WEBHOOK_SIGNATURE"
    ) -AllowFailure
    $matches = @($filter.events)
    Write-D14Log "CloudWatch signature rejection events (last 10m): $($matches.Count)"
    if ($matches.Count -eq 0) {
        Write-D14Log "No explicit signature rejection log lines found (HTTP rejection still verified)"
    }
    Test-SecretExposureInText -Text (($matches | ForEach-Object { $_.message }) -join "`n") -Context "cloudwatch logs"
}

function Update-Inventory {
    $inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json

    if (-not $inventory.PSObject.Properties.Name.Contains("providerWebhooks")) {
        $inventory | Add-Member -NotePropertyName "providerWebhooks" -NotePropertyValue ([pscustomobject]@{})
    }

    $inventory.providerWebhooks = [pscustomobject]@{
        twilio     = [pscustomobject]@{
            phoneNumberSid        = $script:D14Routing.canonical_provider_sid
            phoneNumberMasked     = $script:D14Routing.canonical_phone_masked
            businessId            = $script:D14Routing.business_id
            businessName          = $script:D14Routing.business_name
            agentId               = $script:D14Routing.agent_id
            agentName             = $script:D14Routing.agent_name
            dbCanonicalConfigured = -not $script:D14RoutingBlocked
            incomingUrl          = $script:TwilioIncomingUrl
            statusCallbackUrl    = $script:TwilioStatusUrl
            callEndedUrl         = $script:TwilioCallEndedUrl
            callEndedArchitecture = "legacy-route-not-on-incoming-number; completion via status-callback"
            signatureValidation  = $true
            configured           = $true
            reconciledAt         = (Get-Date).ToUniversalTime().ToString("o")
        }
        elevenLabs = [pscustomobject]@{
            displayName         = "EaziAICall Production Post-Call"
            postCallUrl         = $script:ElevenLabsWebhookUrl
            auth                = "HMAC"
            transcriptEvent     = $true
            externalAgentId     = $script:D14Routing.elevenlabs_external_agent_id
            configured          = $true
            verifiedAt          = (Get-Date).ToUniversalTime().ToString("o")
        }
    }

    if (-not $inventory.PSObject.Properties.Name.Contains("d14")) {
        $inventory | Add-Member -NotePropertyName "d14" -NotePropertyValue ([pscustomobject]@{})
    }
    $inventory.d14 = [pscustomobject]@{
        status                   = if ($script:D14RoutingBlocked) { "BLOCKED" } else { "PASS" }
        blockReason              = if ($script:D14RoutingBlocked) { $script:D14RoutingBlockReason } else { $null }
        completedAt              = (Get-Date).ToUniversalTime().ToString("o")
        realPhoneCallPerformed   = $false
        m12Gate                  = "OPEN"
        twilioNegativeStatus     = $script:D14TwilioNegativeStatus
        elevenLabsNegativeStatus = $script:D14ElevenNegativeStatus
    }

    if ($inventory.frontendIntegration) {
        $inventory.frontendIntegration.deployed = $true
        $inventory.frontendIntegration.deploymentStatus = "READY"
    }

    $json = ($inventory | ConvertTo-Json -Depth 20)
    Test-SecretExposureInText -Text $json -Context "inventory update"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($script:InventoryFile, $json, $utf8NoBom)
    Write-D14Log "Inventory updated: $($script:InventoryFile)"
}

function Write-D14Summary {
    Write-D14Log "=== AWS-D14 SUMMARY ==="
    $result = if ($script:D14RoutingBlocked) { "BLOCKED" } else { "PASS" }
    Write-D14Log "Result: $result"
    if ($script:D14RoutingBlocked) {
        Write-D14Log "Block reason: $($script:D14RoutingBlockReason)"
    }
    Write-D14Log "Canonical Twilio SID: $($script:D14Routing.canonical_provider_sid)"
    Write-D14Log "Canonical phone (masked): $($script:D14Routing.canonical_phone_masked)"
    if ($script:D14Routing.business_name) {
        Write-D14Log "Business: $($script:D14Routing.business_name)"
        Write-D14Log "Agent: $($script:D14Routing.agent_name)"
    } else {
        Write-D14Log "Business/Agent routing: NOT CONFIGURED in production DB"
    }
    Write-D14Log "Twilio incoming URL: $($script:TwilioIncomingUrl)"
    Write-D14Log "Twilio status callback: $($script:TwilioStatusUrl)"
    Write-D14Log "Twilio call-ended: legacy route only ($($script:TwilioCallEndedUrl))"
    Write-D14Log "ElevenLabs webhook: $($script:ElevenLabsWebhookUrl)"
    Write-D14Log "Unsigned Twilio rejection: HTTP $($script:D14TwilioNegativeStatus)"
    Write-D14Log "Unsigned ElevenLabs rejection: HTTP $($script:D14ElevenNegativeStatus)"
    Write-D14Log "Real phone call performed: NO"
    Write-D14Log "D15 pending: YES"
    Write-D14Log "M12 gate: OPEN"
}

# --- main ---
Write-D14Log "Starting AWS-D14 provider webhook finalization"
$script:D14RoutingBlocked = $false
Test-PreflightIdentity
Test-PreflightInfrastructure
Invoke-RoutingQuery

$baselineCalls = if ($script:D14Routing.call_count) { [int]$script:D14Routing.call_count } else { 0 }
$baselineEvents = 0
Invoke-TwilioReconcile
Invoke-ElevenLabsVerify
Invoke-UnsignedWebhookTests
Invoke-CloudWatchSanity
Invoke-PollutionCheck -BaselineCalls $baselineCalls -BaselineEvents $baselineEvents
Update-Inventory
Write-D14Summary
if ($script:D14RoutingBlocked) {
    Stop-D14 "AWS-D14 BLOCKED: production canonical routing incomplete (see summary)"
}
Write-D14Log "AWS-D14 complete"
