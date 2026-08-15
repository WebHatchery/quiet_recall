param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedDatabase
)

$ErrorActionPreference = 'Stop'
$resolvedBackup = [System.IO.Path]::GetFullPath($BackupPath)
if (-not [System.IO.File]::Exists($resolvedBackup)) {
    throw "Backup file does not exist: $resolvedBackup"
}
if ($ExpectedDatabase -ne $env:DB_NAME) {
    throw 'ExpectedDatabase must exactly match DB_NAME.'
}
$required = @('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD')
foreach ($name in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "$name must be explicitly set in the process environment."
    }
}

$env:MYSQL_PWD = [Environment]::GetEnvironmentVariable('DB_PASSWORD')
try {
    Get-Content -Raw -LiteralPath $resolvedBackup |
        & mysql --host=$env:DB_HOST --port=$env:DB_PORT --user=$env:DB_USER $env:DB_NAME
    if ($LASTEXITCODE -ne 0) {
        throw "mysql restore failed with exit code $LASTEXITCODE."
    }
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

Write-Output "Restored $resolvedBackup into $env:DB_NAME"
