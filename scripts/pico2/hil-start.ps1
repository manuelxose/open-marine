param([switch]$ConfirmPhysicalMotor, [string]$SshHost = "omi-raspberry-lan")
& "$PSScriptRoot\hil-control.ps1" -Action start -ConfirmPhysicalMotor:$ConfirmPhysicalMotor -SshHost $SshHost
exit $LASTEXITCODE
