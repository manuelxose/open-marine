param(
  [ValidateSet("port", "starboard")][string]$Direction = "starboard",
  [ValidateRange(1, 20)][int]$Duty = 5,
  [ValidateRange(50, 1000)][int]$Milliseconds = 800,
  [switch]$ConfirmBenchMotor,
  [string]$SshHost = "omi-raspberry-lan"
)
& "$PSScriptRoot\..\pico2-motor.ps1" -Action BenchPulse -Direction $Direction -Duty $Duty -Milliseconds $Milliseconds -ConfirmBenchMotor:$ConfirmBenchMotor -SshHost $SshHost
exit $LASTEXITCODE
