param(
  [ValidateSet("port", "starboard")][string]$Direction = "starboard",
  [string]$SshHost = "omi-raspberry-lan"
)
& "$PSScriptRoot\..\pico2-motor.ps1" -Action MotorPulse -Direction $Direction -ConfirmMotorSafe -SshHost $SshHost
exit $LASTEXITCODE
