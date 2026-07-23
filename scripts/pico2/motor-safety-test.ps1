param([ValidateRange(5, 30)][int]$Seconds = 15, [string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action SafetyTest -Seconds $Seconds -ConfirmMotorSafe -SshHost $SshHost
exit $LASTEXITCODE
