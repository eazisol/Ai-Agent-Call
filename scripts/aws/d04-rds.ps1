# EaziAICall AWS-D04 — Amazon RDS PostgreSQL (idempotent, AWS CLI only)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:DbIdentifier = "eaziacall-prod-postgres"
$script:DbName = "eazi_ai_call"
$script:MasterUsername = "eaziadmin"
$script:DbPort = 5432
$script:InstanceClass = "db.t4g.micro"
$script:AllocatedStorage = 20
$script:StorageType = "gp3"
$script:BackupRetentionPeriod = 7
$script:Engine = "postgres"
$script:EngineMajor = "17"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D04Log {
    param([string]$Message)
    Write-Host "[d04-rds] $Message"
}

function Stop-D04 {
    param([string]$Message)
    Write-Error "[d04-rds] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D04 "Required command not found: $Name"
    }
}

function Normalize-AwsText {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq "None") {
        return ""
    }
    return $Value.Trim()
}

function Invoke-Aws {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$AwsArgs,
        [switch]$AllowFailure
    )
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @AwsArgs 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction

    if (-not $AllowFailure -and $exitCode -ne 0) {
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-D04 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    return $output
}

function Invoke-AwsText {
    param(
        [string[]]$AwsArgs,
        [switch]$AllowFailure
    )
    $result = Invoke-Aws -AwsArgs ($AwsArgs + @("--output", "text")) -AllowFailure:$AllowFailure
    if ($result -is [System.Array]) {
        return (Normalize-AwsText ($result -join "`n"))
    }
    return (Normalize-AwsText ([string]$result))
}

function Invoke-AwsJson {
    param(
        [string[]]$AwsArgs,
        [switch]$AllowFailure
    )
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @($AwsArgs + @("--output", "json")) 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction

    if ($exitCode -ne 0) {
        if ($AllowFailure) { return $null }
        $detail = if ($output -is [System.Array]) { ($output | ForEach-Object { "$_" }) -join "; " } else { [string]$output }
        Stop-D04 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }

    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D04 "AWS CLI returned empty JSON output: aws $($AwsArgs -join ' ')"
    }
    return ($raw | ConvertFrom-Json)
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D04 "AWS region is not configured. Set AWS_REGION or configure AWS CLI region."
}

function Get-EngineMajor {
    param([string]$EngineVersion)
    if ($EngineVersion -match '^(\d+)') {
        return $Matches[1]
    }
    return ""
}

function Select-PostgresEngineVersion {
    $versions = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-engine-versions",
        "--region", $script:Region,
        "--engine", $script:Engine,
        "--query", "DBEngineVersions[?starts_with(EngineVersion, '$($script:EngineMajor).') && Status=='available'].EngineVersion"
    )
    if (-not $versions -or $versions.Count -eq 0) {
        Stop-D04 "No available PostgreSQL $($script:EngineMajor).x engine versions found in region $($script:Region)"
    }
    $sorted = @($versions | ForEach-Object { [string]$_ } | Sort-Object { [version]$_ })
    return $sorted[-1]
}

function Test-InstanceClassSupported {
    param([string]$EngineVersion)
    $options = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-orderable-db-instance-options",
        "--region", $script:Region,
        "--engine", $script:Engine,
        "--engine-version", $EngineVersion,
        "--query", "OrderableDBInstanceOptions[?DBInstanceClass=='$($script:InstanceClass)' && StorageType=='$($script:StorageType)']"
    )
    if (-not $options -or @($options).Count -eq 0) {
        $alternatives = Invoke-AwsJson -AwsArgs @(
            "rds", "describe-orderable-db-instance-options",
            "--region", $script:Region,
            "--engine", $script:Engine,
            "--engine-version", $EngineVersion,
            "--query", "OrderableDBInstanceOptions[?StorageType=='$($script:StorageType)'].DBInstanceClass"
        )
        $altList = @($alternatives | Select-Object -Unique | Sort-Object)
        Stop-D04 "Requested initial DB class unavailable: $($script:InstanceClass) with $($script:StorageType) for PostgreSQL $EngineVersion in $($script:Region). Compatible alternatives: $($altList -join ', ')"
    }
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D04 "Resource inventory not found: $($script:InventoryFile). Run AWS-D03 first."
    }
    try {
        return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        Stop-D04 "Failed to parse resource inventory: $($script:InventoryFile)"
    }
}

function Test-D03Prerequisites {
    param($Inventory)

    if (-not $Inventory.network) {
        Stop-D04 "Inventory missing network section. Run AWS-D03 first."
    }

    $net = $Inventory.network
    $required = @(
        @{ Name = "vpcId"; Value = $net.vpcId },
        @{ Name = "privateSubnetIds[0]"; Value = $net.privateSubnetIds[0] },
        @{ Name = "privateSubnetIds[1]"; Value = $net.privateSubnetIds[1] },
        @{ Name = "rdsSecurityGroupId"; Value = $net.rdsSecurityGroupId },
        @{ Name = "dbSubnetGroupName"; Value = $net.dbSubnetGroupName },
        @{ Name = "ecsSecurityGroupId"; Value = $net.ecsSecurityGroupId }
    )
    foreach ($item in $required) {
        if ([string]::IsNullOrWhiteSpace([string]$item.Value)) {
            Stop-D04 "Inventory missing required D03 value: $($item.Name)"
        }
    }

    if ($net.dbSubnetGroupName -ne "eaziacall-prod-db-subnet-group") {
        Stop-D04 "Unexpected DB subnet group in inventory: $($net.dbSubnetGroupName)"
    }

    $vpcState = Invoke-AwsText -AwsArgs @(
        "ec2", "describe-vpcs",
        "--region", $script:Region,
        "--vpc-ids", $net.vpcId,
        "--query", "Vpcs[0].State"
    )
    if ($vpcState -ne "available") {
        Stop-D04 "VPC not available: $($net.vpcId) (state=$vpcState)"
    }

    foreach ($subnetId in @($net.privateSubnetIds[0], $net.privateSubnetIds[1])) {
        $subnet = Invoke-AwsJson -AwsArgs @(
            "ec2", "describe-subnets",
            "--region", $script:Region,
            "--subnet-ids", $subnetId,
            "--query", "Subnets[0]"
        )
        if ($subnet.State -ne "available") {
            Stop-D04 "Private subnet not available: $subnetId"
        }
        if ($subnet.MapPublicIpOnLaunch) {
            Stop-D04 "Expected private subnet but MapPublicIpOnLaunch=true: $subnetId"
        }
    }

    $sg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--group-ids", $net.rdsSecurityGroupId,
        "--query", "SecurityGroups[0]"
    )
    if ($sg.GroupName -ne "eaziacall-prod-rds-sg") {
        Stop-D04 "Unexpected RDS security group name: $($sg.GroupName)"
    }

    $dbSubnetGroup = Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-subnet-groups",
        "--region", $script:Region,
        "--db-subnet-group-name", $net.dbSubnetGroupName,
        "--query", "DBSubnetGroups[0]"
    )
    $subnetIds = @($dbSubnetGroup.Subnets | ForEach-Object { $_.SubnetIdentifier } | Sort-Object)
    $expectedSubnets = @($net.privateSubnetIds[0], $net.privateSubnetIds[1] | Sort-Object)
    if (($subnetIds -join ',') -ne ($expectedSubnets -join ',')) {
        Stop-D04 "DB subnet group subnets do not match inventory private subnets"
    }

    $ecsToRds = $sg.IpPermissions |
        Where-Object { $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 } |
        ForEach-Object { $_.UserIdGroupPairs } |
        Where-Object { $_.GroupId -eq $net.ecsSecurityGroupId }
    if (-not $ecsToRds) {
        Stop-D04 "RDS SG must allow TCP 5432 from ECS SG per D03 security model"
    }

    $public5432 = $sg.IpPermissions |
        Where-Object { $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 -and $_.IpRanges } |
        ForEach-Object { $_.IpRanges } |
        Where-Object { $_.CidrIp -eq "0.0.0.0/0" -or $_.CidrIp -eq "::/0" }
    if ($public5432) {
        Stop-D04 "RDS SG must not allow public PostgreSQL access (0.0.0.0/0 or ::/0)"
    }

    $script:VpcId = $net.vpcId
    $script:PrivateSubnetAId = $net.privateSubnetIds[0]
    $script:PrivateSubnetBId = $net.privateSubnetIds[1]
    $script:RdsSecurityGroupId = $net.rdsSecurityGroupId
    $script:EcsSecurityGroupId = $net.ecsSecurityGroupId
    $script:DbSubnetGroupName = $net.dbSubnetGroupName
}

function Get-ExistingDbInstance {
    return (Invoke-AwsJson -AwsArgs @(
        "rds", "describe-db-instances",
        "--region", $script:Region,
        "--db-instance-identifier", $script:DbIdentifier
    ) -AllowFailure)
}

function Test-ExistingDbCompatible {
    param($Db)

    $instance = $Db.DBInstances[0]
    $conflicts = @()

    if ($instance.Engine -ne $script:Engine) { $conflicts += "engine=$($instance.Engine)" }
    if ((Get-EngineMajor $instance.EngineVersion) -ne $script:EngineMajor) {
        $conflicts += "engineVersion=$($instance.EngineVersion)"
    }
    if ($instance.DBInstanceClass -ne $script:InstanceClass) { $conflicts += "instanceClass=$($instance.DBInstanceClass)" }
    if ($instance.DBName -and $instance.DBName -ne $script:DbName) { $conflicts += "dbName=$($instance.DBName)" }
    if ($instance.MasterUsername -ne $script:MasterUsername) { $conflicts += "masterUsername=$($instance.MasterUsername)" }
    if ([int]$instance.Endpoint.Port -ne $script:DbPort) { $conflicts += "port=$($instance.Endpoint.Port)" }
    if ($instance.PubliclyAccessible) { $conflicts += "publiclyAccessible=true" }
    if ($instance.MultiAZ) { $conflicts += "multiAZ=true" }
    if (-not $instance.StorageEncrypted) { $conflicts += "storageEncrypted=false" }
    if ([int]$instance.AllocatedStorage -ne $script:AllocatedStorage) { $conflicts += "allocatedStorage=$($instance.AllocatedStorage)" }
    if ($instance.StorageType -ne $script:StorageType) { $conflicts += "storageType=$($instance.StorageType)" }
    if ([int]$instance.BackupRetentionPeriod -ne $script:BackupRetentionPeriod) {
        $conflicts += "backupRetentionPeriod=$($instance.BackupRetentionPeriod)"
    }
    if (-not $instance.DeletionProtection) { $conflicts += "deletionProtection=false" }
    if ($instance.DBSubnetGroup.DBSubnetGroupName -ne $script:DbSubnetGroupName) {
        $conflicts += "dbSubnetGroup=$($instance.DBSubnetGroup.DBSubnetGroupName)"
    }

    $sgIds = @($instance.VpcSecurityGroups | ForEach-Object { $_.VpcSecurityGroupId } | Sort-Object)
    if ($sgIds.Count -ne 1 -or $sgIds[0] -ne $script:RdsSecurityGroupId) {
        $conflicts += "securityGroups=$($sgIds -join ',')"
    }

    if (-not $instance.MasterUserSecret -or [string]::IsNullOrWhiteSpace($instance.MasterUserSecret.SecretArn)) {
        $conflicts += "manageMasterUserPassword=disabled"
    }

    if ($conflicts.Count -gt 0) {
        Stop-D04 "Existing DB instance '$($script:DbIdentifier)' is incompatible: $($conflicts -join '; ')"
    }
}

function New-DbInstance {
    param([string]$EngineVersion)

    Write-D04Log "Creating RDS instance $($script:DbIdentifier) (PostgreSQL $EngineVersion)..."

    Invoke-Aws -AwsArgs @(
        "rds", "create-db-instance",
        "--region", $script:Region,
        "--db-instance-identifier", $script:DbIdentifier,
        "--engine", $script:Engine,
        "--engine-version", $EngineVersion,
        "--db-instance-class", $script:InstanceClass,
        "--allocated-storage", "$($script:AllocatedStorage)",
        "--storage-type", $script:StorageType,
        "--storage-encrypted",
        "--db-name", $script:DbName,
        "--master-username", $script:MasterUsername,
        "--manage-master-user-password",
        "--vpc-security-group-ids", $script:RdsSecurityGroupId,
        "--db-subnet-group-name", $script:DbSubnetGroupName,
        "--backup-retention-period", "$($script:BackupRetentionPeriod)",
        "--copy-tags-to-snapshot",
        "--auto-minor-version-upgrade",
        "--deletion-protection",
        "--no-publicly-accessible",
        "--no-multi-az",
        "--port", "$($script:DbPort)",
        "--tags",
        "Key=Project,Value=$($script:Project)",
        "Key=Environment,Value=$($script:Environment)",
        "Key=ManagedBy,Value=$($script:ManagedBy)",
        "Key=Name,Value=$($script:DbIdentifier)"
    ) | Out-Null
}

function Wait-DbAvailable {
    Write-D04Log "Waiting for RDS instance to become available (this may take several minutes)..."
    Invoke-Aws -AwsArgs @(
        "rds", "wait", "db-instance-available",
        "--region", $script:Region,
        "--db-instance-identifier", $script:DbIdentifier
    ) | Out-Null
}

function Test-DbConfiguration {
    param($Db)

    $instance = $Db.DBInstances[0]
    $checks = @(
        @{ Name = "DBInstanceStatus"; Expected = "available"; Actual = $instance.DBInstanceStatus },
        @{ Name = "Engine"; Expected = $script:Engine; Actual = $instance.Engine },
        @{ Name = "DBInstanceClass"; Expected = $script:InstanceClass; Actual = $instance.DBInstanceClass },
        @{ Name = "DBName"; Expected = $script:DbName; Actual = $instance.DBName },
        @{ Name = "MasterUsername"; Expected = $script:MasterUsername; Actual = $instance.MasterUsername },
        @{ Name = "Port"; Expected = "$($script:DbPort)"; Actual = "$($instance.Endpoint.Port)" },
        @{ Name = "PubliclyAccessible"; Expected = "False"; Actual = "$($instance.PubliclyAccessible)" },
        @{ Name = "MultiAZ"; Expected = "False"; Actual = "$($instance.MultiAZ)" },
        @{ Name = "StorageEncrypted"; Expected = "True"; Actual = "$($instance.StorageEncrypted)" },
        @{ Name = "AllocatedStorage"; Expected = "$($script:AllocatedStorage)"; Actual = "$($instance.AllocatedStorage)" },
        @{ Name = "StorageType"; Expected = $script:StorageType; Actual = $instance.StorageType },
        @{ Name = "BackupRetentionPeriod"; Expected = "$($script:BackupRetentionPeriod)"; Actual = "$($instance.BackupRetentionPeriod)" },
        @{ Name = "DeletionProtection"; Expected = "True"; Actual = "$($instance.DeletionProtection)" }
    )

    foreach ($check in $checks) {
        if ("$($check.Actual)" -ne "$($check.Expected)") {
            Stop-D04 "Configuration mismatch: $($check.Name) expected '$($check.Expected)' got '$($check.Actual)'"
        }
    }

    if ((Get-EngineMajor $instance.EngineVersion) -ne $script:EngineMajor) {
        Stop-D04 "Engine major version must be $($script:EngineMajor); got $($instance.EngineVersion)"
    }

    if ([string]::IsNullOrWhiteSpace($instance.Endpoint.Address)) {
        Stop-D04 "RDS endpoint hostname is missing"
    }

    if ($instance.DBSubnetGroup.DBSubnetGroupName -ne $script:DbSubnetGroupName) {
        Stop-D04 "DB subnet group mismatch: $($instance.DBSubnetGroup.DBSubnetGroupName)"
    }

    $subnetIds = @($instance.DBSubnetGroup.Subnets | ForEach-Object { $_.SubnetIdentifier } | Sort-Object)
    $expectedSubnets = @($script:PrivateSubnetAId, $script:PrivateSubnetBId | Sort-Object)
    if (($subnetIds -join ',') -ne ($expectedSubnets -join ',')) {
        Stop-D04 "RDS subnet group does not contain only D03 private subnets"
    }

    $sgIds = @($instance.VpcSecurityGroups | Where-Object { $_.Status -eq "active" } | ForEach-Object { $_.VpcSecurityGroupId })
    if ($sgIds -notcontains $script:RdsSecurityGroupId) {
        Stop-D04 "RDS instance is not associated with expected RDS security group"
    }

    if (-not $instance.MasterUserSecret -or [string]::IsNullOrWhiteSpace($instance.MasterUserSecret.SecretArn)) {
        Stop-D04 "RDS-managed master user password is not enabled"
    }

    $script:EngineVersion = $instance.EngineVersion
    $script:DbArn = $instance.DBInstanceArn
    $script:DbEndpoint = $instance.Endpoint.Address
    $script:DbEndpointPort = [int]$instance.Endpoint.Port
    $script:AvailabilityZone = $instance.AvailabilityZone
    $script:CopyTagsToSnapshot = [bool]$instance.CopyTagsToSnapshot
    $script:AutoMinorVersionUpgrade = [bool]$instance.AutoMinorVersionUpgrade
    $script:MasterSecretArn = $instance.MasterUserSecret.SecretArn
    $script:MasterSecretStatus = $instance.MasterUserSecret.SecretStatus
}

function Test-NetworkIsolation {
    $sg = Invoke-AwsJson -AwsArgs @(
        "ec2", "describe-security-groups",
        "--region", $script:Region,
        "--group-ids", $script:RdsSecurityGroupId,
        "--query", "SecurityGroups[0]"
    )

    $publicIpv4 = $sg.IpPermissions |
        Where-Object { $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 } |
        ForEach-Object { $_.IpRanges } |
        Where-Object { $_.CidrIp -eq "0.0.0.0/0" }
    $publicIpv6 = $sg.IpPermissions |
        Where-Object { $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 } |
        ForEach-Object { $_.Ipv6Ranges } |
        Where-Object { $_.CidrIpv6 -eq "::/0" }

    if ($publicIpv4 -or $publicIpv6) {
        Stop-D04 "Network isolation failed: public PostgreSQL access detected on RDS SG"
    }

    $ecsToRds = $sg.IpPermissions |
        Where-Object { $_.FromPort -eq 5432 -and $_.ToPort -eq 5432 } |
        ForEach-Object { $_.UserIdGroupPairs } |
        Where-Object { $_.GroupId -eq $script:EcsSecurityGroupId }
    if (-not $ecsToRds) {
        Stop-D04 "Network isolation failed: ECS SG is not permitted on RDS SG TCP 5432"
    }
}

function Test-MasterSecretMetadata {
    $secret = Invoke-AwsJson -AwsArgs @(
        "secretsmanager", "describe-secret",
        "--region", $script:Region,
        "--secret-id", $script:MasterSecretArn
    )

    if ($secret.ARN -ne $script:MasterSecretArn) {
        Stop-D04 "Master secret ARN mismatch during metadata verification"
    }
    if ($secret.DeletedDate) {
        Stop-D04 "Master secret is marked deleted"
    }

    $script:MasterSecretMetadataStatus = $secret.Status
}

function Write-Inventory {
    param($ExistingInventory)

    $database = [ordered]@{
        identifier        = $script:DbIdentifier
        arn               = $script:DbArn
        engine            = $script:Engine
        engineVersion     = $script:EngineVersion
        instanceClass     = $script:InstanceClass
        databaseName      = $script:DbName
        masterUsername    = $script:MasterUsername
        port              = $script:DbEndpointPort
        endpoint          = $script:DbEndpoint
        dbSubnetGroupName = $script:DbSubnetGroupName
        securityGroupId   = $script:RdsSecurityGroupId
        masterSecretArn   = $script:MasterSecretArn
        publiclyAccessible = $false
        multiAz           = $false
        storageEncrypted  = $true
        allocatedStorageGiB = $script:AllocatedStorage
        storageType       = $script:StorageType
        backupRetentionPeriod = $script:BackupRetentionPeriod
        deletionProtection = $true
        availabilityZone  = $script:AvailabilityZone
    }

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }
    $inventory.environment = $script:Environment
    $inventory.region = $script:Region
    $inventory.accountId = $script:AccountId
    $inventory.database = $database

    $dir = Split-Path $script:InventoryFile -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    ($inventory | ConvertTo-Json -Depth 8) | Set-Content -Path $script:InventoryFile -Encoding utf8
    Write-D04Log "Wrote inventory: $($script:InventoryFile)"
}

# --- Main ---
Test-CommandExists "aws"

$script:Region = Get-ResolvedRegion
if ($script:Region -ne "us-east-1") {
    Stop-D04 "Region must be us-east-1; got '$($script:Region)'"
}

$identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
$script:AccountId = $identity.Account
$script:CallerArn = $identity.Arn

Write-D04Log "Using region: $($script:Region)"
Write-D04Log "AWS account: $($script:AccountId)"
Write-D04Log "Caller: $($script:CallerArn)"

$inventory = Read-Inventory
Test-D03Prerequisites -Inventory $inventory

$script:EngineVersion = Select-PostgresEngineVersion
Write-D04Log "Selected PostgreSQL engine version: $($script:EngineVersion)"
Test-InstanceClassSupported -EngineVersion $script:EngineVersion

$existing = Get-ExistingDbInstance
if ($existing -and $existing.DBInstances -and $existing.DBInstances.Count -gt 0) {
    Write-D04Log "Reusing existing RDS instance $($script:DbIdentifier)"
    Test-ExistingDbCompatible -Db $existing
    if ($existing.DBInstances[0].DBInstanceStatus -ne "available") {
        Wait-DbAvailable
        $existing = Get-ExistingDbInstance
    }
}
else {
    New-DbInstance -EngineVersion $script:EngineVersion
    Wait-DbAvailable
    $existing = Get-ExistingDbInstance
}

if (-not $existing -or -not $existing.DBInstances -or $existing.DBInstances.Count -eq 0) {
    Stop-D04 "RDS instance not found after create/wait: $($script:DbIdentifier)"
}

Write-D04Log "Verifying RDS configuration..."
Test-DbConfiguration -Db $existing
Write-D04Log "Verifying network isolation..."
Test-NetworkIsolation
Write-D04Log "Verifying master secret metadata..."
Test-MasterSecretMetadata
Write-Inventory -ExistingInventory $inventory

Write-D04Log "AWS-D04 RDS PostgreSQL complete."
