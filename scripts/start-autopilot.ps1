Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$EngineDir = Join-Path $ProjectRoot "marine-autopilot-engine"
$ConfigFile = if ($env:OMI_CONFIG_FILE) { $env:OMI_CONFIG_FILE } else { Join-Path $ProjectRoot "config\omi.env" }

if (-not [System.IO.Path]::IsPathRooted($ConfigFile)) {
  $ConfigFile = Join-Path $ProjectRoot $ConfigFile
}

if (Test-Path $ConfigFile) {
  foreach ($Line in Get-Content $ConfigFile) {
    $Trimmed = $Line.Trim()
    if (-not $Trimmed -or $Trimmed.StartsWith("#")) {
      continue
    }

    $Match = [regex]::Match($Trimmed, "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$")
    if (-not $Match.Success) {
      continue
    }

    $Key = $Match.Groups[1].Value
    $Value = $Match.Groups[2].Value
    if (($Value.StartsWith('"') -and $Value.EndsWith('"')) -or ($Value.StartsWith("'") -and $Value.EndsWith("'"))) {
      $Value = $Value.Substring(1, $Value.Length - 2)
    }

    if (-not [Environment]::GetEnvironmentVariable($Key, "Process")) {
      [Environment]::SetEnvironmentVariable($Key, $Value, "Process")
    }
  }
}

$BuiltCli = Join-Path $EngineDir "dist\cli.js"
$UsesBuild = Test-Path $BuiltCli
$MotorBackend = if ($env:AP_MOTOR_BACKEND) { $env:AP_MOTOR_BACKEND } else { "sim" }
$SensorBackend = if ($env:AP_SENSOR_BACKEND) { $env:AP_SENSOR_BACKEND } else { "auto" }
$Mode = if ($UsesBuild) { "dist" } else { "tsx" }

Write-Host "[autopilot] starting engine ($Mode, motor=$MotorBackend, sensors=$SensorBackend)"

if ($UsesBuild) {
  & npm --prefix $EngineDir start @args
} else {
  & npm --prefix $EngineDir run dev -- @args
}

exit $LASTEXITCODE
