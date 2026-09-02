# EaziAICall AWS-D07 - ECR + Production Backend Docker Image (idempotent)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$script:Project = "EaziAICall"
$script:Environment = "production"
$script:ManagedBy = "aws-cli"
$script:RepositoryName = "eaziacall-prod-backend"
$script:BuildPlatform = "linux/amd64"
$script:ExpectedAccountId = "812047028300"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:BackendDir = Join-Path $script:RepoRoot "ai-call-agent-backend"
$script:InventoryFile = Join-Path $script:RepoRoot "docs/aws-deployment/aws-resource-inventory.json"

function Write-D07Log {
    param([string]$Message)
    Write-Host "[d07-ecr-image] $Message"
}

function Stop-D07 {
    param([string]$Message)
    Write-Error "[d07-ecr-image] ERROR: $Message"
    exit 1
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-D07 "Required command not found: $Name"
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
        Stop-D07 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
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
        Stop-D07 "AWS CLI failed (exit $exitCode): aws $($AwsArgs -join ' ') :: $detail"
    }
    $raw = $output
    if ($raw -is [System.Array]) {
        $raw = ($raw | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join "`n"
    }
    if ([string]::IsNullOrWhiteSpace([string]$raw)) {
        if ($AllowFailure) { return $null }
        Stop-D07 "AWS CLI returned empty JSON: aws $($AwsArgs -join ' ')"
    }
    return ($raw | ConvertFrom-Json)
}

function New-AwsCliJsonFile {
    param([Parameter(Mandatory = $true)][string]$JsonContent)
    $tempPath = Join-Path $env:TEMP ("d07-{0}.json" -f [Guid]::NewGuid().ToString("N"))
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempPath, $JsonContent, $utf8NoBom)
    return ("file://{0}" -f ($tempPath -replace '\\', '/'))
}

function Get-ResolvedRegion {
    if ($env:AWS_REGION) { return $env:AWS_REGION.Trim() }
    if ($env:AWS_DEFAULT_REGION) { return $env:AWS_DEFAULT_REGION.Trim() }
    $configured = Normalize-AwsText (Invoke-AwsText -AwsArgs @("configure", "get", "region"))
    if ($configured) { return $configured }
    Stop-D07 "AWS region is not configured."
}

function Read-Inventory {
    if (-not (Test-Path $script:InventoryFile)) {
        Stop-D07 "Resource inventory not found: $($script:InventoryFile)"
    }
    try {
        return (Get-Content -Path $script:InventoryFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        Stop-D07 "Failed to parse resource inventory."
    }
}

function Test-InventoryPrerequisites {
    param($Inventory)
    foreach ($section in @("network", "database", "objectStorage", "iam")) {
        if (-not $Inventory.$section) {
            Stop-D07 "Inventory missing required section: $section (complete D03/D04/D06 first)"
        }
    }
}

function Test-DockerDaemon {
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & docker info 2>$null | Out-Null
    $ok = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previousErrorAction
    if (-not $ok) {
        Stop-D07 "Docker daemon is not running or not accessible."
    }
    $versionJson = & docker version --format "{{json .}}" 2>$null
    if ($LASTEXITCODE -eq 0 -and $versionJson) {
        $script:DockerVersion = (($versionJson | ConvertFrom-Json).Client.Version)
    }
    else {
        $script:DockerVersion = (docker version --format "{{.Client.Version}}" 2>$null)
    }
}

function Test-BackendDockerContract {
    $dockerfile = Join-Path $script:BackendDir "Dockerfile"
    $packageJson = Join-Path $script:BackendDir "package.json"
    if (-not (Test-Path $dockerfile)) { Stop-D07 "Missing Dockerfile: $dockerfile" }
    if (-not (Test-Path $packageJson)) { Stop-D07 "Missing package.json: $packageJson" }

    $content = Get-Content -Path $dockerfile -Raw
    if ($content -notmatch 'CMD\s*\[\s*"node"\s*,\s*"dist/main\.js"\s*\]') {
        Stop-D07 "Dockerfile CMD must be node dist/main.js (no auto-migrations in app container)"
    }
    if ($content -match 'migration:run|bootstrap-eazi-migrations') {
        Stop-D07 "Dockerfile must not auto-run migrations in CMD/ENTRYPOINT"
    }

    $dockerignore = Join-Path $script:BackendDir ".dockerignore"
    if (-not (Test-Path $dockerignore)) {
        Stop-D07 "Missing .dockerignore in backend directory"
    }
    $ignore = Get-Content -Path $dockerignore -Raw
    if ($ignore -notmatch '(?m)^\.env') {
        Stop-D07 ".dockerignore must exclude .env files"
    }

    $appModule = Join-Path $script:BackendDir "src/app.module.ts"
    if (-not (Test-Path $appModule)) { Stop-D07 "Missing app.module.ts" }
    $appContent = Get-Content -Path $appModule -Raw
    if ($appContent -notmatch 'synchronize:\s*false') {
        Stop-D07 "app.module.ts must keep synchronize=false"
    }

    $script:ProductionCmd = '["node", "dist/main.js"]'
}

function Get-GitMetadata {
    Push-Location $script:RepoRoot
    try {
        $sha = (git rev-parse --short HEAD).Trim().ToLower()
        $porcelain = git status --porcelain
        $script:GitSha = $sha
        $script:WorkingTreeDirty = ($null -ne $porcelain -and @($porcelain).Count -gt 0 -and -not [string]::IsNullOrWhiteSpace(($porcelain -join "").Trim()))
    }
    finally {
        Pop-Location
    }
}

function New-ReleaseTag {
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'")
    return ("{0}-{1}" -f $script:GitSha, $timestamp).ToLower()
}

function Test-ImageInEcr {
    param([string]$Tag)
    $result = Invoke-AwsJson -AwsArgs @(
        "ecr", "describe-images",
        "--region", $script:Region,
        "--repository-name", $script:RepositoryName,
        "--image-ids", "imageTag=$Tag"
    ) -AllowFailure
    if (-not $result -or -not $result.imageDetails -or $result.imageDetails.Count -eq 0) {
        return $null
    }
    return $result.imageDetails[0]
}

function Get-ExistingEcrRepository {
    return (Invoke-AwsJson -AwsArgs @(
        "ecr", "describe-repositories",
        "--region", $script:Region,
        "--repository-names", $script:RepositoryName
    ) -AllowFailure)
}

function Test-EcrRepositoryCompatible {
    param($Repo)
    $conflicts = @()
    if ($Repo.imageTagMutability -ne "IMMUTABLE") { $conflicts += "imageTagMutability=$($Repo.imageTagMutability)" }
    if (-not $Repo.imageScanningConfiguration.scanOnPush) { $conflicts += "scanOnPush=false" }
    if ($Repo.encryptionConfiguration.encryptionType -ne "AES256") {
        $conflicts += "encryption=$($Repo.encryptionConfiguration.encryptionType)"
    }
    if ($conflicts.Count -gt 0) {
        Stop-D07 "Existing ECR repository is incompatible: $($conflicts -join '; ')"
    }
}

function New-OrReuseEcrRepository {
    $existing = Get-ExistingEcrRepository
    if ($existing -and $existing.repositories -and $existing.repositories.Count -gt 0) {
        Write-D07Log "Reusing ECR repository $($script:RepositoryName)"
        $repo = $existing.repositories[0]
    }
    else {
        Write-D07Log "Creating ECR repository $($script:RepositoryName)"
        $created = Invoke-AwsJson -AwsArgs @(
            "ecr", "create-repository",
            "--region", $script:Region,
            "--repository-name", $script:RepositoryName,
            "--image-scanning-configuration", "scanOnPush=true",
            "--image-tag-mutability", "IMMUTABLE",
            "--encryption-configuration", "encryptionType=AES256",
            "--tags",
            "Key=Project,Value=$($script:Project)",
            "Key=Environment,Value=$($script:Environment)",
            "Key=ManagedBy,Value=$($script:ManagedBy)",
            "Key=Name,Value=$($script:RepositoryName)"
        )
        $repo = $created.repository
    }

    Test-EcrRepositoryCompatible -Repo $repo
    Invoke-Aws -AwsArgs @(
        "ecr", "put-image-scanning-configuration",
        "--region", $script:Region,
        "--repository-name", $script:RepositoryName,
        "--image-scanning-configuration", "scanOnPush=true"
    ) | Out-Null

    $script:RepositoryArn = $repo.repositoryArn
    $script:RepositoryUri = $repo.repositoryUri
    $script:TagMutability = $repo.imageTagMutability
    $script:ScanOnPush = [bool]$repo.imageScanningConfiguration.scanOnPush
    $script:EncryptionType = $repo.encryptionConfiguration.encryptionType
}

function Set-EcrLifecyclePolicy {
    $policy = @'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images after 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 10,
      "description": "Retain latest 20 repository images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 20
      },
      "action": { "type": "expire" }
    }
  ]
}
'@
    $policyFile = New-AwsCliJsonFile -JsonContent $policy
    Invoke-Aws -AwsArgs @(
        "ecr", "put-lifecycle-policy",
        "--region", $script:Region,
        "--repository-name", $script:RepositoryName,
        "--lifecycle-policy-text", $policyFile
    ) | Out-Null
    $script:LifecyclePolicySummary = "Keep latest 20 tagged images; expire untagged after 7 days"
}

function Invoke-EcrDockerLogin {
    $registry = "$($script:AccountId).dkr.ecr.$($script:Region).amazonaws.com"
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    cmd /c "aws ecr get-login-password --region $($script:Region) | docker login --username AWS --password-stdin $registry" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Stop-D07 "Docker login to ECR registry failed"
    }
    $ErrorActionPreference = $previousErrorAction
}

function Test-ImageReuseEligible {
    param(
        [string]$Tag,
        [string]$ExpectedDigest,
        $InventoryImage
    )
    $existingDetail = Test-ImageInEcr -Tag $Tag
    if (-not $existingDetail -or $existingDetail.imageDigest -ne $ExpectedDigest) {
        return $false
    }
    if ($existingDetail.imageManifestMediaType -eq "application/vnd.oci.image.index.v1+json") {
        Write-D07Log "Existing image manifest is OCI index (not ECR-scannable); rebuilding with single-platform manifest"
        return $false
    }
    $criticalCount = 0
    if ($InventoryImage -and $null -ne $InventoryImage.scanCriticalCount) {
        $criticalCount = [int]$InventoryImage.scanCriticalCount
    }
    if ($criticalCount -gt 0) {
        Write-D07Log "Inventory image has CRITICAL scan findings ($criticalCount); creating new remediation release"
        return $false
    }
    return $true
}

function Get-OpenSslPackageVersions {
    param([string]$LocalTag)
    $output = docker run --rm --entrypoint sh $LocalTag -c "cat /etc/alpine-release; apk list --installed libssl3 libcrypto3 openssl 2>/dev/null"
    if ($LASTEXITCODE -ne 0) {
        Stop-D07 "Failed to inspect OpenSSL packages in image"
    }
    return (Normalize-AwsText ([string]$output))
}

function Test-OpenSslPatched {
    param([string]$LocalTag)
    $versions = Get-OpenSslPackageVersions -LocalTag $LocalTag
    Write-D07Log "Runtime OpenSSL packages:`n$versions"
    if ($versions -match 'lib(ssl3|crypto3)-3\.5\.([0-7])-r[0-9]+') {
        Stop-D07 "OpenSSL packages remain in vulnerable 3.5.0-3.5.7 range; remediation build blocked"
    }
    if ($versions -notmatch 'lib(ssl3|crypto3)-3\.5\.([89]|[1-9][0-9]+)-r[0-9]+') {
        Stop-D07 "Expected patched OpenSSL 3.5.8+ packages not detected in final image"
    }
    if ($versions -match '(^|\s)([0-9]+\.[0-9]+\.[0-9]+)(\s|$)') {
        $script:AlpineVersion = $Matches[2]
    }
    if ($versions -match 'libssl3-([0-9]+\.[0-9]+\.[0-9]+-r[0-9]+)') {
        $script:OpenSslPackageVersion = $Matches[1]
    }
    elseif ($versions -match 'libcrypto3-([0-9]+\.[0-9]+\.[0-9]+-r[0-9]+)') {
        $script:OpenSslPackageVersion = $Matches[1]
    }
}

function Build-BackendImage {
    param([string]$LocalTag)
    Write-D07Log "Building production image ($($script:BuildPlatform)) with --pull --no-cache..."
    $dockerfile = Join-Path $script:BackendDir "Dockerfile"
    & docker build --pull --no-cache --platform $script:BuildPlatform --provenance=false --sbom=false -t $LocalTag -f $dockerfile $script:BackendDir
    if ($LASTEXITCODE -ne 0) {
        Stop-D07 "Docker build failed"
    }
}

function Test-LocalImage {
    param([string]$LocalTag)
    $inspect = docker image inspect $LocalTag --format "{{json .}}" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($inspect)) {
        Stop-D07 "Local image not found after build: $LocalTag"
    }
    $meta = $inspect | ConvertFrom-Json
    $arch = $meta.Architecture
    $os = $meta.Os
    if ($arch -ne "amd64") { Stop-D07 "Image architecture must be amd64; got $arch" }
    if ($os -ne "linux") { Stop-D07 "Image OS must be linux; got $os" }

    $cmdJson = ($meta.Config.Cmd | ConvertTo-Json -Compress)
    if ($cmdJson -notmatch 'dist/main\.js') {
        Stop-D07 "Image CMD must start NestJS via dist/main.js"
    }
    if ($cmdJson -match 'migration') {
        Stop-D07 "Image CMD must not include migration commands"
    }

    $exposed = @($meta.Config.ExposedPorts.PSObject.Properties.Name)
    if ($exposed -notcontains "3000/tcp") {
        Stop-D07 "Image must expose port 3000/tcp"
    }

    $script:ImageArchitecture = $arch
    $script:ImageOs = $os
    $script:ImageCmd = $cmdJson
}

function Test-MigrationToolingInImage {
    param([string]$LocalTag)
    $checkCmd = "test -f dist/database/bootstrap-eazi-migrations.js && test -f dist/database/data-source.js && test -f node_modules/typeorm/cli.js"
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & docker run --rm --entrypoint sh $LocalTag -c $checkCmd 2>$null | Out-Null
    $ok = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previousErrorAction
    if (-not $ok) {
        Stop-D07 "Migration tooling missing from image (bootstrap-eazi-migrations.js, data-source.js, or typeorm CLI)"
    }
    $script:MigrationToolingPresent = $true
}

function Push-ImageToEcr {
    param([string]$LocalTag, [string]$RemoteTag)
    Write-D07Log "Pushing image to ECR: $RemoteTag"
    & docker push $RemoteTag 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Stop-D07 "Docker push failed for $RemoteTag"
    }
}

function Wait-ImageScan {
    param([string]$Tag)
    $maxAttempts = 18
    $delaySeconds = 10
    $script:ScanStatus = "PENDING"
    $script:ScanCriticalCount = 0
    $script:ScanHighCount = 0

    for ($i = 0; $i -lt $maxAttempts; $i++) {
        $findings = Invoke-AwsJson -AwsArgs @(
            "ecr", "describe-image-scan-findings",
            "--region", $script:Region,
            "--repository-name", $script:RepositoryName,
            "--image-id", "imageTag=$Tag"
        ) -AllowFailure

        if ($findings -and $findings.imageScanStatus) {
            $statusValue = $findings.imageScanStatus
            if ($statusValue -is [pscustomobject] -and $statusValue.status) {
                $script:ScanStatus = [string]$statusValue.status
            }
            else {
                $script:ScanStatus = [string]$statusValue
            }
            if ($findings.imageScanFindings -and $findings.imageScanFindings.findingSeverityCounts) {
                $counts = $findings.imageScanFindings.findingSeverityCounts
                $script:ScanCriticalCount = if ($counts.CRITICAL) { [int]$counts.CRITICAL } else { 0 }
                $script:ScanHighCount = if ($counts.HIGH) { [int]$counts.HIGH } else { 0 }
            }
            if ($script:ScanStatus -eq "COMPLETE") { return }
            if ($script:ScanStatus -eq "FAILED") {
                Write-D07Log "Image scan status FAILED; continuing with metadata-only verification"
                return
            }
        }
        Start-Sleep -Seconds $delaySeconds
    }
    Write-D07Log "Image scan still in progress after wait window; status=$($script:ScanStatus)"
}

function Test-ScanResults {
    if ($script:ScanStatus -eq "COMPLETE" -and $script:ScanCriticalCount -gt 0) {
        Stop-D07 "ECR vulnerability scan reports $($script:ScanCriticalCount) CRITICAL finding(s) - deployment blocked"
    }
}

function Test-CveAbsentFromScan {
    param([string]$Tag)
    if ($script:ScanStatus -ne "COMPLETE") {
        Stop-D07 "ECR scan did not reach COMPLETE; cannot confirm CVE remediation"
    }
    $findings = Invoke-AwsJson -AwsArgs @(
        "ecr", "describe-image-scan-findings",
        "--region", $script:Region,
        "--repository-name", $script:RepositoryName,
        "--image-id", "imageTag=$Tag"
    )
    $cveHits = @()
    if ($findings.imageScanFindings.findings) {
        $cveHits = @($findings.imageScanFindings.findings | Where-Object { $_.name -eq "CVE-2026-63073" -or $_.uri -match "CVE-2026-63073" })
    }
    $script:Cve202663073Present = ($cveHits.Count -gt 0)
    if ($script:Cve202663073Present) {
        Stop-D07 "ECR scan still reports CVE-2026-63073 on canonical image"
    }
}

function Update-ImageMetadataFromEcr {
    param([string]$Tag)
    $detail = Test-ImageInEcr -Tag $Tag
    if (-not $detail) {
        Stop-D07 "Pushed image not found in ECR: $Tag"
    }
    $script:ReleaseTag = $Tag
    $script:ImageDigest = $detail.imageDigest
    $script:ImagePushedAt = $detail.imagePushedAt
    $script:ImageSizeBytes = [int64]$detail.imageSizeInBytes
    $script:ImageUri = "$($script:RepositoryUri):$Tag"
    if ($detail.imageScanStatus) {
        $script:ScanStatus = $detail.imageScanStatus
    }
}

function Write-Inventory {
    param($ExistingInventory)

    $containerRegistry = [ordered]@{
        repositoryName = $script:RepositoryName
        repositoryArn  = $script:RepositoryArn
        repositoryUri  = $script:RepositoryUri
        scanOnPush     = $true
        tagMutability  = "IMMUTABLE"
        encryption     = "AES256"
    }

    $backendImage = [ordered]@{
        gitSha            = $script:GitSha
        workingTreeDirty  = [bool]$script:WorkingTreeDirty
        tag               = $script:ReleaseTag
        digest            = $script:ImageDigest
        imageUri          = $script:ImageUri
        platform          = $script:BuildPlatform
        imageSizeBytes    = $script:ImageSizeBytes
        scanStatus        = $script:ScanStatus
        scanCriticalCount = $script:ScanCriticalCount
        scanHighCount     = $script:ScanHighCount
        alpineVersion     = $script:AlpineVersion
        opensslPackageVersion = $script:OpenSslPackageVersion
        cve202663073Present = $false
    }

    $deprecatedImages = @(
        [ordered]@{
            tag      = "aa49b93-20260901t122259z"
            digest   = "sha256:322af9a4129db70af7f5ea6f348a22d9bb7f30214532d9bf6647d4cefdff884a"
            status   = "NON-CANONICAL / DO NOT DEPLOY"
            reason   = "OCI index manifest; not ECR-scannable"
        },
        [ordered]@{
            tag      = "aa49b93-20260901t123434z"
            digest   = "sha256:e3ca25e9ebd720fc3b1963b6f7a1872c1f6d92da3b913ffa7941bb83bcfc2830"
            status   = "NON-CANONICAL / DO NOT DEPLOY"
            reason   = "ECR CRITICAL CVE-2026-63073 (OpenSSL 3.5.7-r0)"
        }
    )

    $inventory = [ordered]@{}
    foreach ($prop in $ExistingInventory.PSObject.Properties) {
        $inventory[$prop.Name] = $prop.Value
    }
    $inventory.environment = $script:Environment
    $inventory.region = $script:Region
    $inventory.accountId = $script:AccountId
    $inventory.containerRegistry = $containerRegistry
    $inventory.backendImage = $backendImage
    $inventory.deprecatedBackendImages = $deprecatedImages

    ($inventory | ConvertTo-Json -Depth 10) | Set-Content -Path $script:InventoryFile -Encoding utf8
    Write-D07Log "Wrote inventory: $($script:InventoryFile)"
}

# --- Main ---
Test-CommandExists "aws"
Test-CommandExists "docker"
Test-CommandExists "git"

$script:Region = Get-ResolvedRegion
if ($script:Region -ne "us-east-1") { Stop-D07 "Region must be us-east-1" }

$identity = Invoke-AwsJson -AwsArgs @("sts", "get-caller-identity")
$script:AccountId = $identity.Account
$script:CallerArn = $identity.Arn
if ($script:AccountId -ne $script:ExpectedAccountId) {
    Stop-D07 "Expected account $($script:ExpectedAccountId); got $($script:AccountId)"
}

Write-D07Log "Using region: $($script:Region)"
Write-D07Log "AWS account: $($script:AccountId)"
Write-D07Log "Caller: $($script:CallerArn)"

$inventory = Read-Inventory
Test-InventoryPrerequisites -Inventory $inventory
Test-DockerDaemon
Test-BackendDockerContract
Get-GitMetadata

Write-D07Log "Git SHA: $($script:GitSha); working tree dirty: $($script:WorkingTreeDirty)"

New-OrReuseEcrRepository
Set-EcrLifecyclePolicy

$reuseExisting = $false
$forceRebuild = ($env:EAZI_FORCE_ECR_REBUILD -eq "1") -or ($args -contains "-ForceRebuild")
if ($forceRebuild) {
    Write-D07Log "Force rebuild requested; skipping existing image reuse"
}
if (-not $forceRebuild -and $inventory.backendImage -and $inventory.backendImage.tag -and $inventory.backendImage.digest) {
    $existingTag = [string]$inventory.backendImage.tag
    $existingDigest = [string]$inventory.backendImage.digest
    if (Test-ImageReuseEligible -Tag $existingTag -ExpectedDigest $existingDigest -InventoryImage $inventory.backendImage) {
        Write-D07Log "Reusing existing D07 image from inventory: $existingTag"
        $existingDetail = Test-ImageInEcr -Tag $existingTag
        $script:ReleaseTag = $existingTag
        $script:ImageDigest = $existingDetail.imageDigest
        $script:ImagePushedAt = $existingDetail.imagePushedAt
        $script:ImageSizeBytes = [int64]$existingDetail.imageSizeInBytes
        $script:ImageUri = "$($script:RepositoryUri):$existingTag"
        $script:ImageArchitecture = "amd64"
        $script:ImageOs = "linux"
        $script:MigrationToolingPresent = $true
        if ($inventory.backendImage.alpineVersion) {
            $script:AlpineVersion = [string]$inventory.backendImage.alpineVersion
        }
        if ($inventory.backendImage.opensslPackageVersion) {
            $script:OpenSslPackageVersion = [string]$inventory.backendImage.opensslPackageVersion
        }
        $reuseExisting = $true
    }
}

if (-not $reuseExisting) {
    $script:ReleaseTag = New-ReleaseTag
    if (Test-ImageInEcr -Tag $script:ReleaseTag) {
        Stop-D07 "Release tag already exists in ECR (immutable): $($script:ReleaseTag)"
    }

    $localTag = "$($script:RepositoryName):$($script:ReleaseTag)"
    Build-BackendImage -LocalTag $localTag
    Test-LocalImage -LocalTag $localTag
    Test-OpenSslPatched -LocalTag $localTag
    Test-MigrationToolingInImage -LocalTag $localTag

    Invoke-EcrDockerLogin
    $remoteTag = "$($script:RepositoryUri):$($script:ReleaseTag)"
    & docker tag $localTag $remoteTag
    if ($LASTEXITCODE -ne 0) { Stop-D07 "Failed to tag image for ECR" }
    Push-ImageToEcr -LocalTag $localTag -RemoteTag $remoteTag
    Update-ImageMetadataFromEcr -Tag $script:ReleaseTag
}

Wait-ImageScan -Tag $script:ReleaseTag
Test-ScanResults
Test-CveAbsentFromScan -Tag $script:ReleaseTag
Write-Inventory -ExistingInventory $inventory

Write-D07Log "AWS-D07 ECR backend image complete."
