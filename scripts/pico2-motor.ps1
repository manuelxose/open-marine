param(
  [ValidateSet("Deploy", "Status", "Stop", "LedOn", "Fade", "Steps", "Blink", "WatchdogTest", "Preflight", "MotorPulse", "MotorRamp", "SafetyTest", "CurrentTest", "AutopilotStart")]
  [string]$Action = "Status",
  [ValidateRange(1, 30)]
  [int]$Seconds = 10,
  [ValidateRange(1, 100)]
  [int]$Duty = 100,
  [ValidateSet("port", "starboard")]
  [string]$Direction = "starboard",
  [switch]$ConfirmNoDriver,
  [switch]$ConfirmMotorSafe,
  [ValidateSet("bench-led", "motor-commissioning", "hil-motor", "production")]
  [string]$Profile = "bench-led",
  [string]$SshHost = "omi-raspberry-lan"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "marine-autopilot-engine\pico2"
$remote = "~/open-marine/marine-autopilot-engine/pico2"

if ($Action -eq "Deploy") {
  ssh $SshHost "mkdir -p $remote"
  if ($LASTEXITCODE -ne 0) { throw "Unable to create remote Pico directory." }
  scp (Join-Path $source "main.py") `
      (Join-Path $source "pico_motor_cli.py") `
      (Join-Path $source "build_config.py") `
      (Join-Path $source "install.sh") `
      "${SshHost}:${remote}/"
  if ($LASTEXITCODE -ne 0) { throw "Unable to copy Pico files." }
  ssh $SshHost "mkdir -p $remote/profiles"
  scp (Join-Path $source "profiles\*.py") "${SshHost}:${remote}/profiles/"
  if ($LASTEXITCODE -ne 0) { throw "Unable to copy Pico profiles." }
  ssh $SshHost "cd $remote && bash install.sh $Profile"
  if ($LASTEXITCODE -ne 0) { throw "Pico firmware installation failed." }
  exit 0
}

$cli = "~/.venvs/pico-tools/bin/python $remote/pico_motor_cli.py"
if ($Action -eq "Status" -or $Action -eq "Stop" -or $Action -eq "Preflight") {
  $command = $Action.ToLowerInvariant()
  ssh $SshHost "$cli $command"
  exit $LASTEXITCODE
}

if ($Action -eq "AutopilotStart") {
  if (-not $ConfirmMotorSafe) {
    throw "Use -ConfirmMotorSafe after checking the fuse, E-stop, current sensor and mechanism."
  }
  ssh $SshHost "bash ~/open-marine/scripts/pico2/production-control.sh start --confirm-physical-motor"
  exit $LASTEXITCODE
}

$noDriver = if ($ConfirmNoDriver) { "--confirm-no-driver" } else { "" }
$motorSafe = if ($ConfirmMotorSafe) { "--confirm-motor-safe" } else { "" }
switch ($Action) {
  "LedOn" { ssh $SshHost "$cli $noDriver led-on --duty $Duty" }
  "Fade" { ssh $SshHost "$cli $noDriver fade --cycles 3 --seconds $Seconds" }
  "Steps" { ssh $SshHost "$cli $noDriver steps --seconds $Seconds" }
  "Blink" { ssh $SshHost "$cli $noDriver blink --count 10" }
  "WatchdogTest" { ssh $SshHost "$cli $noDriver watchdog-test" }
  "MotorPulse" { ssh $SshHost "$cli $motorSafe motor-pulse $Direction" }
  "MotorRamp" { ssh $SshHost "$cli $motorSafe motor-ramp $Direction" }
  "SafetyTest" { ssh $SshHost "$cli $motorSafe safety-test --seconds $Seconds" }
  "CurrentTest" { ssh $SshHost "$cli $motorSafe current-test" }
}
exit $LASTEXITCODE
