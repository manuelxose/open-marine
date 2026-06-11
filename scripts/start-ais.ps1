Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AisBin = Join-Path $ProjectRoot "tools\ais-catcher\AIS-catcher.exe"
$ConfigFile = if ($env:OMI_CONFIG_FILE) { $env:OMI_CONFIG_FILE } else { Join-Path $ProjectRoot "config\omi.env" }

function Load-OmiConfigFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $result
  }

  $lines = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
    if ($trimmed.StartsWith("#")) { continue }

    if ($trimmed -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()

      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      $result[$key] = $value
    }
  }

  return $result
}

if (-not [System.IO.Path]::IsPathRooted($ConfigFile)) {
  $ConfigFile = Join-Path $ProjectRoot $ConfigFile
}

$configValues = Load-OmiConfigFile -Path $ConfigFile
$PPM = if ($env:AIS_PPM) { $env:AIS_PPM } elseif ($configValues.ContainsKey("AIS_PPM")) { [string]$configValues["AIS_PPM"] } else { "-50" }
$Gain = if ($env:AIS_GAIN) { $env:AIS_GAIN } elseif ($configValues.ContainsKey("AIS_GAIN")) { [string]$configValues["AIS_GAIN"] } else { "33" }
$Host_ = if ($env:AIS_HOST) { $env:AIS_HOST } elseif ($configValues.ContainsKey("AIS_HOST")) { [string]$configValues["AIS_HOST"] } else { "127.0.0.1" }
$Port = if ($env:AIS_PORT) { $env:AIS_PORT } elseif ($configValues.ContainsKey("AIS_PORT")) { [string]$configValues["AIS_PORT"] } else { "10110" }

if (-not (Test-Path $AisBin)) {
  Write-Host "[ERROR] AIS-catcher no encontrado en $AisBin" -ForegroundColor Red
  Write-Host "        Ejecuta scripts\init.ps1 primero." -ForegroundColor Red
  exit 1
}

Write-Host "[AIS] Iniciando AIS-catcher -> UDP ${Host_}:${Port} (PPM=$PPM, GAIN=$Gain)" -ForegroundColor Green
& $AisBin -d:0 -gr TUNER $Gain RTLAGC off -p $PPM -u $Host_ $Port -v 2
