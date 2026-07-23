param([ValidateRange(1, 30)][int]$Seconds = 4, [string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action Fade -Seconds $Seconds -ConfirmNoDriver -SshHost $SshHost
exit $LASTEXITCODE
