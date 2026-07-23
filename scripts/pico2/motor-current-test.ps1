param([string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action CurrentTest -ConfirmMotorSafe -SshHost $SshHost
exit $LASTEXITCODE
