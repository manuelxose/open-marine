param([string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\hil-control.ps1" -Action disengage -SshHost $SshHost
exit $LASTEXITCODE
