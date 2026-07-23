param([ValidateRange(1, 30)][int]$Seconds = 2, [string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action Steps -Seconds $Seconds -ConfirmNoDriver -SshHost $SshHost
exit $LASTEXITCODE
