param([string]$SshHost = "omi-raspberry-lan")
ssh $SshHost "bash ~/open-marine/scripts/pico2/production-control.sh stop"
exit $LASTEXITCODE
