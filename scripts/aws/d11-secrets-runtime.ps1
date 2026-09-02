# EaziAICall AWS-D11 - Production Secrets + Runtime Task Definition (idempotent, NO ECS service/task)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:ExpectedAccountId = "812047028300"
$script:ExecutionRoleName = "eaziacall-prod-ecs-execution-role"
$script:SecretsPolicyName = "eaziacall-prod-ecs-secrets-access"
$script:TaskDefinitionFamily = "eaziacall-prod-backend"
$script:ContainerName = "backend"
$script:ContainerPort = 3000
$script:TaskCpu = "512"
$script:TaskMemory = "1024"
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:ProductionVoiceAgentProvider = "elevenlabs"
$script:DefaultFrontendUrl = "https://eazi-ai-call.vercel.app"
$script:DefaultPublicBaseUrl = "https://dl1t1qnfxrdka.cloudfront.net"
$script:LocalEnvPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "../../ai-call-agent-backend")).Path ".env"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Test-OpenAiRequiredForProduction {
    return ($script:ProductionVoiceAgentProvider -eq "openai_realtime")
}

function Write-D11Log {
    param([string]$Message)
    Write-Host "[d11-secrets-runtime] $Message"
}

function Stop-D11 {
    param([string]$Message)
    Write-Error "[d11-secrets-runtime] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D11 "Required command not found: $Name"
    }
}

function Normalize-AwsText {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq "None") { return "" }
    return $Value.Trim().Trim('"')
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
        Stop-D11 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D11 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D11 "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d11-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function New-SecureRandomString {
    param([int]$Length = 64)
    $bytes = New-Object byte[] $Length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Substring(0, [Math]::Min($Length, 64))
}

function Read-DotEnvFile {
    param([string]$Path)
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    foreach ($line in Get-Content -Path $Path -Encoding UTF8) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^\s*([^=]+)=(.*)$') {
            $map[$matches[1].Trim()] = Normalize-AwsText $matches[2]
        }
    }
    return $map
}

function Get-SecretSourceValue {
    param([string]$Name, $DotEnv)
    $process = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($process)) { return $process.Trim() }
    if ($DotEnv.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($DotEnv[$Name])) {
        return $DotEnv[$Name]
    }
    return ""
}

function Test-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    if ($Value -match '^(replace-with|changeme|dummy|production-secret)') { return $true }
    return $false
}

function Resolve-FrontendUrl {
    param($DotEnv)
    $override = Normalize-AwsText ([Environment]::GetEnvironmentVariable("EAZI_PRODUCTION_FRONTEND_URL"))
    if ($override) {
        if ($override -notmatch '^https://[^/]+\.vercel\.app$') {
            Stop-D11 "EAZI_PRODUCTION_FRONTEND_URL must be https://<project>.vercel.app without trailing slash"
        }
        return $override
    }
    if ($script:DefaultFrontendUrl -match '^https://[^/]+\.vercel\.app$') {
        return $script:DefaultFrontendUrl
    }
    foreach ($key in @("AUTH_PUBLIC_APP_URL", "CORS_ORIGINS")) {
        $raw = Get-SecretSourceValue -Name $key -DotEnv $DotEnv
        if ([string]::IsNullOrWhiteSpace($raw)) { continue }
        $first = ($raw -split ',')[0].Trim()
        if ($first -match '^https://[^/]+\.vercel\.app$') {
            return $first
        }
    }
    return ""
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText ((& aws configure get region 2>$null))
    if ($configured) { return $configured }
    Stop-D11 "AWS region is not configured."
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) { Stop-D11 "Inventory not found" }
    return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Test-PreflightIdentity {
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ($identity.Account -ne $script:ExpectedAccountId) { Stop-D11 "Unexpected AWS account" }
    $script:Region = Get-ResolvedRegion
    if ($script:Region -ne "us-east-1") { Stop-D11 "Unexpected region" }
    $script:CallerArn = $identity.Arn
    Write-D11Log "Using region: $($script:Region)"
    Write-D11Log "AWS account: $($identity.Account)"
}

function Test-D10Prerequisite {
    param($Inventory)
    if (-not $Inventory.cloudFront.publicBaseUrl) {
        Stop-D11 "D10 prerequisite missing: cloudFront.publicBaseUrl (run d10-cloudfront.ps1 first)"
    }
    if ($Inventory.cloudFront.status -ne "Deployed") {
        Stop-D11 "CloudFront distribution is not Deployed"
    }
    if (-not $Inventory.backendImage.digest) {
        Stop-D11 "Inventory missing backendImage.digest (build/push new image before D11)"
    }
    if (-not $Inventory.backendImage.tag) {
        Stop-D11 "Inventory missing backendImage.tag"
    }

    $script:PublicBaseUrl = $Inventory.cloudFront.publicBaseUrl.TrimEnd('/')
    if ($script:PublicBaseUrl -ne $script:DefaultPublicBaseUrl) {
        Stop-D11 "Unexpected PUBLIC_BASE_URL: $($script:PublicBaseUrl)"
    }
    $script:CanonicalImageDigest = $Inventory.backendImage.digest
    $script:CanonicalImageUri = "812047028300.dkr.ecr.us-east-1.amazonaws.com/eaziacall-prod-backend@$($script:CanonicalImageDigest)"
    Write-D11Log "Using image digest from inventory: $($script:CanonicalImageDigest)"

    $script:AlbDns = $Inventory.cloudFront.originAlbDns
    $script:RdsSecretArn = $Inventory.database.masterSecretArn
    $script:DatabaseHost = $Inventory.database.endpoint
    $script:DatabaseUser = $Inventory.database.masterUsername
    $script:DatabaseName = $Inventory.database.databaseName
    $script:ObjectStorageBucket = $Inventory.objectStorage.bucketName
    $script:TaskRoleArn = $Inventory.ecs.applicationTaskRoleArn
    $script:ExecutionRoleArn = $Inventory.ecs.executionRoleArn
    $script:ClusterName = $Inventory.ecs.clusterName
    $script:TargetGroupArn = $Inventory.targetGroup.arn
    Write-D11Log "PUBLIC_BASE_URL=$($script:PublicBaseUrl)"
}

function Build-RequiredSecretMaterial {
    param($DotEnv)

    $missing = New-Object System.Collections.Generic.List[string]
    $material = @{}

    $frontendUrl = Resolve-FrontendUrl -DotEnv $DotEnv
    if ([string]::IsNullOrWhiteSpace($frontendUrl)) {
        $missing.Add("VERCEL_URL_REQUIRED")
    }
    else {
        $script:FrontendUrl = $frontendUrl
    }

    $voiceStream = Get-SecretSourceValue -Name "VOICE_STREAM_SIGNING_SECRET" -DotEnv $DotEnv
    if (Test-PlaceholderValue $voiceStream -or $voiceStream.Length -lt 32) {
        $voiceStream = New-SecureRandomString -Length 64
        Write-D11Log "Generated VOICE_STREAM_SIGNING_SECRET"
    }
    $material["VOICE_STREAM_SIGNING_SECRET"] = $voiceStream

    $authJwt = Get-SecretSourceValue -Name "AUTH_JWT_ACCESS_SECRET" -DotEnv $DotEnv
    if (Test-PlaceholderValue $authJwt -or $authJwt.Length -lt 32) {
        $authJwt = New-SecureRandomString -Length 64
        Write-D11Log "Generated AUTH_JWT_ACCESS_SECRET"
    }
    $material["AUTH_JWT_ACCESS_SECRET"] = $authJwt

    foreach ($name in @("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "ELEVENLABS_API_KEY", "SMTP_USER", "SMTP_PASSWORD")) {
        $value = Get-SecretSourceValue -Name $name -DotEnv $DotEnv
        if (Test-PlaceholderValue $value) { $missing.Add($name) }
        else { $material[$name] = $value }
    }

    foreach ($name in @("ELEVENLABS_WEBHOOK_SECRET")) {
        $value = Get-SecretSourceValue -Name $name -DotEnv $DotEnv
        if (Test-PlaceholderValue $value) { $missing.Add($name) }
        else { $material[$name] = $value }
    }

    if (Test-OpenAiRequiredForProduction) {
        $openAiKey = Get-SecretSourceValue -Name "OPENAI_API_KEY" -DotEnv $DotEnv
        if (Test-PlaceholderValue $openAiKey) { $missing.Add("OPENAI_API_KEY") }
        else { $material["OPENAI_API_KEY"] = $openAiKey }
    }

    Write-D11Log "Production VOICE_AGENT_PROVIDER=$($script:ProductionVoiceAgentProvider)"
    if (Test-OpenAiRequiredForProduction) {
        Write-D11Log "OPENAI_API_KEY is required for openai_realtime production provider"
    }
    else {
        Write-D11Log "OPENAI_API_KEY not required (M12 uses ElevenLabs inbound handoff; legacy OpenAI preserved in codebase)"
    }

    $material["SMTP_HOST"] = Get-SecretSourceValue -Name "SMTP_HOST" -DotEnv $DotEnv
    if (Test-PlaceholderValue $material["SMTP_HOST"]) { $missing.Add("SMTP_HOST") }
    $material["SMTP_FROM"] = Get-SecretSourceValue -Name "SMTP_FROM" -DotEnv $DotEnv
    if (Test-PlaceholderValue $material["SMTP_FROM"]) { $missing.Add("SMTP_FROM") }

    if ($missing.Count -gt 0) {
        $names = ($missing | Sort-Object -Unique) -join ", "
        Stop-D11 "AWS-D11 BLOCKED - missing required values: $names"
    }

    return $material
}

function New-OrUpdateJsonSecret {
    param(
        [string]$SecretName,
        [hashtable]$SecretObject,
        [string]$Description
    )
    $existing = Invoke-AwsJson -AwsArgs @(
        "secretsmanager", "describe-secret", "--region", $script:Region,
        "--secret-id", $SecretName
    ) -AllowFailure

    $secretString = ($SecretObject | ConvertTo-Json -Compress -Depth 4)
    $tempFile = Join-Path $env:TEMP ("d11-secret-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempFile, $secretString, $utf8NoBom)
    $secretFile = ("file://{0}" -f ($tempFile -replace '\\', '/'))

    if ($existing) {
        Write-D11Log "Updating secret $SecretName"
        Invoke-Aws -AwsArgs @(
            "secretsmanager", "put-secret-value", "--region", $script:Region,
            "--secret-id", $SecretName,
            "--secret-string", $secretFile
        ) | Out-Null
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        return $existing.ARN
    }

    Write-D11Log "Creating secret $SecretName"
    $created = Invoke-AwsJson -AwsArgs @(
        "secretsmanager", "create-secret", "--region", $script:Region,
        "--name", $SecretName,
        "--description", $Description,
        "--secret-string", $secretFile,
        "--tags",
        "Key=Project,Value=$($script:Project)",
        "Key=Environment,Value=$($script:Environment)",
        "Key=ManagedBy,Value=$($script:ManagedBy)"
    )
    Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    return $created.ARN
}

function Ensure-Secrets {
    param($Material)

    $script:SecretArns = [ordered]@{}
    $script:SecretArns.auth = New-OrUpdateJsonSecret -SecretName "eaziacall/prod/auth" -SecretObject @{
        AUTH_JWT_ACCESS_SECRET = $Material["AUTH_JWT_ACCESS_SECRET"]
    } -Description "EaziAICall production auth secrets"
    $script:SecretArns.smtp = New-OrUpdateJsonSecret -SecretName "eaziacall/prod/smtp" -SecretObject @{
        SMTP_USER     = $Material["SMTP_USER"]
        SMTP_PASSWORD = $Material["SMTP_PASSWORD"]
    } -Description "EaziAICall production SMTP credentials"
    $script:SecretArns.twilio = New-OrUpdateJsonSecret -SecretName "eaziacall/prod/twilio" -SecretObject @{
        TWILIO_ACCOUNT_SID = $Material["TWILIO_ACCOUNT_SID"]
        TWILIO_AUTH_TOKEN  = $Material["TWILIO_AUTH_TOKEN"]
    } -Description "EaziAICall production Twilio credentials"
    $script:SecretArns.elevenlabs = New-OrUpdateJsonSecret -SecretName "eaziacall/prod/elevenlabs" -SecretObject @{
        ELEVENLABS_API_KEY         = $Material["ELEVENLABS_API_KEY"]
        ELEVENLABS_WEBHOOK_SECRET  = $Material["ELEVENLABS_WEBHOOK_SECRET"]
    } -Description "EaziAICall production ElevenLabs credentials"
    $script:SecretArns.voice = New-OrUpdateJsonSecret -SecretName "eaziacall/prod/voice" -SecretObject @{
        VOICE_STREAM_SIGNING_SECRET = $Material["VOICE_STREAM_SIGNING_SECRET"]
    } -Description "EaziAICall production voice stream signing secret"
    $script:SecretArns.database = $script:RdsSecretArn

    if (Test-OpenAiRequiredForProduction) {
        $script:SecretArns.openai = New-OrUpdateJsonSecret -SecretName "eaziacall/prod/openai" -SecretObject @{
            OPENAI_API_KEY = $Material["OPENAI_API_KEY"]
        } -Description "EaziAICall production OpenAI API key"
    }

    $script:SmtpHost = $Material["SMTP_HOST"]
    $script:SmtpFrom = $Material["SMTP_FROM"]
}

function Ensure-ExecutionRoleSecretsPolicy {
    $secretArns = @(
        $script:SecretArns.database,
        $script:SecretArns.auth,
        $script:SecretArns.smtp,
        $script:SecretArns.twilio,
        $script:SecretArns.elevenlabs,
        $script:SecretArns.voice
    )
    if ($script:SecretArns.openai) {
        $secretArns += $script:SecretArns.openai
    }
    $resources = @($secretArns | Select-Object -Unique)

    $policyDoc = [ordered]@{
        Version   = "2012-10-17"
        Statement = @(
            [ordered]@{
                Sid      = "EcsSecretsRead"
                Effect   = "Allow"
                Action   = @("secretsmanager:GetSecretValue")
                Resource = $resources
            }
        )
    }
    $policyJson = ($policyDoc | ConvertTo-Json -Depth 6 -Compress)
    $policyFile = New-AwsCliJsonFile -JsonContent $policyJson
    $existingPolicy = Invoke-AwsJson -AwsArgs @(
        "iam", "get-policy", "--policy-arn", "arn:aws:iam::${script:ExpectedAccountId}:policy/$($script:SecretsPolicyName)"
    ) -AllowFailure

    if (-not $existingPolicy) {
        Write-D11Log "Creating IAM policy $($script:SecretsPolicyName)"
        Invoke-AwsJson -AwsArgs @(
            "iam", "create-policy",
            "--policy-name", $script:SecretsPolicyName,
            "--description", "Least-privilege Secrets Manager read for ECS execution role",
            "--policy-document", $policyFile
        ) | Out-Null
    }
    else {
        Write-D11Log "Updating IAM policy $($script:SecretsPolicyName)"
        $versions = Invoke-AwsJson -AwsArgs @(
            "iam", "list-policy-versions",
            "--policy-arn", "arn:aws:iam::${script:ExpectedAccountId}:policy/$($script:SecretsPolicyName)"
        )
        $nonDefault = @($versions.Versions | Where-Object { -not $_.IsDefaultVersion })
        foreach ($version in $nonDefault) {
            Invoke-Aws -AwsArgs @(
                "iam", "delete-policy-version",
                "--policy-arn", "arn:aws:iam::${script:ExpectedAccountId}:policy/$($script:SecretsPolicyName)",
                "--version-id", $version.VersionId
            ) -AllowFailure | Out-Null
        }
        Invoke-Aws -AwsArgs @(
            "iam", "create-policy-version",
            "--policy-arn", "arn:aws:iam::${script:ExpectedAccountId}:policy/$($script:SecretsPolicyName)",
            "--policy-document", $policyFile,
            "--set-as-default"
        ) | Out-Null
    }

    $attached = Invoke-AwsJson -AwsArgs @(
        "iam", "list-attached-role-policies", "--role-name", $script:ExecutionRoleName
    )
    $policyArn = "arn:aws:iam::${script:ExpectedAccountId}:policy/$($script:SecretsPolicyName)"
    if (-not ($attached.AttachedPolicies | Where-Object { $_.PolicyArn -eq $policyArn })) {
        Write-D11Log "Attaching secrets policy to execution role"
        Invoke-Aws -AwsArgs @(
            "iam", "attach-role-policy",
            "--role-name", $script:ExecutionRoleName,
            "--policy-arn", $policyArn
        ) | Out-Null
    }
}

function Get-SecretValueFromArn {
    param([string]$SecretArn, [string]$JsonKey)
    return "${SecretArn}:${JsonKey}::"
}

function Get-DatabasePasswordSecretRef {
    return "${script:RdsSecretArn}:password::"
}

function Test-TaskDefinitionJsonSecrets {
    param([string]$JsonContent)
    $forbiddenPatterns = @(
        '"name"\s*:\s*"DATABASE_PASSWORD"\s*,\s*"value"\s*:\s*"[^"]+"',
        '"name"\s*:\s*"AUTH_JWT_ACCESS_SECRET"\s*,\s*"value"\s*:\s*"[^"]+"',
        'AKIA[0-9A-Z]{16}',
        '"value"\s*:\s*"(changeme|dummy-secret|production-secret|replace-with)'
    )
    foreach ($pattern in $forbiddenPatterns) {
        if ($JsonContent -match $pattern) {
            Stop-D11 "SECRET EXPOSURE DETECTED in task definition environment"
        }
    }
    if ($JsonContent -match '"secrets"\s*:\s*\[\s*\]' -and $JsonContent -notmatch '"valueFrom"') {
        Stop-D11 "Task definition must include secrets[] ARN references"
    }
}

function Get-NormalizedEnvFingerprint {
    param($Environment)
    if (-not $Environment) { return "" }
    $pairs = @($Environment | ForEach-Object { "$($_.name)=$($_.value)" } | Sort-Object)
    return ($pairs -join "|")
}

function Get-NormalizedSecretsFingerprint {
    param($Secrets)
    if (-not $Secrets) { return "" }
    $pairs = @($Secrets | ForEach-Object { "$($_.name)=$($_.valueFrom)" } | Sort-Object)
    return ($pairs -join "|")
}

function Compare-TaskDefinition {
    param($Existing, $Desired)
    if ($Existing.cpu -ne $Desired.cpu) { return $false }
    if ($Existing.memory -ne $Desired.memory) { return $false }
    if ($Existing.taskRoleArn -ne $Desired.taskRoleArn) { return $false }
    if ($Existing.executionRoleArn -ne $Desired.executionRoleArn) { return $false }

    $container = $Existing.containerDefinitions[0]
    $desiredContainer = $Desired.containerDefinitions[0]
    if ($container.image -ne $desiredContainer.image) { return $false }

    if ((Get-NormalizedEnvFingerprint $container.environment) -ne (Get-NormalizedEnvFingerprint $desiredContainer.environment)) {
        return $false
    }
    if ((Get-NormalizedSecretsFingerprint $container.secrets) -ne (Get-NormalizedSecretsFingerprint $desiredContainer.secrets)) {
        return $false
    }
    return $true
}

function Register-OrReuseRuntimeTaskDefinition {
    $healthCmd = "node -e `"fetch('http://127.0.0.1:3000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))`""

    $environment = @(
        @{ name = "NODE_ENV"; value = "production" },
        @{ name = "PORT"; value = "3000" },
        @{ name = "LOG_LEVEL"; value = "log" },
        @{ name = "REDIS_ENABLED"; value = "false" },
        @{ name = "OBJECT_STORAGE_ENABLED"; value = "true" },
        @{ name = "OBJECT_STORAGE_REGION"; value = $script:Region },
        @{ name = "OBJECT_STORAGE_BUCKET"; value = $script:ObjectStorageBucket },
        @{ name = "DATABASE_HOST"; value = $script:DatabaseHost },
        @{ name = "DATABASE_PORT"; value = "5432" },
        @{ name = "DATABASE_USER"; value = $script:DatabaseUser },
        @{ name = "DATABASE_NAME"; value = $script:DatabaseName },
        @{ name = "DATABASE_SSL"; value = "true" },
        @{ name = "PUBLIC_BASE_URL"; value = $script:PublicBaseUrl },
        @{ name = "CORS_ORIGINS"; value = $script:FrontendUrl },
        @{ name = "AUTH_PUBLIC_APP_URL"; value = $script:FrontendUrl },
        @{ name = "TWILIO_VALIDATE_SIGNATURES"; value = "true" },
        @{ name = "PROTOTYPE_API_ENABLED"; value = "false" },
        @{ name = "INBOUND_CALL_DEV_STREAM_FALLBACK"; value = "false" },
        @{ name = "SMTP_HOST"; value = $script:SmtpHost },
        @{ name = "SMTP_PORT"; value = "587" },
        @{ name = "SMTP_SECURE"; value = "false" },
        @{ name = "SMTP_FROM"; value = $script:SmtpFrom },
        @{ name = "VOICE_AGENT_PROVIDER"; value = $script:ProductionVoiceAgentProvider },
        @{ name = "TELEPHONY_PROVIDER"; value = "twilio" }
    )

    $secrets = @(
        @{ name = "DATABASE_PASSWORD"; valueFrom = (Get-DatabasePasswordSecretRef) },
        @{ name = "AUTH_JWT_ACCESS_SECRET"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.auth -JsonKey "AUTH_JWT_ACCESS_SECRET") },
        @{ name = "SMTP_USER"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.smtp -JsonKey "SMTP_USER") },
        @{ name = "SMTP_PASSWORD"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.smtp -JsonKey "SMTP_PASSWORD") },
        @{ name = "TWILIO_ACCOUNT_SID"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.twilio -JsonKey "TWILIO_ACCOUNT_SID") },
        @{ name = "TWILIO_AUTH_TOKEN"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.twilio -JsonKey "TWILIO_AUTH_TOKEN") },
        @{ name = "ELEVENLABS_API_KEY"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.elevenlabs -JsonKey "ELEVENLABS_API_KEY") },
        @{ name = "ELEVENLABS_WEBHOOK_SECRET"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.elevenlabs -JsonKey "ELEVENLABS_WEBHOOK_SECRET") },
        @{ name = "VOICE_STREAM_SIGNING_SECRET"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.voice -JsonKey "VOICE_STREAM_SIGNING_SECRET") }
    )

    if ($script:SecretArns.openai) {
        $secrets += @{ name = "OPENAI_API_KEY"; valueFrom = (Get-SecretValueFromArn -SecretArn $script:SecretArns.openai -JsonKey "OPENAI_API_KEY") }
    }

    $desired = [ordered]@{
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
                image             = $script:CanonicalImageUri
                essential         = $true
                privileged        = $false
                portMappings      = @(@{ containerPort = $script:ContainerPort; hostPort = $script:ContainerPort; protocol = "tcp" })
                environment       = $environment
                secrets           = $secrets
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

    $desiredJson = ($desired | ConvertTo-Json -Compress -Depth 12)
    Test-TaskDefinitionJsonSecrets -JsonContent $desiredJson

    $latest = Invoke-AwsJson -AwsArgs @(
        "ecs", "describe-task-definition", "--region", $script:Region,
        "--task-definition", $script:TaskDefinitionFamily,
        "--query", "taskDefinition"
    ) -AllowFailure

    if ($latest -and (Compare-TaskDefinition -Existing $latest -Desired $desired)) {
        Write-D11Log "Reusing compatible runtime task definition revision $($latest.revision)"
        $script:RuntimeTaskDefinitionArn = $latest.taskDefinitionArn
        $script:RuntimeTaskDefinitionRevision = [int]$latest.revision
        return
    }

    Write-D11Log "Registering runtime task definition revision"
    $file = New-AwsCliJsonFile -JsonContent $desiredJson
    $registered = Invoke-AwsJson -AwsArgs @(
        "ecs", "register-task-definition", "--region", $script:Region,
        "--cli-input-json", $file
    )
    $script:RuntimeTaskDefinitionArn = $registered.taskDefinition.taskDefinitionArn
    $script:RuntimeTaskDefinitionRevision = [int]$registered.taskDefinition.revision
}

function Test-NoEcsServiceTasksOrTargets {
    $services = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-services", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($services.serviceArns -and $services.serviceArns.Count -gt 0) {
        Stop-D11 "ECS service must not exist during D11"
    }
    $tasks = Invoke-AwsJson -AwsArgs @(
        "ecs", "list-tasks", "--region", $script:Region,
        "--cluster", $script:ClusterName
    )
    if ($tasks.taskArns -and $tasks.taskArns.Count -gt 0) {
        Stop-D11 "ECS tasks must not run during D11"
    }
    $health = Invoke-AwsJson -AwsArgs @(
        "elbv2", "describe-target-health", "--region", $script:Region,
        "--target-group-arn", $script:TargetGroupArn
    )
    $count = 0
    if ($health.TargetHealthDescriptions) { $count = $health.TargetHealthDescriptions.Count }
    if ($count -ne 0) {
        Stop-D11 "Target group must remain at 0 registered targets"
    }
}

function Write-Inventory {
    param($ExistingInventory, [string]$VercelStatus)

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }

    $inventory["secrets"] = [ordered]@{
        database   = [ordered]@{ name = "rds-managed"; arn = $script:SecretArns.database; status = "reused" }
        auth       = [ordered]@{ name = "eaziacall/prod/auth"; arn = $script:SecretArns.auth; status = "configured" }
        smtp       = [ordered]@{ name = "eaziacall/prod/smtp"; arn = $script:SecretArns.smtp; status = "configured" }
        twilio     = [ordered]@{ name = "eaziacall/prod/twilio"; arn = $script:SecretArns.twilio; status = "configured" }
        elevenlabs = [ordered]@{ name = "eaziacall/prod/elevenlabs"; arn = $script:SecretArns.elevenlabs; status = "configured" }
        voice      = [ordered]@{ name = "eaziacall/prod/voice"; arn = $script:SecretArns.voice; status = "configured" }
        voiceAgentProvider = $script:ProductionVoiceAgentProvider
    }
    if ($script:SecretArns.openai) {
        $inventory["secrets"].openai = [ordered]@{ name = "eaziacall/prod/openai"; arn = $script:SecretArns.openai; status = "configured" }
    }

    $ecs = [ordered]@{}
    foreach ($prop in $ExistingInventory.ecs.PSObject.Properties) {
        $ecs[$prop.Name] = $prop.Value
    }
    $ecs.runtimeTaskDefinitionArn = $script:RuntimeTaskDefinitionArn
    $ecs.runtimeTaskDefinitionRevision = $script:RuntimeTaskDefinitionRevision
    $ecs.secretsConfigured = $true
    $ecs.serviceCreated = $false
    $ecs.taskRun = $false
    $ecs.publicBaseUrl = $script:PublicBaseUrl
    $ecs.frontendUrl = $script:FrontendUrl
    $ecs.vercelUrlStatus = $VercelStatus
    $ecs.voiceAgentProvider = $script:ProductionVoiceAgentProvider
    $ecs.imageDigest = $script:CanonicalImageDigest
    $ecs.imageUri = $script:CanonicalImageUri
    $ecs.taskDefinitionArn = $script:RuntimeTaskDefinitionArn
    $ecs.taskDefinitionRevision = $script:RuntimeTaskDefinitionRevision
    $inventory["ecs"] = $ecs

    $json = ($inventory | ConvertTo-Json -Depth 12)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($script:InventoryFile, $json, $utf8NoBom)
    Write-D11Log "Wrote inventory: $($script:InventoryFile)"
}

function Main {
    Test-CommandExists -Name "aws"
    Test-PreflightIdentity

    $inventory = Read-Inventory
    Test-D10Prerequisite -Inventory $inventory
    Test-NoEcsServiceTasksOrTargets

    $dotEnv = Read-DotEnvFile -Path $script:LocalEnvPath
    $material = Build-RequiredSecretMaterial -DotEnv $dotEnv

    Ensure-Secrets -Material $material
    Ensure-ExecutionRoleSecretsPolicy
    Register-OrReuseRuntimeTaskDefinition
    Test-NoEcsServiceTasksOrTargets
    Write-Inventory -ExistingInventory $inventory -VercelStatus "CONFIGURED"

    Write-D11Log "AWS-D11 secrets + runtime task definition complete (no ECS service, no migration)."
}

Main
