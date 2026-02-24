Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[OMI] start:gps esta pensado para Linux/Raspberry (dispositivos /dev/ttyACM* o /dev/ttyUSB*)." -ForegroundColor Yellow
Write-Host "[OMI] Ejecutalo en la Raspberry: cd ~/open-marine && bash scripts/start-gps.sh" -ForegroundColor Yellow
exit 1
