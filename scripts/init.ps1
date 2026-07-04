#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  Write-Host "[OMI] Este script es para Windows. En Linux usa scripts/init.sh" -ForegroundColor Red
  exit 1
}

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ConfigFile = if ($env:OMI_CONFIG_FILE) { $env:OMI_CONFIG_FILE } else { Join-Path $ProjectRoot "config\omi.env" }
$AisPpmDefault = "-50"
$AisGainDefault = "33"
$AisHostDefault = "127.0.0.1"
$AisPortDefault = "10110"

function Log([string]$Message)  { Write-Host "[OMI] $Message" -ForegroundColor Green }
function Warn([string]$Message) { Write-Host "[OMI] $Message" -ForegroundColor Yellow }
function Err([string]$Message)  { Write-Host "[OMI] $Message" -ForegroundColor Red }
function Info([string]$Message) { Write-Host "[OMI] $Message" -ForegroundColor Cyan }

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Comando fallido ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
  }
}

function Load-OmiConfigFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $result
  }

  $lines = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
    if ($trimmed.StartsWith("#")) { continue }

    if ($trimmed -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()

      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      $result[$key] = $value
    }
  }

  return $result
}

function Initialize-OmiConfig {
  if (-not [System.IO.Path]::IsPathRooted($script:ConfigFile)) {
    $script:ConfigFile = Join-Path $ProjectRoot $script:ConfigFile
  }

  $configValues = Load-OmiConfigFile -Path $script:ConfigFile
  if ($configValues.Count -gt 0) {
    Log "Config OMI cargada desde $script:ConfigFile"
  }

  if ($configValues.ContainsKey("AIS_PPM")) { $script:AisPpmDefault = [string]$configValues["AIS_PPM"] }
  if ($configValues.ContainsKey("AIS_GAIN")) { $script:AisGainDefault = [string]$configValues["AIS_GAIN"] }
  if ($configValues.ContainsKey("AIS_HOST")) { $script:AisHostDefault = [string]$configValues["AIS_HOST"] }
  if ($configValues.ContainsKey("AIS_PORT")) { $script:AisPortDefault = [string]$configValues["AIS_PORT"] }
}

function Assert-ProjectStructure {
  $required = @(
    "marine-data-contract",
    "marine-simulation-platform",
    "marine-sensor-gateway",
    "marine-instrumentation-ui",
    "marine-chart-engine",
    "signalk-runtime"
  )

  $missing = $false
  foreach ($dir in $required) {
    $path = Join-Path $ProjectRoot $dir
    if (-not (Test-Path -Path $path -PathType Container)) {
      Err "Directorio requerido no encontrado: $dir"
      $missing = $true
    }
  }

  if ($missing) {
    Err "Estructura del proyecto incompleta."
    exit 1
  }

  New-Item -ItemType Directory -Path (Join-Path $ProjectRoot "scripts") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $ProjectRoot "tools") -Force | Out-Null
}

function Test-Prerequisites {
  $missing = $false

  try {
    $nodeRaw = (node --version).Trim()
    $nodeVer = $nodeRaw -replace '^v', ''
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -ne 20 -and $major -ne 22 -and $major -ne 24) {
      Err "Node.js v$nodeVer detectado, se requiere v20.x, v22.x o v24.x"
      $missing = $true
    } else {
      Log "Node.js v$nodeVer OK"
    }
  } catch {
    Err "Node.js no encontrado. Instala Node.js 20/22/24 LTS: https://nodejs.org/"
    $missing = $true
  }

  try {
    $npmVer = (npm --version).Trim()
    $npmMajor = [int]($npmVer.Split('.')[0])
    if ($npmMajor -lt 10) {
      Err "npm v$npmVer detectado, se requiere >=10"
      $missing = $true
    } else {
      Log "npm v$npmVer OK"
    }
  } catch {
    Err "npm no encontrado"
    $missing = $true
  }

  try {
    $null = docker --version
    Log "Docker OK"
  } catch {
    Err "Docker no encontrado. Instala Docker Desktop: https://www.docker.com/products/docker-desktop/"
    $missing = $true
  }

  try {
    docker compose version | Out-Null
    Log "docker compose OK"
  } catch {
    Err "docker compose no encontrado"
    $missing = $true
  }

  try {
    git --version | Out-Null
    Log "Git OK"
  } catch {
    Err "Git no encontrado. Instala Git: https://git-scm.com/download/win"
    $missing = $true
  }

  if ($missing) {
    Err "Faltan prerequisitos. Instalalos y vuelve a ejecutar."
    exit 1
  }
}

function Invoke-DockerCli {
  param(
    [Parameter(Mandatory = $true)][string]$CommandLine
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    cmd /c $CommandLine | Out-Null
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Get-DockerDesktopExePath {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Docker\Docker\Docker Desktop.exe")
  )

  foreach ($path in $candidates) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }

  return $null
}

function Wait-DockerDaemon {
  param(
    [int]$TimeoutSeconds = 90
  )

  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    $exitCode = Invoke-DockerCli 'docker info --format "{{.ServerVersion}}" >nul 2>nul'
    if ($exitCode -eq 0) {
      return $true
    }
    Start-Sleep -Seconds 1
  }

  return $false
}

function Ensure-DockerLinuxContext {
  $ctxExit = Invoke-DockerCli 'docker context use desktop-linux >nul 2>nul'
  if ($ctxExit -eq 0) {
    Log "Docker context desktop-linux OK"
    return
  }

  Warn "No se pudo seleccionar contexto desktop-linux automaticamente."
  Warn "Si Docker esta en modo Windows containers, cambia a Linux containers en Docker Desktop."
}

function Test-DockerDaemon {
  $exitCode = Invoke-DockerCli 'docker info --format "{{.ServerVersion}}" >nul 2>nul'
  if ($exitCode -eq 0) {
    Log "Docker daemon OK"
    Ensure-DockerLinuxContext
    return
  }

  Warn "Docker daemon no disponible. Intentando abrir Docker Desktop..."
  $dockerDesktopExe = Get-DockerDesktopExePath
  if (-not $dockerDesktopExe) {
    Err "No se encontro Docker Desktop.exe."
    Warn "Abre Docker Desktop manualmente y vuelve a ejecutar npm run init."
    exit 1
  }

  try {
    Start-Process -FilePath $dockerDesktopExe | Out-Null
  } catch {
    Err "No se pudo abrir Docker Desktop automaticamente."
    Warn "Abre Docker Desktop manualmente y vuelve a ejecutar npm run init."
    exit 1
  }

  Info "Esperando a que Docker Desktop arranque (hasta 90s)..."
  if (Wait-DockerDaemon -TimeoutSeconds 90) {
    Log "Docker daemon OK"
    Ensure-DockerLinuxContext
    return
  }

  Err "Docker Desktop daemon no esta disponible."
  Warn "Abre Docker Desktop y espera a que indique que esta Running."
  Warn "Luego valida con: docker info"
  exit 1
}

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Initialize-SignalK {
  Log "Configurando Signal K..."
  $runtimePath = Join-Path $ProjectRoot "signalk-runtime"
  Push-Location $runtimePath

  if (-not (Test-Path "docker-compose.yml")) {
    Err "No existe signalk-runtime/docker-compose.yml"
    Pop-Location
    exit 1
  }

  $compose = Get-Content "docker-compose.yml" -Raw
  if ($compose -notmatch '10110:10110/udp') {
    Warn "Anadiendo puerto UDP 10110 a docker-compose.yml"
    $compose = $compose -replace '("3000:3000")', '$1`n      - "10110:10110/udp"'
    Write-Utf8NoBom -Path (Join-Path (Get-Location) "docker-compose.yml") -Content $compose
  }

  New-Item -ItemType Directory -Path "data" -Force | Out-Null
  if ((Test-Path "data\settings.json") -and -not ((Get-Content "data\settings.json" -Raw) -match '"id": "ais-catcher-udp"')) {
    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    Copy-Item "data\settings.json" "data\settings.json.bak.$stamp" -Force
  }

  $settingsJson = @'
{
  "pipedProviders": [
    {
      "id": "ais-catcher-udp",
      "pipeElements": [
        {
          "type": "providers/udp",
          "options": {
            "port": 10110
          }
        },
        {
          "type": "providers/nmea0183-signalk",
          "options": {
            "validateChecksum": false
          }
        }
      ],
      "enabled": true
    }
  ],
  "interfaces": {},
  "resourcesApi": {
    "defaultProviders": {
      "routes": "resources-provider",
      "waypoints": "resources-provider",
      "notes": "resources-provider",
      "regions": "resources-provider",
      "charts": "resources-provider",
      "tracks": "resources-provider",
      "infolayers": "resources-provider",
      "groups": "resources-provider"
    }
  },
  "courseApi": {
    "apiOnly": false
  }
}
'@.Replace("`r`n", "`n")

  Write-Utf8NoBom -Path (Join-Path (Get-Location) "data\settings.json") -Content $settingsJson
  Log "settings.json configurado con proveedor UDP AIS"

  $downExit = Invoke-DockerCli 'docker compose down >nul 2>nul'
  if ($downExit -ne 0) {
    Warn "docker compose down devolvio error. Continuando con el arranque."
  }

  $upExit = 1
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    $upExit = Invoke-DockerCli 'docker compose up -d >nul 2>nul'
    if ($upExit -eq 0) {
      break
    }
    if ($attempt -lt 5) {
      Warn "docker compose up fallo (intento $attempt/5), Docker Desktop puede seguir arrancando. Reintentando en 5s..."
      Start-Sleep -Seconds 5
    }
  }

  if ($upExit -ne 0) {
    Err "No se pudo levantar Signal K con docker compose."
    Warn "Revisa Docker Desktop y vuelve a ejecutar: npm run init"
    Pop-Location
    exit 1
  }

  Info "Esperando a que Signal K arranque..."
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
      $null = Invoke-WebRequest -Uri "http://localhost:3000/signalk" -UseBasicParsing -TimeoutSec 2
      $ready = $true
      break
    } catch {
    }
  }

  if (-not $ready) {
    Err "Signal K no respondio en 30 segundos"
    docker compose logs --tail=20 signalk
    Pop-Location
    exit 1
  }

  Log "Signal K operativo en http://localhost:3000"
  Pop-Location
}

function Build-Packages {
  Log "Instalando dependencias con npm workspaces..."

  Push-Location $ProjectRoot
  Invoke-CheckedCommand npm install --workspaces --include-workspace-root --legacy-peer-deps

  Log "Compilando contrato y plataforma de simulacion..."
  Invoke-CheckedCommand npm run build:contract
  Invoke-CheckedCommand npm run build:simulation

  Log "Compilando paquetes principales..."
  Invoke-CheckedCommand npm run build:gateway
  Invoke-CheckedCommand npm run build:ui
  Invoke-CheckedCommand npm run build:charts
  Invoke-CheckedCommand npm run build:tile-server
  Invoke-CheckedCommand npm run build:autopilot
  Pop-Location

  Log "Paquetes compilados OK"
}

function Resolve-AisCatcherWindowsZip {
  $apiUrl = "https://api.github.com/repos/jvde-github/AIS-catcher/releases?per_page=30"

  try {
    $releases = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
  } catch {
    Warn "No se pudo consultar releases de AIS-catcher en GitHub."
    return $null
  }

  foreach ($release in $releases) {
    if ($release.draft -or $release.prerelease) {
      continue
    }

    $assets = @($release.assets)
    if ($assets.Count -eq 0) {
      continue
    }

    $asset = $assets | Where-Object { $_.name -eq "AIS-catcher.x64.zip" } | Select-Object -First 1
    if (-not $asset) {
      $asset = $assets |
        Where-Object { $_.name -match '^AIS-catcher.*x64\.zip$' -and $_.name -notmatch 'SDRPLAY|SOAPY' } |
        Select-Object -First 1
    }

    if ($asset) {
      return [string]$asset.browser_download_url
    }
  }

  return $null
}

function Install-AisCatcher {
  $aisDir = Join-Path $ProjectRoot "tools\ais-catcher"
  $aisBin = Join-Path $aisDir "AIS-catcher.exe"

  if (Test-Path $aisBin) {
    Log "AIS-catcher ya instalado en $aisDir"
    return
  }

  $response = Read-Host "Deseas instalar AIS-catcher para recepcion AIS real? (s/n)"
  if ($response -notin @("s", "S", "y", "Y")) {
    Warn "Instalacion de AIS-catcher omitida."
    return
  }

  New-Item -ItemType Directory -Path $aisDir -Force | Out-Null
  $zipPath = Join-Path $env:TEMP "AIS-catcher.x64.zip"
  $headers = @{ "User-Agent" = "OMI-init-script" }

  $downloadCandidates = @()
  $resolvedUrl = Resolve-AisCatcherWindowsZip
  if ($resolvedUrl) {
    $downloadCandidates += $resolvedUrl
    Log "Asset AIS-catcher detectado desde releases."
  } else {
    Warn "No se encontro asset x64 en releases recientes; usando fallback."
  }

  $downloadCandidates += @(
    "https://github.com/jvde-github/AIS-catcher/releases/download/v0.63/AIS-catcher.x64.zip",
    "https://github.com/jvde-github/AIS-catcher/releases/latest/download/AIS-catcher.x64.zip"
  )

  $downloaded = $false

  try {
    foreach ($url in ($downloadCandidates | Select-Object -Unique)) {
      try {
        Log "Descargando AIS-catcher desde: $url"
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing -Headers $headers
        $downloaded = $true
        break
      } catch {
        Warn "Fallo descarga desde $url"
      }
    }

    if (-not $downloaded) {
      throw "No se encontro un binario Windows x64 disponible en releases."
    }

    Expand-Archive -Path $zipPath -DestinationPath $aisDir -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $aisBin)) {
      throw "No se encontro AIS-catcher.exe en el zip."
    }
    Log "AIS-catcher instalado en $aisDir"
  } catch {
    Err "No se pudo instalar AIS-catcher automaticamente: $($_.Exception.Message)"
    Warn "Descarga manual: https://github.com/jvde-github/AIS-catcher/releases"
    return
  }

  Info @"
Si el RTL-SDR no es reconocido:
  1. Descarga Zadig: https://zadig.akeo.ie/
  2. Conecta el RTL-SDR
  3. Options -> List All Devices
  4. Selecciona 'Bulk-In, Interface (Interface 0)' o 'RTL2838UHIDIR'
  5. Instala driver WinUSB
"@
}

function Get-LanIp {
  $virtualAdapterPattern = "vEthernet|Hyper-V|WSL|VirtualBox|VMware|Loopback|Teredo"

  try {
    $cfg = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object {
        $_.IPv4Address -and
        $_.NetAdapter.Status -eq "Up" -and
        $_.NetAdapter.HardwareInterface -eq $true -and
        $_.NetAdapter.InterfaceDescription -notmatch $virtualAdapterPattern -and
        $_.NetAdapter.Name -notmatch $virtualAdapterPattern
      } |
      Select-Object -First 1
    if ($cfg -and $cfg.IPv4Address -and $cfg.IPv4Address.IPAddress) {
      return $cfg.IPv4Address.IPAddress
    }
  } catch {
  }

  try {
    $cfgFallback = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.IPv4Address -and $_.NetAdapter.Status -eq "Up" } |
      Select-Object -First 1
    if ($cfgFallback -and $cfgFallback.IPv4Address -and $cfgFallback.IPv4Address.IPAddress) {
      return $cfgFallback.IPv4Address.IPAddress
    }
  } catch {
  }

  return $null
}

function Show-Summary {
  $aisPath = Join-Path $ProjectRoot "tools\ais-catcher\AIS-catcher.exe"
  $lanIp = Get-LanIp

  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Green
  Write-Host " OMI - Open Marine Instrumentation - Inicializado OK       " -ForegroundColor Green
  Write-Host "============================================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Signal K local:  http://localhost:3000" -ForegroundColor Cyan
  if ($lanIp) {
    Write-Host "  Signal K red:    http://$($lanIp):3000" -ForegroundColor Cyan
  }
  Write-Host "  UDP AIS:   puerto 10110" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  Chart Engine: npm run start:charts" -ForegroundColor Yellow
  Write-Host "    (puerto 8088)" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  UI:         npm run start:ui" -ForegroundColor Yellow
  if ($lanIp) {
    Write-Host "  UI en red:   http://$($lanIp):4200" -ForegroundColor Yellow
  }
  Write-Host "  Simulation platform API: npm run start:simulation-bench" -ForegroundColor Yellow
  Write-Host "  Nota:       localhost solo funciona en esta maquina." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  AIS real:" -ForegroundColor Yellow

  if (Test-Path $aisPath) {
    Write-Host "    npm run start:ais"
    Write-Host "    (config: PPM=$AisPpmDefault, GAIN=$AisGainDefault, HOST=$AisHostDefault, PORT=$AisPortDefault)"
  } else {
    Write-Host "    Ejecuta scripts\init.ps1 y selecciona instalacion de AIS-catcher."
  }
  Write-Host ""
}

function Start-BackgroundPowerShell {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$WorkingDir,
    [Parameter(Mandatory = $true)][string]$Command,
    [string]$PidFile = ""
  )

  $safeDir = $WorkingDir.Replace("'", "''")
  $psCmd = "Set-Location -LiteralPath '$safeDir'; Write-Host '[OMI] $Name iniciado'; $Command"
  $process = Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoProfile",
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $psCmd
  ) -PassThru

  if (-not [string]::IsNullOrWhiteSpace($PidFile)) {
    Set-Content -LiteralPath $PidFile -Value $process.Id -Encoding ASCII
  }
}

function Get-LocalPortOwner {
  param(
    [Parameter(Mandatory = $true)][int]$Port
  )

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($connection) {
      $owner = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      return [pscustomobject]@{
        Port = $Port
        Pid = [int]$connection.OwningProcess
        Name = if ($owner) { $owner.ProcessName } else { "unknown" }
      }
    }
  } catch {
  }

  return $null
}

function Stop-PidFileProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$PidFile
  )

  if (-not (Test-Path -LiteralPath $PidFile)) {
    return
  }

  $rawPid = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  $pidValue = 0
  if ([int]::TryParse([string]$rawPid, [ref]$pidValue) -and $pidValue -gt 0) {
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
      Warn "Reiniciando ${Name}: cerrando proceso previo $($process.ProcessName) pid=$pidValue."
      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    }
  }

  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

function Stop-LocalPortOwner {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port
  )

  $owner = Get-LocalPortOwner -Port $Port
  if (-not $owner) {
    return
  }

  Warn "Liberando puerto ${Port} para ${Name}: cerrando $($owner.Name) pid=$($owner.Pid)."
  Stop-Process -Id $owner.Pid -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 700

  $stillUsed = Get-LocalPortOwner -Port $Port
  if ($stillUsed) {
    Warn "El puerto $Port sigue ocupado por $($stillUsed.Name) pid=$($stillUsed.Pid)."
  }
}

function Reset-InitDevPorts {
  Stop-PidFileProcess -Name "Chart Engine" -PidFile (Join-Path $ProjectRoot ".omi-charts.pid")
  Stop-PidFileProcess -Name "UI" -PidFile (Join-Path $ProjectRoot ".omi-ui.pid")
  Stop-PidFileProcess -Name "Simulation platform API" -PidFile (Join-Path $ProjectRoot ".omi-simulation-bench.pid")
  Stop-PidFileProcess -Name "Simulation platform API legacy pid" -PidFile (Join-Path $ProjectRoot ".omi-test-bench.pid")

  Stop-LocalPortOwner -Name "Chart Engine" -Port 8088
  Stop-LocalPortOwner -Name "UI" -Port 4200
  Stop-LocalPortOwner -Name "Simulation platform API" -Port 4100
}

function Select-SimulatorScenario {
  $scenarios = @(
    "basic-cruise",
    "harbor-traffic",
    "coastal-run",
    "anchored-stale",
    "busy-shipping-lane",
    "combined-failures",
    "anchor-drift",
    "wind-gps-demo"
  )

  Write-Host "Escenarios disponibles:" -ForegroundColor Cyan
  Write-Host "  1) basic-cruise (default)"
  Write-Host "  2) harbor-traffic"
  Write-Host "  3) coastal-run"
  Write-Host "  4) anchored-stale"
  Write-Host "  5) busy-shipping-lane"
  Write-Host "  6) combined-failures"
  Write-Host "  7) anchor-drift"
  Write-Host "  8) wind-gps-demo"

  $choice = Read-Host "Selecciona escenario [1-7 o nombre]"
  if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "1") { return "basic-cruise" }
  if ($choice -eq "2") { return "harbor-traffic" }
  if ($choice -eq "3") { return "coastal-run" }
  if ($choice -eq "4") { return "anchored-stale" }
  if ($choice -eq "5") { return "busy-shipping-lane" }
  if ($choice -eq "6") { return "combined-failures" }
  if ($choice -eq "7") { return "anchor-drift" }
  if ($choice -eq "8") { return "wind-gps-demo" }
  if ($scenarios -contains $choice) { return $choice }

  Warn "Escenario invalido. Se usara basic-cruise."
  return "basic-cruise"
}

function Select-SimulatorRate {
  $rateInput = Read-Host "Frecuencia del simulador en Hz (default 1)"
  if ([string]::IsNullOrWhiteSpace($rateInput)) {
    return "1"
  }

  $parsed = 0.0
  if ([double]::TryParse($rateInput, [ref]$parsed) -and $parsed -gt 0) {
    return $parsed.ToString([System.Globalization.CultureInfo]::InvariantCulture)
  }

  Warn "Rate invalido. Se usara 1 Hz."
  return "1"
}

function Start-PostInitServices {
  $startChartEngineResponse = Read-Host "Deseas arrancar Chart Engine ahora? (s/n)"
  if ($startChartEngineResponse -in @("s", "S", "y", "Y")) {
    $pidFile = Join-Path $ProjectRoot ".omi-charts.pid"
    Stop-PidFileProcess -Name "Chart Engine" -PidFile $pidFile
    Stop-LocalPortOwner -Name "Chart Engine" -Port 8088
    Start-BackgroundPowerShell `
      -Name "Chart Engine" `
      -WorkingDir $ProjectRoot `
      -Command "npm run start:charts" `
      -PidFile $pidFile
    Log "Chart Engine arrancado en ventana separada."
  }

  $startUiResponse = Read-Host "Deseas arrancar UI ahora? (s/n)"
  if ($startUiResponse -in @("s", "S", "y", "Y")) {
    $pidFile = Join-Path $ProjectRoot ".omi-ui.pid"
    Stop-PidFileProcess -Name "UI" -PidFile $pidFile
    Stop-LocalPortOwner -Name "UI" -Port 4200
    Start-BackgroundPowerShell `
      -Name "UI" `
      -WorkingDir (Join-Path $ProjectRoot "marine-instrumentation-ui") `
      -Command "npm run start:lan" `
      -PidFile $pidFile
    Log "UI arrancada en ventana separada."
  }

  $startTestBenchResponse = Read-Host "Deseas arrancar la API enterprise de simulacion ahora? (s/n)"
  if ($startTestBenchResponse -in @("s", "S", "y", "Y")) {
    $pidFile = Join-Path $ProjectRoot ".omi-simulation-bench.pid"
    Stop-PidFileProcess -Name "Simulation platform API" -PidFile $pidFile
    Stop-PidFileProcess -Name "Simulation platform API legacy pid" -PidFile (Join-Path $ProjectRoot ".omi-test-bench.pid")
    Stop-LocalPortOwner -Name "Simulation platform API" -Port 4100
    Start-BackgroundPowerShell `
      -Name "Simulation platform API" `
      -WorkingDir $ProjectRoot `
      -Command "npm run start:simulation-bench" `
      -PidFile $pidFile
    Log "Simulation platform API arrancada en ventana separada."
  }

  $aisPath = Join-Path $ProjectRoot "tools\ais-catcher\AIS-catcher.exe"
  if (Test-Path $aisPath) {
    $startAisResponse = Read-Host "Deseas arrancar AIS-catcher ahora? (s/n)"
    if ($startAisResponse -in @("s", "S", "y", "Y")) {
      Start-BackgroundPowerShell `
        -Name "AIS-catcher" `
        -WorkingDir $ProjectRoot `
        -Command "npm run start:ais"
      Log "AIS-catcher arrancado en ventana separada."
    }
  }
}

Write-Host ""
Write-Host "OMI Project Initialization (Windows)" -ForegroundColor Cyan
Write-Host ""

Initialize-OmiConfig
Test-Prerequisites
Test-DockerDaemon
Assert-ProjectStructure
Initialize-SignalK
Build-Packages
Install-AisCatcher
Reset-InitDevPorts
Show-Summary
Start-PostInitServices
