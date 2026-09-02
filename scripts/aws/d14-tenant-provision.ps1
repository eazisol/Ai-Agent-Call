# EaziAICall AWS-D14 - Production tenant routing remediation (idempotent)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:ExpectedAccountId = "812047028300"
$script:ExpectedRegion = "us-east-1"
$script:ClusterName = "eaziacall-prod-cluster"
$script:TaskDefinitionFamily = "eaziacall-prod-backend"
$script:ExpectedTaskRevision = 3
$script:ContainerName = "backend"
$script:LogGroupName = "/ecs/eaziacall-prod-backend"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"
$script:D14Script = Join-Path $script:RepoRoot "scripts/aws/d14-provider-webhooks.ps1"
$script:S3Bucket = "eaziacall-prod-812047028300-us-east-1"
$script:S3ScriptKey = "deployment/d14-tenant-provision.js"

function Write-D14Log {
    param([string]$Message)
    Write-Host "[d14-tenant-provision] $Message"
}

function Stop-D14 {
    param([string]$Message)
    Write-Error "[d14-tenant-provision] ERROR: $Message"
    exit 1
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
        Stop-D14 "AWS CLI failed: aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d14tp-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
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
            "--filter-pattern", "D14 provision",
            "--limit", "100"
        ) -AllowFailure
        if ($filtered -and $filtered.events -and $filtered.events.Count -gt 0) {
            return (($filtered.events | ForEach-Object { $_.message }) -join "`n")
        }
        if ($attempt -lt 20) { Start-Sleep -Seconds 5 }
    }
    return ""
}

Write-D14Log "Starting D14 tenant routing remediation"

$identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
if ($identity.Account -ne $script:ExpectedAccountId) {
    Stop-D14 "Unexpected AWS account"
}
$script:Region = [string](& aws configure get region)
if ($script:Region -ne $script:ExpectedRegion) {
    Stop-D14 "Unexpected AWS region"
}

$inventory = Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json
$privateSubnetIds = @($inventory.network.privateSubnetIds)
$ecsSecurityGroupId = $inventory.network.ecsSecurityGroupId

if (-not $env:D14_BOOTSTRAP_PASSWORD -or $env:D14_BOOTSTRAP_PASSWORD.Length -lt 12) {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $env:D14_BOOTSTRAP_PASSWORD = [Convert]::ToBase64String($bytes)
    Write-D14Log "Generated ephemeral D14_BOOTSTRAP_PASSWORD for this run (not logged)"
}

$adminEmail = if ($env:D14_ADMIN_EMAIL) { $env:D14_ADMIN_EMAIL } else { "eaziacall-prod-admin@eazisol.com" }
$provisionScript = Join-Path $PSScriptRoot "d14-tenant-provision.js"

Write-D14Log "Uploading provision script to s3://$($script:S3Bucket)/$($script:S3ScriptKey)"
& aws s3 cp $provisionScript "s3://$($script:S3Bucket)/$($script:S3ScriptKey)" --region $script:Region --content-type "application/javascript" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Stop-D14 "Failed to upload provision script to S3"
}

$presignedUrl = [string](& aws s3 presign "s3://$($script:S3Bucket)/$($script:S3ScriptKey)" --expires-in 3600 --region $script:Region)
if ([string]::IsNullOrWhiteSpace($presignedUrl)) {
    Stop-D14 "Failed to generate presigned URL for provision script"
}

$loader = @'
export D14_ADMIN_EMAIL="__ADMIN_EMAIL__";
export D14_BOOTSTRAP_PASSWORD="__BOOTSTRAP_PASSWORD__";
export D14_SCRIPT_URL="__SCRIPT_URL__";
node -e "fetch(process.env.D14_SCRIPT_URL).then((r)=>{if(!r.ok)throw new Error('download failed '+r.status);return r.text();}).then((t)=>require('fs').writeFileSync('/tmp/d14-provision.js',t)).then(()=>{require('child_process').execSync('NODE_PATH=/app/node_modules node /tmp/d14-provision.js',{stdio:'inherit',env:process.env});}).catch((e)=>{console.error(e.message||e);process.exit(1);});"
'@
$shellCommand = $loader.Replace('__ADMIN_EMAIL__', ($adminEmail -replace '"', '\"'))
$shellCommand = $shellCommand.Replace('__BOOTSTRAP_PASSWORD__', ($env:D14_BOOTSTRAP_PASSWORD -replace '"', '\"'))
$shellCommand = $shellCommand.Replace('__SCRIPT_URL__', ($presignedUrl -replace '"', '\"'))

$overridesObj = [ordered]@{
    containerOverrides = @(
        [ordered]@{
            name    = $script:ContainerName
            command = @("sh", "-c", $shellCommand)
        }
    )
}
$overridesFile = New-AwsCliJsonFile -JsonContent (($overridesObj | ConvertTo-Json -Compress -Depth 6))
$networkFile = New-AwsCliJsonFile -JsonContent ((@{
        awsvpcConfiguration = @{
            subnets        = @($privateSubnetIds[0], $privateSubnetIds[1])
            securityGroups = @($ecsSecurityGroupId)
            assignPublicIp = "DISABLED"
        }
    } | ConvertTo-Json -Compress -Depth 5))

Write-D14Log "Launching ECS tenant provision task"
$run = Invoke-AwsJson -AwsArgs @(
    "ecs", "run-task",
    "--region", $script:Region,
    "--cluster", $script:ClusterName,
    "--task-definition", "$($script:TaskDefinitionFamily):$($script:ExpectedTaskRevision)",
    "--launch-type", "FARGATE",
    "--network-configuration", $networkFile,
    "--overrides", $overridesFile
)
$taskArn = $run.tasks[0].taskArn
& aws ecs wait tasks-stopped --region $script:Region --cluster $script:ClusterName --tasks $taskArn | Out-Null

$desc = Invoke-AwsJson -AwsArgs @(
    "ecs", "describe-tasks",
    "--region", $script:Region,
    "--cluster", $script:ClusterName,
    "--tasks", $taskArn
)
$exitCode = [int]$desc.tasks[0].containers[0].exitCode
$logText = Get-TaskLogText -TaskArn $taskArn
Write-D14Log $logText

if ($exitCode -ne 0 -or $logText -notmatch 'D14 provision=PASS') {
    Stop-D14 "Tenant provision ECS task failed (exit $exitCode)"
}

Write-D14Log "Tenant provision PASS - running d14-provider-webhooks.ps1"
& powershell -ExecutionPolicy Bypass -File $script:D14Script
if ($LASTEXITCODE -ne 0) {
    Stop-D14 "d14-provider-webhooks.ps1 failed after tenant provision (exit $LASTEXITCODE)"
}

Write-D14Log "D14 tenant routing remediation complete"
