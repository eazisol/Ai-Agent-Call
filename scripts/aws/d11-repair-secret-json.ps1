# One-off repair: rewrite malformed Secrets Manager JSON using file:// (no secret values printed)
#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Region = "us-east-1"

function Get-MalformedSecretValues {
    param([string]$Raw, [string[]]$Keys)
    $inner = $Raw.Trim().TrimStart('{').TrimEnd('}')
    $result = @{}
    for ($i = 0; $i -lt $Keys.Count; $i++) {
        $key = $Keys[$i]
        $nextKeys = @()
        if ($i + 1 -lt $Keys.Count) {
            $nextKeys = $Keys[($i + 1)..($Keys.Count - 1)]
        }
        if ($nextKeys.Count -gt 0) {
            $nextPattern = ($nextKeys | ForEach-Object { [regex]::Escape($_) }) -join '|'
            $pattern = "$([regex]::Escape($key)):(.+?)(?=,(?:$nextPattern):|$)"
        }
        else {
            $pattern = "$([regex]::Escape($key)):(.+)$"
        }
        if ($inner -match $pattern) {
            $result[$key] = $Matches[1].Trim()
        }
    }
    return $result
}

function Repair-Secret {
    param([string]$SecretId, [string[]]$Keys)
    $raw = aws secretsmanager get-secret-value --region $Region --secret-id $SecretId --query SecretString --output text
    if ($raw -match '^\s*\{"') {
        Write-Host "[repair] $SecretId already valid JSON"
        return
    }
    $values = Get-MalformedSecretValues -Raw $raw -Keys $Keys
    foreach ($key in $Keys) {
        if (-not $values.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$values[$key])) {
            throw "Failed to parse key $key from $SecretId"
        }
    }
    $json = ($values | ConvertTo-Json -Compress -Depth 4)
    $temp = Join-Path $env:TEMP ("repair-secret-{0}.json" -f [Guid]::NewGuid().ToString('N'))
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($temp, $json, $utf8)
    $fileUri = "file://{0}" -f ($temp -replace '\\', '/')
    aws secretsmanager put-secret-value --region $Region --secret-id $SecretId --secret-string $fileUri | Out-Null
    Remove-Item $temp -Force
    Write-Host "[repair] $SecretId rewritten as valid JSON"
}

Repair-Secret -SecretId "eaziacall/prod/auth" -Keys @("AUTH_JWT_ACCESS_SECRET")
Repair-Secret -SecretId "eaziacall/prod/smtp" -Keys @("SMTP_PASSWORD", "SMTP_USER")
Repair-Secret -SecretId "eaziacall/prod/twilio" -Keys @("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN")
Repair-Secret -SecretId "eaziacall/prod/elevenlabs" -Keys @("ELEVENLABS_API_KEY", "ELEVENLABS_WEBHOOK_SECRET")
Repair-Secret -SecretId "eaziacall/prod/voice" -Keys @("VOICE_STREAM_SIGNING_SECRET")

Write-Host "[repair] complete"
