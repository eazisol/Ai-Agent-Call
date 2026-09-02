# EaziAICall — Temporary TablePlus RDS access host (SSM port forwarding)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Region = "us-east-1"
$script:ExpectedAccountId = "812047028300"
$script:VpcId = "vpc-079b83cf9f1f2135b"
$script:PrivateSubnetId = "subnet-0fc38aac1eef37201"
$script:RdsSecurityGroupId = "sg-04a82007df199beff"
$script:RdsHost = "eaziacall-prod-postgres.c6hi80sou31r.us-east-1.rds.amazonaws.com"
$script:DbAccessSgName = "eaziacall-prod-db-access-sg"
$script:DbAccessRoleName = "eaziacall-prod-db-access-role"
$script:DbAccessProfileName = "eaziacall-prod-db-access-profile"
$script:InstanceName = "eaziacall-prod-db-access"
$script:InstanceType = "t3.micro"
$script:AmiId = "ami-025b6f0b1ac2ef9f7"
$script:LocalPort = 15432
$script:RemotePort = 5432
$script:StateFile = Join-Path $PSScriptRoot "db-access.state.json"

function Write-Log {
    param([string]$Message)
    Write-Host "[db-access] $Message"
}

function Stop-Access {
    param([string]$Message)
    Write-Error "[db-access] ERROR: $Message"
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
        Stop-Access "AWS CLI failed: aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-Access "AWS CLI returned empty JSON"
    }
    return ($raw | ConvertFrom-Json)
}

function Test-Identity {
    $identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
    if ("$($identity.Account)" -ne $script:ExpectedAccountId) {
        Stop-Access "Unexpected AWS account: $($identity.Account)"
    }
    Write-Log "Caller: $($identity.Arn)"
}

function Get-OrCreateDbAccessSecurityGroup {
    $existing = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--filters",
        "Name=group-name,Values=$($script:DbAccessSgName)",
        "Name=vpc-id,Values=$($script:VpcId)"
    )
    if ($existing.SecurityGroups.Count -gt 0) {
        $sg = $existing.SecurityGroups[0]
        Write-Log "Reusing security group $($sg.GroupId)"
        return $sg.GroupId
    }

    $created = Invoke-AwsJson -AwsArgs @(
        "ec2", "create-security-group",
        "--group-name", $script:DbAccessSgName,
        "--description", "Temporary SSM host for private RDS TablePlus access",
        "--vpc-id", $script:VpcId,
        "--tag-specifications",
        "ResourceType=security-group,Tags=[{Key=Name,Value=$($script:DbAccessSgName)},{Key=Project,Value=EaziAICall},{Key=Purpose,Value=db-access-temporary}]"
    )
    $sgId = $created.GroupId
    Write-Log "Created security group $sgId (no inbound rules)"
    return $sgId
}

function Ensure-RdsIngressFromDbAccess {
    param([string]$DbAccessSgId)
    $rdsSg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--group-ids", $script:RdsSecurityGroupId
    )
    $perm = $rdsSg.SecurityGroups[0].IpPermissions | Where-Object {
        $_.IpProtocol -eq "tcp" -and
        $_.FromPort -eq 5432 -and
        $_.ToPort -eq 5432 -and
        ($_.UserIdGroupPairs | Where-Object { $_.GroupId -eq $DbAccessSgId }).Count -gt 0
    }
    if ($perm) {
        Write-Log "RDS SG already allows TCP 5432 from $DbAccessSgId"
        return
    }
    Invoke-Aws -AwsArgs @(
        "ec2", "authorize-security-group-ingress",
        "--group-id", $script:RdsSecurityGroupId,
        "--ip-permissions",
        "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=$DbAccessSgId,Description=Temporary TablePlus SSM access host}]"
    ) | Out-Null
    Write-Log "Added RDS SG ingress TCP 5432 from $DbAccessSgId"
}

function Ensure-IamRoleAndProfile {
    $role = Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", $script:DbAccessRoleName) -AllowFailure
    if (-not $role) {
        $trust = @{
            Version = "2012-10-17"
            Statement = @(
                @{
                    Effect = "Allow"
                    Principal = @{ Service = "ec2.amazonaws.com" }
                    Action = "sts:AssumeRole"
                }
            )
        } | ConvertTo-Json -Depth 5 -Compress
        $trustFile = Join-Path $env:TEMP ("db-access-trust-{0}.json" -f [Guid]::NewGuid().ToString("N"))
        [System.IO.File]::WriteAllText($trustFile, $trust)
        Invoke-Aws -AwsArgs @(
            "iam", "create-role",
            "--role-name", $script:DbAccessRoleName,
            "--assume-role-policy-document", "file://$($trustFile -replace '\\','/')",
            "--description", "Temporary EC2 role for SSM port forwarding to RDS"
        ) | Out-Null
        Remove-Item -Force $trustFile
        Write-Log "Created IAM role $($script:DbAccessRoleName)"
    } else {
        Write-Log "Reusing IAM role $($script:DbAccessRoleName)"
    }

    Invoke-Aws -AwsArgs @(
        "iam", "attach-role-policy",
        "--role-name", $script:DbAccessRoleName,
        "--policy-arn", "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    ) -AllowFailure | Out-Null

    $profile = Invoke-AwsJson -AwsArgs @("iam", "get-instance-profile", "--instance-profile-name", $script:DbAccessProfileName) -AllowFailure
    if (-not $profile) {
        Invoke-Aws -AwsArgs @(
            "iam", "create-instance-profile",
            "--instance-profile-name", $script:DbAccessProfileName
        ) | Out-Null
        Write-Log "Created instance profile $($script:DbAccessProfileName)"
    } else {
        Write-Log "Reusing instance profile $($script:DbAccessProfileName)"
    }

    Invoke-Aws -AwsArgs @(
        "iam", "add-role-to-instance-profile",
        "--instance-profile-name", $script:DbAccessProfileName,
        "--role-name", $script:DbAccessRoleName
    ) -AllowFailure | Out-Null

    Start-Sleep -Seconds 5
}

function Get-ExistingAccessInstance {
    $result = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-instances",
        "--filters",
        "Name=tag:Name,Values=$($script:InstanceName)",
        "Name=instance-state-name,Values=pending,running,stopping,stopped"
    )
    foreach ($reservation in $result.Reservations) {
        foreach ($instance in $reservation.Instances) {
            return $instance
        }
    }
    return $null
}

function Wait-InstanceRunning {
    param([string]$InstanceId)
    Write-Log "Waiting for EC2 $InstanceId to reach running..."
    Invoke-Aws -AwsArgs @(
        "ec2", "wait", "instance-running",
        "--instance-ids", $InstanceId
    ) | Out-Null
}

function Wait-SsmOnline {
    param([string]$InstanceId)
    Write-Log "Waiting for SSM managed instance Online..."
    $attempts = 0
    $maxAttempts = 40
    while ($attempts -lt $maxAttempts) {
        $info = Invoke-AwsJson -AwsArgs @(
            "ssm", "describe-instance-information",
            "--filters", "Key=InstanceIds,Values=$InstanceId"
        ) -AllowFailure
        $ping = $info.InstanceInformationList | Select-Object -First 1
        if ($ping -and "$($ping.PingStatus)" -eq "Online") {
            return "Online"
        }
        Start-Sleep -Seconds 15
        $attempts++
    }
    Stop-Access "SSM agent did not reach Online for $InstanceId"
}

function Start-AccessInstance {
    param([string]$DbAccessSgId)
    $existing = Get-ExistingAccessInstance
    if ($existing) {
        if ($existing.State.Name -eq "stopped") {
            Write-Log "Starting stopped instance $($existing.InstanceId)"
            Invoke-Aws -AwsArgs @("ec2", "start-instances", "--instance-ids", $existing.InstanceId) | Out-Null
        }
        Wait-InstanceRunning -InstanceId $existing.InstanceId
        return $existing.InstanceId
    }

    $run = Invoke-AwsJson -AwsArgs @(
        "ec2", "run-instances",
        "--image-id", $script:AmiId,
        "--instance-type", $script:InstanceType,
        "--iam-instance-profile", "Name=$($script:DbAccessProfileName)",
        "--network-interfaces",
        "DeviceIndex=0,SubnetId=$($script:PrivateSubnetId),Groups=$DbAccessSgId,AssociatePublicIpAddress=false",
        "--tag-specifications",
        "ResourceType=instance,Tags=[{Key=Name,Value=$($script:InstanceName)},{Key=Project,Value=EaziAICall},{Key=Purpose,Value=db-access-temporary}]",
        "--metadata-options", "HttpTokens=required,HttpEndpoint=enabled",
        "--count", "1"
    )
    $instanceId = $run.Instances[0].InstanceId
    Write-Log "Launched EC2 $instanceId"
    Wait-InstanceRunning -InstanceId $instanceId
    return $instanceId
}

function Save-State {
    param([hashtable]$State)
    $State | ConvertTo-Json | Set-Content -Path $script:StateFile -Encoding UTF8
}

function Get-PortForwardCommand {
    param([string]$InstanceId)
    return @"
aws ssm start-session `
  --region $($script:Region) `
  --target $InstanceId `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters "host=$($script:RdsHost),portNumber=$($script:RemotePort),localPortNumber=$($script:LocalPort)"
"@
}

Test-Identity
$dbAccessSgId = Get-OrCreateDbAccessSecurityGroup
Ensure-RdsIngressFromDbAccess -DbAccessSgId $dbAccessSgId
Ensure-IamRoleAndProfile
$instanceId = Start-AccessInstance -DbAccessSgId $dbAccessSgId
$ssmStatus = Wait-SsmOnline -InstanceId $instanceId
$instance = Invoke-AwsJson -AwsArgs @("ec2", "describe-instances", "--instance-ids", $instanceId)
$privateIp = $instance.Reservations[0].Instances[0].PrivateIpAddress
$portForward = Get-PortForwardCommand -InstanceId $instanceId

Save-State -State @{
    region = $script:Region
    instanceId = $instanceId
    privateIp = $privateIp
    dbAccessSecurityGroupId = $dbAccessSgId
    rdsSecurityGroupId = $script:RdsSecurityGroupId
    roleName = $script:DbAccessRoleName
    instanceProfileName = $script:DbAccessProfileName
    instanceName = $script:InstanceName
}

Write-Host ""
Write-Host "=== EaziAICall TablePlus RDS Access Host Ready ==="
Write-Host "1. EC2 instance ID: $instanceId"
Write-Host "2. Private IP: $privateIp"
Write-Host "3. DB access SG ID: $dbAccessSgId"
Write-Host "4. SSM status: $ssmStatus"
Write-Host "5. Windows PowerShell port-forward command:"
Write-Host $portForward
Write-Host ""
Write-Host "TablePlus: Host=127.0.0.1 Port=$($script:LocalPort) (run port-forward command first)"
Write-Host "State file: $script:StateFile"
Write-Host "Cleanup: scripts/aws/db-access-cleanup.ps1"
