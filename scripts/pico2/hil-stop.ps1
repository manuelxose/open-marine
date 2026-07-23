param([string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\hil-control.ps1" -Action stop -SshHost $SshHost
exit $LASTEXITCODE
