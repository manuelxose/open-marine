param([string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\..\pico2-motor.ps1" -Action Stop -SshHost $SshHost
exit $LASTEXITCODE
