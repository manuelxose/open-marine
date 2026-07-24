param(
  [switch]$ConfirmBenchMotor,
  [string]$SshHost = "omi-raspberry-lan"
)
& "$PSScriptRoot\..\pico2-motor.ps1" -Action BenchWatchdogTest -ConfirmBenchMotor:$ConfirmBenchMotor -SshHost $SshHost
exit $LASTEXITCODE
