Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[OMI] start:imu esta pensado para Linux/Raspberry (bus I2C /dev/i2c-1)." -ForegroundColor Yellow
Write-Host "[OMI] Ejecutalo en la Raspberry: cd ~/open-marine && bash scripts/start-imu.sh" -ForegroundColor Yellow
exit 1
