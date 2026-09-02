# EaziAICall AWS-D06 - Private S3 + ECS Application IAM Role (idempotent, AWS CLI only)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:PreferredBucketName = "eaziacall-prod-812047028300-us-east-1"
$script:BucketTagName = "eaziacall-prod-object-storage"
$script:TaskRoleName = "eaziacall-prod-ecs-task-role"
$script:S3PolicyName = "eaziacall-prod-s3-access"
$script:VerificationObjectKey = "deployment-verification/aws-d06-test.txt"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D06Log {
    param([string]$Message)
    Write-Host "[d06-s3-iam] $Message"
}

function Stop-D06 {
    param([string]$Message)
    Write-Error "[d06-s3-iam] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D06 "Required command not found: $Name"
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
        Stop-D06 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D06 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }

    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D06 "AWS CLI returned empty JSON output: aws $($AwsArgs -join ' ')"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d06-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D06 "AWS region is not configured. Set AWS_REGION or configure AWS CLI region."
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D06 "Resource inventory not found: $($script:InventoryFile)"
    }
    try {
        return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        Stop-D06 "Failed to parse resource inventory: $($script:InventoryFile)"
    }
}

function Test-InventoryPrerequisites {
    param($Inventory)

    if (-not $Inventory.network -or -not $Inventory.database) {
        Stop-D06 "Inventory missing D03/D04 sections. Complete AWS-D03 and AWS-D04 first."
    }
    if ($Inventory.region -and $Inventory.region -ne $script:Region) {
        Stop-D06 "Inventory region '$($Inventory.region)' does not match deployment region '$($script:Region)'"
    }
    if ($Inventory.accountId -and $Inventory.accountId -ne $script:AccountId) {
        Stop-D06 "Inventory accountId '$($Inventory.accountId)' does not match current account '$($script:AccountId)'"
    }
}

function Test-BucketExists {
    param([string]$BucketName)
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & aws s3api head-bucket --bucket $BucketName --region $script:Region 2>$null | Out-Null
    $exists = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previousErrorAction
    return $exists
}

function Get-BucketRegion {
    param([string]$BucketName)
    $location = Invoke-AwsText -AwsArgs @("s3api", "get-bucket-location", "--bucket", $BucketName)
    if ([string]::IsNullOrWhiteSpace($location) -or $location -eq "None") {
        return "us-east-1"
    }
    return $location
}

function Resolve-BucketName {
    $candidates = @(
        $script:PreferredBucketName,
        "$($script:PreferredBucketName)-obj"
    )

    foreach ($candidate in $candidates) {
        if (-not (Test-BucketExists -BucketName $candidate)) {
            return $candidate
        }

        Write-D06Log "Bucket exists: $candidate - inspecting ownership and compatibility"
        $region = Get-BucketRegion -BucketName $candidate
        if ($region -ne $script:Region) {
            Stop-D06 "Existing bucket '$candidate' is in region '$region', expected '$($script:Region)'"
        }

        try {
            Invoke-Aws -AwsArgs @("s3api", "head-bucket", "--bucket", $candidate, "--region", $script:Region) | Out-Null
            $script:BucketName = $candidate
            Test-BucketConfiguration -RequireCompatible
            return $candidate
        }
        catch {
            Stop-D06 "Bucket name '$candidate' exists but is not accessible in this account/region"
        }
    }

    Stop-D06 "Unable to resolve a compatible application bucket name"
}

function Set-BucketTags {
    param([string]$BucketName)
    $tagging = @{
        TagSet = @(
            @{ Key = "Project"; Value = $script:Project },
            @{ Key = "Environment"; Value = $script:Environment },
            @{ Key = "ManagedBy"; Value = $script:ManagedBy },
            @{ Key = "Name"; Value = $script:BucketTagName }
        )
    } | ConvertTo-Json -Compress -Depth 5
    $file = New-AwsCliJsonFile -JsonContent $tagging
    Invoke-Aws -AwsArgs @(
        "s3api", "put-bucket-tagging",
        "--bucket", $BucketName,
        "--tagging", $file
    ) | Out-Null
}

function New-ApplicationBucket {
    param([string]$BucketName)

    Write-D06Log "Creating S3 bucket $BucketName in $($script:Region)"
    if ($script:Region -eq "us-east-1") {
        Invoke-Aws -AwsArgs @(
            "s3api", "create-bucket",
            "--bucket", $BucketName,
            "--region", $script:Region
        ) | Out-Null
    }
    else {
        $config = '{"LocationConstraint":"' + $script:Region + '"}'
        $file = New-AwsCliJsonFile -JsonContent $config
        Invoke-Aws -AwsArgs @(
            "s3api", "create-bucket",
            "--bucket", $BucketName,
            "--region", $script:Region,
            "--create-bucket-configuration", $file
        ) | Out-Null
    }

    Set-BucketTags -BucketName $BucketName
}

function Set-BucketSecurityConfiguration {
    param([string]$BucketName)

    Invoke-Aws -AwsArgs @(
        "s3api", "put-public-access-block",
        "--bucket", $BucketName,
        "--public-access-block-configuration",
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    ) | Out-Null

    $ownership = '{"Rules":[{"ObjectOwnership":"BucketOwnerEnforced"}]}'
    Invoke-Aws -AwsArgs @(
        "s3api", "put-bucket-ownership-controls",
        "--bucket", $BucketName,
        "--ownership-controls", (New-AwsCliJsonFile -JsonContent $ownership)
    ) | Out-Null

    $encryption = '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
    Invoke-Aws -AwsArgs @(
        "s3api", "put-bucket-encryption",
        "--bucket", $BucketName,
        "--server-side-encryption-configuration", (New-AwsCliJsonFile -JsonContent $encryption)
    ) | Out-Null

    Invoke-Aws -AwsArgs @(
        "s3api", "put-bucket-versioning",
        "--bucket", $BucketName,
        "--versioning-configuration", "Status=Enabled"
    ) | Out-Null

    $lifecycle = '{"Rules":[{"ID":"abort-incomplete-multipart-uploads","Status":"Enabled","Filter":{"Prefix":""},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}'
    Invoke-Aws -AwsArgs @(
        "s3api", "put-bucket-lifecycle-configuration",
        "--bucket", $BucketName,
        "--lifecycle-configuration", (New-AwsCliJsonFile -JsonContent $lifecycle)
    ) | Out-Null
}

function Test-BucketConfiguration {
    param([switch]$RequireCompatible)

    $bucket = $script:BucketName
    $conflicts = @()

    $region = Get-BucketRegion -BucketName $bucket
    if ($region -ne $script:Region) {
        $conflicts += "region=$region"
    }

    $pab = Invoke-AwsJson -AwsArgs @("s3api", "get-public-access-block", "--bucket", $bucket)
    $cfg = $pab.PublicAccessBlockConfiguration
    foreach ($flag in @("BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets")) {
        if (-not $cfg.$flag) { $conflicts += "$flag=false" }
    }
    $script:BlockPublicAcls = [bool]$cfg.BlockPublicAcls
    $script:IgnorePublicAcls = [bool]$cfg.IgnorePublicAcls
    $script:BlockPublicPolicy = [bool]$cfg.BlockPublicPolicy
    $script:RestrictPublicBuckets = [bool]$cfg.RestrictPublicBuckets

    $ownership = Invoke-AwsJson -AwsArgs @("s3api", "get-bucket-ownership-controls", "--bucket", $bucket)
    $ownershipValue = $ownership.OwnershipControls.Rules[0].ObjectOwnership
    if ($ownershipValue -ne "BucketOwnerEnforced") {
        $conflicts += "objectOwnership=$ownershipValue"
    }
    $script:ObjectOwnership = $ownershipValue

    $encryption = Invoke-AwsJson -AwsArgs @("s3api", "get-bucket-encryption", "--bucket", $bucket)
    $sse = $encryption.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm
    if ($sse -ne "AES256") {
        $conflicts += "encryption=$sse"
    }
    $script:EncryptionAlgorithm = $sse

    $versioning = Invoke-AwsJson -AwsArgs @("s3api", "get-bucket-versioning", "--bucket", $bucket)
    if ($versioning.Status -ne "Enabled") {
        $conflicts += "versioning=$($versioning.Status)"
    }
    $script:VersioningEnabled = ($versioning.Status -eq "Enabled")

    $lifecycle = Invoke-AwsJson -AwsArgs @("s3api", "get-bucket-lifecycle-configuration", "--bucket", $bucket)
    $abortRule = $lifecycle.Rules | Where-Object {
        $_.AbortIncompleteMultipartUpload -and
        [int]$_.AbortIncompleteMultipartUpload.DaysAfterInitiation -eq 7
    }
    if (-not $abortRule) {
        $conflicts += "lifecycleAbortMultipart!=7days"
    }
    $script:LifecycleAbortDays = 7

    $cors = Invoke-AwsJson -AwsArgs @("s3api", "get-bucket-cors", "--bucket", $bucket) -AllowFailure
    if ($cors -and $cors.CORSRules -and $cors.CORSRules.Count -gt 0) {
        $conflicts += "corsConfigured=true"
    }
    $script:CorsConfigured = ($null -ne $cors -and $cors.CORSRules -and $cors.CORSRules.Count -gt 0)

    $website = Invoke-AwsJson -AwsArgs @("s3api", "get-bucket-website", "--bucket", $bucket) -AllowFailure
    if ($website) {
        $conflicts += "websiteHosting=enabled"
    }
    $script:WebsiteHostingEnabled = ($null -ne $website)

    if ($RequireCompatible -and $conflicts.Count -gt 0) {
        Stop-D06 "Existing bucket '$bucket' is incompatible: $($conflicts -join '; ')"
    }
}

function Get-S3PolicyDocument {
    param([string]$BucketName)
    return (@{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "BucketLevelAccess"
                Effect = "Allow"
                Action = @(
                    "s3:ListBucket",
                    "s3:GetBucketLocation"
                )
                Resource = "arn:aws:s3:::$BucketName"
            },
            @{
                Sid = "ObjectLevelAccess"
                Effect = "Allow"
                Action = @(
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject"
                )
                Resource = "arn:aws:s3:::$BucketName/*"
            }
        )
    } | ConvertTo-Json -Compress -Depth 6)
}

function Get-TrustPolicyDocument {
    return (@{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Principal = @{ Service = "ecs-tasks.amazonaws.com" }
                Action = "sts:AssumeRole"
            }
        )
    } | ConvertTo-Json -Compress -Depth 6)
}

function Get-ExistingRole {
    return (Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", $script:TaskRoleName) -AllowFailure)
}

function Get-ExistingPolicy {
    $arn = "arn:aws:iam::$($script:AccountId):policy/$($script:S3PolicyName)"
    return (Invoke-AwsJson -AwsArgs @("iam", "get-policy", "--policy-arn", $arn) -AllowFailure)
}

function New-OrReuseTaskRole {
    $existing = Get-ExistingRole
    if ($existing) {
        Write-D06Log "Reusing IAM role $($script:TaskRoleName)"
        $script:TaskRoleArn = $existing.Role.Arn
    }
    else {
        Write-D06Log "Creating IAM role $($script:TaskRoleName)"
        $trustFile = New-AwsCliJsonFile -JsonContent (Get-TrustPolicyDocument)
        $created = Invoke-AwsJson -AwsArgs @(
            "iam", "create-role",
            "--role-name", $script:TaskRoleName,
            "--assume-role-policy-document", $trustFile,
            "--tags",
            "Key=Project,Value=$($script:Project)",
            "Key=Environment,Value=$($script:Environment)",
            "Key=ManagedBy,Value=$($script:ManagedBy)"
        )
        $script:TaskRoleArn = $created.Role.Arn
    }

    $trust = Invoke-AwsJson -AwsArgs @("iam", "get-role", "--role-name", $script:TaskRoleName)
    $policyDoc = $trust.Role.AssumeRolePolicyDocument
    if ($policyDoc -is [string]) {
        $policyDoc = $policyDoc | ConvertFrom-Json
    }
    $statement = $policyDoc.Statement[0]
    if ($statement.Principal.Service -ne "ecs-tasks.amazonaws.com" -and
        -not (@($statement.Principal.Service) -contains "ecs-tasks.amazonaws.com")) {
        Stop-D06 "Task role trust policy must allow ecs-tasks.amazonaws.com"
    }
    if ($statement.Action -ne "sts:AssumeRole" -and -not (@($statement.Action) -contains "sts:AssumeRole")) {
        Stop-D06 "Task role trust policy must allow sts:AssumeRole"
    }
    $script:TrustPrincipal = "ecs-tasks.amazonaws.com"
}

function New-OrReuseS3Policy {
    param([string]$BucketName)

    $policyDoc = Get-S3PolicyDocument -BucketName $BucketName
    $policyArn = "arn:aws:iam::$($script:AccountId):policy/$($script:S3PolicyName)"
    $existing = Get-ExistingPolicy

    if ($existing) {
        Write-D06Log "Reusing IAM policy $($script:S3PolicyName)"
        $version = Invoke-AwsJson -AwsArgs @(
            "iam", "get-policy-version",
            "--policy-arn", $policyArn,
            "--version-id", $existing.Policy.DefaultVersionId
        )
        $rawDoc = $version.PolicyVersion.Document
        if ($rawDoc -is [string]) {
            try {
                $currentDoc = ($rawDoc | ConvertFrom-Json)
            }
            catch {
                $currentDoc = ([System.Net.WebUtility]::UrlDecode($rawDoc) | ConvertFrom-Json)
            }
        }
        else {
            $currentDoc = $rawDoc
        }
        $expectedDoc = ($policyDoc | ConvertFrom-Json)
        $currentJson = ($currentDoc | ConvertTo-Json -Compress -Depth 8)
        $expectedJson = ($expectedDoc | ConvertTo-Json -Compress -Depth 8)
        if ($currentJson -ne $expectedJson) {
            Write-D06Log "Updating IAM policy document for $($script:S3PolicyName)"
            Invoke-Aws -AwsArgs @(
                "iam", "create-policy-version",
                "--policy-arn", $policyArn,
                "--policy-document", (New-AwsCliJsonFile -JsonContent $policyDoc),
                "--set-as-default"
            ) | Out-Null
        }
    }
    else {
        Write-D06Log "Creating IAM policy $($script:S3PolicyName)"
        $created = Invoke-AwsJson -AwsArgs @(
            "iam", "create-policy",
            "--policy-name", $script:S3PolicyName,
            "--policy-document", (New-AwsCliJsonFile -JsonContent $policyDoc),
            "--tags",
            "Key=Project,Value=$($script:Project)",
            "Key=Environment,Value=$($script:Environment)",
            "Key=ManagedBy,Value=$($script:ManagedBy)"
        )
        $policyArn = $created.Policy.Arn
    }

    $script:S3PolicyArn = $policyArn
    $script:BucketLevelActions = @("s3:ListBucket", "s3:GetBucketLocation")
    $script:ObjectLevelActions = @("s3:GetObject", "s3:PutObject", "s3:DeleteObject")
    $script:PolicyResourceBucket = "arn:aws:s3:::$BucketName"
    $script:PolicyResourceObjects = "arn:aws:s3:::$BucketName/*"
}

function Attach-S3PolicyToTaskRole {
    $attached = Invoke-AwsJson -AwsArgs @(
        "iam", "list-attached-role-policies",
        "--role-name", $script:TaskRoleName
    )
    $isAttached = @($attached.AttachedPolicies | Where-Object { $_.PolicyArn -eq $script:S3PolicyArn })
    if (-not $isAttached) {
        Write-D06Log "Attaching $($script:S3PolicyName) to $($script:TaskRoleName)"
        Invoke-Aws -AwsArgs @(
            "iam", "attach-role-policy",
            "--role-name", $script:TaskRoleName,
            "--policy-arn", $script:S3PolicyArn
        ) | Out-Null
    }
}

function Test-LeastPrivilegeSimulation {
    param([string]$BucketName)

    $bucketArn = "arn:aws:s3:::$BucketName"
    $objectArn = "$bucketArn/$($script:VerificationObjectKey)"
    $otherBucketArn = "arn:aws:s3:::unrelated-eaziacall-test-bucket"
    $otherObjectArn = "$otherBucketArn/test.txt"

    $allowedActions = @(
        @{ Action = "s3:ListBucket"; Resource = $bucketArn; Expected = "allowed" },
        @{ Action = "s3:GetBucketLocation"; Resource = $bucketArn; Expected = "allowed" },
        @{ Action = "s3:GetObject"; Resource = $objectArn; Expected = "allowed" },
        @{ Action = "s3:PutObject"; Resource = $objectArn; Expected = "allowed" },
        @{ Action = "s3:DeleteObject"; Resource = $objectArn; Expected = "allowed" },
        @{ Action = "s3:ListBucket"; Resource = $otherBucketArn; Expected = "explicitDeny|implicitDeny" },
        @{ Action = "s3:PutObject"; Resource = $otherObjectArn; Expected = "explicitDeny|implicitDeny" }
    )

    foreach ($check in $allowedActions) {
        $result = Invoke-AwsJson -AwsArgs @(
            "iam", "simulate-principal-policy",
            "--policy-source-arn", $script:TaskRoleArn,
            "--action-names", $check.Action,
            "--resource-arns", $check.Resource
        )
        $decision = $result.EvaluationResults[0].EvalDecision
        if ($check.Expected -eq "allowed") {
            if ($decision -ne "allowed") {
                Stop-D06 "Policy simulation failed: $($check.Action) on $($check.Resource) expected allowed, got $decision"
            }
        }
        else {
            if ($decision -eq "allowed") {
                Stop-D06 "Policy simulation failed: $($check.Action) on $($check.Resource) must not be allowed, got $decision"
            }
        }
    }

    $adminAttached = Invoke-AwsJson -AwsArgs @(
        "iam", "list-attached-role-policies",
        "--role-name", $script:TaskRoleName
    )
    foreach ($policy in $adminAttached.AttachedPolicies) {
        if ($policy.PolicyName -in @("AdministratorAccess", "AmazonS3FullAccess")) {
            Stop-D06 "Task role must not have broad policy attached: $($policy.PolicyName)"
        }
    }
}

function Test-ObjectVerification {
    param([string]$BucketName)

    $localFile = Join-Path $env:TEMP "aws-d06-test.txt"
    "AWS-D06 deployment verification $(Get-Date -Format o)" | Set-Content -Path $localFile -Encoding utf8 -NoNewline

    Write-D06Log "Uploading temporary verification object"
    Invoke-Aws -AwsArgs @(
        "s3api", "put-object",
        "--bucket", $BucketName,
        "--key", $script:VerificationObjectKey,
        "--body", $localFile,
        "--content-type", "text/plain"
    ) | Out-Null
    $script:VerificationUpload = "PASS"

    Invoke-Aws -AwsArgs @(
        "s3api", "head-object",
        "--bucket", $BucketName,
        "--key", $script:VerificationObjectKey
    ) | Out-Null
    $script:VerificationHead = "PASS"

    $anonFile = Join-Path $env:TEMP "aws-d06-anon.txt"
    if (Test-Path $anonFile) { Remove-Item -Path $anonFile -Force }
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & aws s3api get-object `
        --bucket $BucketName `
        --key $script:VerificationObjectKey `
        $anonFile `
        --no-sign-request 2>$null | Out-Null
    $anonExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    if ($anonExitCode -eq 0) {
        Stop-D06 "Anonymous/public object read unexpectedly succeeded"
    }
    $script:VerificationPublicBlocked = "PASS"

    Write-D06Log "Deleting temporary verification object"
    Invoke-Aws -AwsArgs @(
        "s3api", "delete-object",
        "--bucket", $BucketName,
        "--key", $script:VerificationObjectKey
    ) | Out-Null
    $script:VerificationCleanup = "PASS"

    Remove-Item -Path $localFile -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $env:TEMP "aws-d06-anon.txt") -Force -ErrorAction SilentlyContinue
}

function Write-Inventory {
    param($ExistingInventory)

    $objectStorage = [ordered]@{
        bucketName          = $script:BucketName
        bucketArn           = "arn:aws:s3:::$($script:BucketName)"
        region              = $script:Region
        versioning          = $true
        encryption          = "AES256"
        publicAccessBlocked = $true
        objectOwnership     = $script:ObjectOwnership
    }

    $iam = [ordered]@{
        ecsTaskRoleName = $script:TaskRoleName
        ecsTaskRoleArn  = $script:TaskRoleArn
        s3PolicyName    = $script:S3PolicyName
        s3PolicyArn     = $script:S3PolicyArn
    }

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }
    $inventory.environment = $script:Environment
    $inventory.region = $script:Region
    $inventory.accountId = $script:AccountId
    $inventory.objectStorage = $objectStorage
    $inventory.iam = $iam

    $dir = Split-Path $script:InventoryFile -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    ($inventory | ConvertTo-Json -Depth 10) | Set-Content -Path $script:InventoryFile -Encoding utf8
    Write-D06Log "Wrote inventory: $($script:InventoryFile)"
}

# --- Main ---
Test-CommandExists "aws"

$script:Region = Get-ResolvedRegion
if ($script:Region -ne "us-east-1") {
    Stop-D06 "Region must be us-east-1; got '$($script:Region)'"
}

$identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
$script:AccountId = $identity.Account
$script:CallerArn = $identity.Arn
if ($script:AccountId -ne "812047028300") {
    Stop-D06 "Expected account 812047028300; got '$($script:AccountId)'"
}

Write-D06Log "Using region: $($script:Region)"
Write-D06Log "AWS account: $($script:AccountId)"
Write-D06Log "Caller: $($script:CallerArn)"

$inventory = Read-Inventory
Test-InventoryPrerequisites -Inventory $inventory

$resolvedBucket = Resolve-BucketName
$script:BucketName = $resolvedBucket
Write-D06Log "Using bucket: $($script:BucketName)"

if (-not (Test-BucketExists -BucketName $script:BucketName)) {
    New-ApplicationBucket -BucketName $script:BucketName
}
else {
    Write-D06Log "Reusing existing bucket $($script:BucketName)"
}

Set-BucketSecurityConfiguration -BucketName $script:BucketName
Set-BucketTags -BucketName $script:BucketName
Test-BucketConfiguration -RequireCompatible

New-OrReuseTaskRole
New-OrReuseS3Policy -BucketName $script:BucketName
Attach-S3PolicyToTaskRole
Test-LeastPrivilegeSimulation -BucketName $script:BucketName
Test-ObjectVerification -BucketName $script:BucketName
Write-Inventory -ExistingInventory $inventory

Write-D06Log "AWS-D06 S3 + IAM complete."
