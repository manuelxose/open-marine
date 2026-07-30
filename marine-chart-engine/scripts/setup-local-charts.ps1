param(
  [string]$DataDir = "",
  [switch]$DiagnoseOnly
)

$ErrorActionPreference = "Stop"
$engineRoot = Split-Path -Parent $PSScriptRoot
$resolvedEngineRoot = (Resolve-Path -LiteralPath $engineRoot).Path

if ([string]::IsNullOrWhiteSpace($DataDir)) {
  $DataDir = Join-Path $resolvedEngineRoot "data"
}

if (-not $DiagnoseOnly) {
  New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "charts") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "chart-cache") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "secure") | Out-Null
}

$env:CHART_ENGINE_DATA_DIR = $DataDir
Push-Location $resolvedEngineRoot
try {
  npm run diagnose:installation
} finally {
  Pop-Location
}
