param(
  [ValidateSet("motor-commissioning", "hil-motor", "production")]
  [string]$Profile = "production",
  [string]$SshHost = "omi-raspberry-lan"
)
ssh $SshHost "~/.venvs/pico-tools/bin/python ~/open-marine/marine-autopilot-engine/pico2/pico_motor_cli.py preflight --profile $Profile"
exit $LASTEXITCODE
