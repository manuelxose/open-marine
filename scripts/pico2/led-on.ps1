param([ValidateRange(1, 100)][int]$Duty = 100, [string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action LedOn -Duty $Duty -ConfirmNoDriver -SshHost $SshHost
exit $LASTEXITCODE
