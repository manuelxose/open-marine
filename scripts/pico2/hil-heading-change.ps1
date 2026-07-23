param(
  [Parameter(Mandatory)]
  [ValidateRange(-180, 180)]
  [double]$Degrees,
  [string]$SshHost = "omi-raspberry-lan"
)
& "$PSScriptRoot\hil-control.ps1" -Action heading-change -Degrees $Degrees -SshHost $SshHost
exit $LASTEXITCODE
