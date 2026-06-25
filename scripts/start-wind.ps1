Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[OMI] start:wind requiere Linux/Raspberry y un dispositivo serie /dev/ttyUSB* o /dev/ttyACM*." -ForegroundColor Yellow
Write-Host "[OMI] Ejecuta en Raspberry: cd ~/open-marine && bash scripts/start-wind.sh" -ForegroundColor Yellow
exit 1
