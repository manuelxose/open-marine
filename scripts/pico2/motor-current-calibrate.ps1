param(
  [Parameter(Mandatory)]
  [ValidateRange(0.000001, 3.3)]
  [double]$VoltsPerAmp,
  [ValidateRange(0.1, 10)]
  [double]$LimitAmps = 10,
  [string]$SshHost = "omi-raspberry-lan"
)
$sensitivity = $VoltsPerAmp.ToString([Globalization.CultureInfo]::InvariantCulture)
$limit = $LimitAmps.ToString([Globalization.CultureInfo]::InvariantCulture)
ssh $SshHost "~/.venvs/pico-tools/bin/python ~/open-marine/marine-autopilot-engine/pico2/pico_motor_cli.py calibrate-current --volts-per-amp $sensitivity --limit-amps $limit"
exit $LASTEXITCODE
