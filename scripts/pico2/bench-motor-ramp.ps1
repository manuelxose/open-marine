param(
  [ValidateSet("port", "starboard")][string]$Direction = "starboard",
  [switch]$ConfirmBenchMotor,
  [string]$SshHost = "omi-raspberry-lan"
)
& "$PSScriptRoot\..\pico2-motor.ps1" -Action BenchRamp -Direction $Direction -ConfirmBenchMotor:$ConfirmBenchMotor -SshHost $SshHost
exit $LASTEXITCODE
