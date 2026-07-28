param([string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\hil-control.ps1" -Action engage -SshHost $SshHost
exit $LASTEXITCODE
