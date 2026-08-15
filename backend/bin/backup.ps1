param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$required = @('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD')
foreach ($name in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "$name must be explicitly set in the process environment."
    }
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$backupPath = Join-Path $resolvedOutput "quiet-recall-$timestamp.sql"
$env:MYSQL_PWD = [Environment]::GetEnvironmentVariable('DB_PASSWORD')
try {
    & mysqldump --single-transaction --routines --triggers `
        --host=$env:DB_HOST --port=$env:DB_PORT --user=$env:DB_USER `
        --result-file=$backupPath $env:DB_NAME
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump failed with exit code $LASTEXITCODE."
    }
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

Write-Output $backupPath
