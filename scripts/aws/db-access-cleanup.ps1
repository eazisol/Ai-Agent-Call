# EaziAICall — Cleanup temporary TablePlus RDS access host
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Region = "us-east-1"
$script:ExpectedAccountId = "812047028300"
$script:RdsSecurityGroupId = "sg-04a82007df199beff"
$script:DbAccessSgName = "eaziacall-prod-db-access-sg"
$script:DbAccessRoleName = "eaziacall-prod-db-access-role"
$script:DbAccessProfileName = "eaziacall-prod-db-access-profile"
$script:InstanceName = "eaziacall-prod-db-access"
$script:StateFile = Join-Path $PSScriptRoot "db-access.state.json"

function Write-Log {
    param([string]$Message)
    Write-Host "[db-access-cleanup] $Message"
}

function Stop-Cleanup {
    param([string]$Message)
    Write-Error "[db-access-cleanup] ERROR: $Message"
    exit 1
}

function Invoke-Aws {
    param(
        [Parameter(Mandatory = $true)][string[]]$AwsArgs,
        [switch]$AllowFailure
    )
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @($AwsArgs + @("--region", $script:Region)) 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    if (-not $AllowFailure -and $exitCode -ne 0) {
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-Cleanup "AWS CLI failed: aws $($AwsArgs -join ' ') :: $detail"
    }
    return $output
}

function Invoke-AwsJson {
    param([string[]]$AwsArgs, [switch]$AllowFailure)
    $output = Invoke-Aws -AwsArgs ($AwsArgs + @("--output", "json")) -AllowFailure:$AllowFailure
    if ($AllowFailure -and ($null -eq $output -or [string]::IsNullOrWhiteSpace("$output"))) {
        return $null
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-Cleanup "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function Test-Identity {
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ("$($identity.Account)" -ne $script:ExpectedAccountId) {
        Stop-Cleanup "Unexpected AWS account: $($identity.Account)"
    }
    Write-Log "Caller: $($identity.Arn)"
}

function Get-State {
    if (-not (Test-Path $script:StateFile)) {
        return $null
    }
    return (Get-Content -Raw -Path $script:StateFile | ConvertFrom-Json)
}

function Remove-RdsIngress {
    param([string]$DbAccessSgId)
    if ([string]::IsNullOrWhiteSpace($DbAccessSgId)) { return }
    Invoke-Aws -AwsArgs @(
        "ec2", "revoke-security-group-ingress",
        "--group-id", $script:RdsSecurityGroupId,
        "--ip-permissions",
        "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=$DbAccessSgId}]"
    ) -AllowFailure | Out-Null
    Write-Log "Removed RDS SG ingress from $DbAccessSgId (if present)"
}

function Terminate-AccessInstance {
    param([string]$InstanceId)
    if ([string]::IsNullOrWhiteSpace($InstanceId)) { return }
    $desc = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-instances",
        "--instance-ids", $InstanceId
    ) -AllowFailure
    if (-not $desc) {
        Write-Log "Instance $InstanceId not found"
        return
    }
    $state = $desc.Reservations[0].Instances[0].State.Name
    if ($state -eq "terminated" -or $state -eq "shutting-down") {
        Write-Log "Instance $InstanceId already terminating/terminated"
        return
    }
    Invoke-Aws -AwsArgs @("ec2", "terminate-instances", "--instance-ids", $InstanceId) | Out-Null
    Write-Log "Terminated instance $InstanceId"
    Invoke-Aws -AwsArgs @("ec2", "wait", "instance-terminated", "--instance-ids", $InstanceId) -AllowFailure | Out-Null
}

function Remove-DbAccessSecurityGroup {
    param([string]$SgId)
    if ([string]::IsNullOrWhiteSpace($SgId)) { return }
    Invoke-Aws -AwsArgs @("ec2", "delete-security-group", "--group-id", $SgId) -AllowFailure | Out-Null
    Write-Log "Deleted security group $SgId (if unused)"
}

function Remove-IamAccess {
    Invoke-Aws -AwsArgs @(
        "iam", "remove-role-from-instance-profile",
        "--instance-profile-name", $script:DbAccessProfileName,
        "--role-name", $script:DbAccessRoleName
    ) -AllowFailure | Out-Null
    Invoke-Aws -AwsArgs @(
        "iam", "delete-instance-profile",
        "--instance-profile-name", $script:DbAccessProfileName
    ) -AllowFailure | Out-Null
    Write-Log "Removed instance profile $($script:DbAccessProfileName) (if present)"

    Invoke-Aws -AwsArgs @(
        "iam", "detach-role-policy",
        "--role-name", $script:DbAccessRoleName,
        "--policy-arn", "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    ) -AllowFailure | Out-Null
    Invoke-Aws -AwsArgs @(
        "iam", "delete-role",
        "--role-name", $script:DbAccessRoleName
    ) -AllowFailure | Out-Null
    Write-Log "Removed IAM role $($script:DbAccessRoleName) (if present)"
}

Test-Identity
$state = Get-State

$instanceId = $null
$dbAccessSgId = $null
if ($state) {
    $instanceId = "$($state.instanceId)"
    $dbAccessSgId = "$($state.dbAccessSecurityGroupId)"
}

if (-not $instanceId) {
    $found = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-instances",
        "--filters",
        "Name=tag:Name,Values=$($script:InstanceName)",
        "Name=instance-state-name,Values=pending,running,stopping,stopped"
    ) -AllowFailure
    if ($found -and $found.Reservations.Count -gt 0) {
        $instanceId = $found.Reservations[0].Instances[0].InstanceId
    }
}

if (-not $dbAccessSgId) {
    $sg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--filters", "Name=group-name,Values=$($script:DbAccessSgName)"
    ) -AllowFailure
    if ($sg -and $sg.SecurityGroups.Count -gt 0) {
        $dbAccessSgId = $sg.SecurityGroups[0].GroupId
    }
}

Write-Log "Target instance: $(if ($instanceId) { $instanceId } else { 'none' })"
Write-Log "Target db-access SG: $(if ($dbAccessSgId) { $dbAccessSgId } else { 'none' })"

Terminate-AccessInstance -InstanceId $instanceId
Remove-RdsIngress -DbAccessSgId $dbAccessSgId
Remove-DbAccessSecurityGroup -SgId $dbAccessSgId
Remove-IamAccess

if (Test-Path $script:StateFile) {
    Remove-Item -Force $script:StateFile
    Write-Log "Removed state file"
}

Write-Host ""
Write-Host "=== Cleanup complete ==="
Write-Host "RDS instance was NOT modified."
Write-Host "Review RDS SG $($script:RdsSecurityGroupId) manually if any ingress remains."
