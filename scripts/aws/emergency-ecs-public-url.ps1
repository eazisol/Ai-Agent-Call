# Update ECS runtime PUBLIC_BASE_URL and redeploy service (emergency restore)
#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true)][string]$PublicBaseUrl
)
$ErrorActionPreference = "Stop"

$script:Region = "us-east-1"
$script:ClusterName = "eaziacall-prod-cluster"
$script:ServiceName = "eaziacall-prod-backend-service"
$script:TaskFamily = "eaziacall-prod-backend"
$script:ContainerName = "backend"

function Write-Log { param([string]$Message) Write-Host "[emergency-ecs-url] $Message" }
function Stop-Update { param([string]$Message) Write-Error "[emergency-ecs-url] ERROR: $Message"; exit 1 }

function Invoke-AwsJson {
    param([string[]]$AwsArgs)
    $output = & aws @($AwsArgs + @("--output", "json")) 2>&1
    if ($LASTEXITCODE -ne 0) {
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-Update "AWS failed: aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) { $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n" }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("emergency-ecs-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

if ($PublicBaseUrl -notmatch '^https?://') { Stop-Update "PublicBaseUrl must be http(s)" }
if ($PublicBaseUrl -match '^http://' -and $PublicBaseUrl -notmatch '\.elb\.amazonaws\.com') {
    Stop-Update "HTTP PublicBaseUrl allowed only for temporary ALB (*.elb.amazonaws.com)"
}
Write-Log "Updating PUBLIC_BASE_URL to $PublicBaseUrl"

$current = Invoke-AwsJson -AwsArgs @(
    "ecs", "describe-task-definition", "--region", $script:Region,
    "--task-definition", $script:TaskFamily
)
$td = $current.taskDefinition
$container = $td.containerDefinitions | Where-Object { $_.name -eq $script:ContainerName } | Select-Object -First 1
if (-not $container) { Stop-Update "Container not found" }

$envList = @()
foreach ($item in $container.environment) {
    if ($item.name -eq "PUBLIC_BASE_URL") {
        $envList += @{ name = "PUBLIC_BASE_URL"; value = $PublicBaseUrl }
    } else {
        $envList += @{ name = $item.name; value = $item.value }
    }
}
if (($envList | Where-Object { $_.name -eq "PUBLIC_BASE_URL" }).Count -eq 0) {
    $envList += @{ name = "PUBLIC_BASE_URL"; value = $PublicBaseUrl }
}

$register = [ordered]@{
    family                  = $td.family
    taskRoleArn             = $td.taskRoleArn
    executionRoleArn        = $td.executionRoleArn
    networkMode             = $td.networkMode
    containerDefinitions    = @(
        [ordered]@{
            name             = $container.name
            image            = $container.image
            essential        = $container.essential
            portMappings     = $container.portMappings
            environment      = $envList
            secrets          = $container.secrets
            logConfiguration = $container.logConfiguration
            healthCheck      = $container.healthCheck
        }
    )
    requiresCompatibilities = $td.requiresCompatibilities
    cpu                     = $td.cpu
    memory                  = $td.memory
    runtimePlatform         = $td.runtimePlatform
}

$file = New-AwsCliJsonFile -JsonContent (($register | ConvertTo-Json -Depth 12 -Compress))
$registered = Invoke-AwsJson -AwsArgs @("ecs", "register-task-definition", "--region", $script:Region, "--cli-input-json", $file)
$newArn = $registered.taskDefinition.taskDefinitionArn
$newRev = [int]$registered.taskDefinition.revision
Write-Log "Registered task definition revision $newRev"

Invoke-AwsJson -AwsArgs @(
    "ecs", "update-service", "--region", $script:Region,
    "--cluster", $script:ClusterName,
    "--service", $script:ServiceName,
    "--task-definition", $newArn,
    "--force-new-deployment"
) | Out-Null
Write-Log "Service update initiated"

& aws ecs wait services-stable --region $script:Region --cluster $script:ClusterName --services $script:ServiceName
if ($LASTEXITCODE -ne 0) { Stop-Update "ECS service did not stabilize" }

$svc = Invoke-AwsJson -AwsArgs @(
    "ecs", "describe-services", "--region", $script:Region,
    "--cluster", $script:ClusterName, "--services", $script:ServiceName
).services[0]

Write-Log "Service stable desired=$($svc.desiredCount) running=$($svc.runningCount) taskDef=$newArn"
