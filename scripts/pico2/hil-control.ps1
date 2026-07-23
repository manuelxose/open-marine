param(
  [ValidateSet("start", "engage", "disengage", "heading-change", "stop", "status")]
  [string]$Action = "status",
  [double]$Degrees = 0,
  [switch]$ConfirmPhysicalMotor,
  [string]$SshHost = "omi-raspberry-lan"
)

$ErrorActionPreference = "Stop"
$remote = "~/open-marine/scripts/pico2/hil-control.sh"
$arguments = @($Action)
if ($Action -eq "start") {
  if (-not $ConfirmPhysicalMotor) {
    throw "Use -ConfirmPhysicalMotor after checking the 12 V fuse, E-stop and unloaded mechanism."
  }
  $arguments += "--confirm-physical-motor"
}
if ($Action -eq "heading-change") {
  $arguments += $Degrees.ToString([Globalization.CultureInfo]::InvariantCulture)
}
ssh $SshHost "bash $remote $($arguments -join ' ')"
exit $LASTEXITCODE
