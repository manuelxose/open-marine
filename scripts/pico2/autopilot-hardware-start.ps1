param([switch]$ConfirmMotorSafe, [string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action AutopilotStart -ConfirmMotorSafe:$ConfirmMotorSafe -SshHost $SshHost
exit $LASTEXITCODE
