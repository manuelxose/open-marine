#Requires -Version 5.1
param(
  [string]$TargetHost = $env:RPI_HOST,
  [string]$TargetUser = $env:RPI_USER,
  [string]$TargetPort = $env:RPI_PORT,
  [string]$TargetPath = $env:RPI_PATH,
  [string]$SshKey = $env:RPI_SSH_KEY,
  [string]$SshPassword = $env:RPI_PASSWORD,
  [string]$SshHostKey = $env:RPI_HOSTKEY,
  [string]$SshClient = $env:RPI_SSH_CLIENT,
  [string]$ConfigFile = $null
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SignalkImageRef = if ($env:OMI_SIGNALK_IMAGE) { $env:OMI_SIGNALK_IMAGE } else { "signalk/signalk-server:v2.22.1" }
$SignalkImageArchive = Join-Path $ProjectRoot "tools\docker-images\signalk-signalk-server_latest.tar"

$explicitTargetHost = $PSBoundParameters.ContainsKey("TargetHost")
$explicitTargetUser = $PSBoundParameters.ContainsKey("TargetUser")
$explicitTargetPort = $PSBoundParameters.ContainsKey("TargetPort")
$explicitTargetPath = $PSBoundParameters.ContainsKey("TargetPath")
$explicitSshKey = $PSBoundParameters.ContainsKey("SshKey")
$explicitSshPassword = $PSBoundParameters.ContainsKey("SshPassword")
$explicitSshHostKey = $PSBoundParameters.ContainsKey("SshHostKey")
$explicitSshClient = $PSBoundParameters.ContainsKey("SshClient")

function Log([string]$Message) { Write-Host "[OMI] $Message" -ForegroundColor Green }
function Warn([string]$Message) { Write-Host "[OMI] $Message" -ForegroundColor Yellow }
function Err([string]$Message) { Write-Host "[OMI] $Message" -ForegroundColor Red }

function Resolve-UserScopedEnvVar {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$CurrentValue
  )

  if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
    return $CurrentValue
  }

  try {
    $regValue = (Get-ItemProperty -Path "HKCU:\Environment" -Name $Name -ErrorAction SilentlyContinue).$Name
    if (-not [string]::IsNullOrWhiteSpace($regValue)) {
      return [string]$regValue
    }
  } catch {
  }

  return $CurrentValue
}

function Load-RaspberryConfigFile {
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

function Require-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Err "Comando requerido no encontrado: $Name"
    exit 1
  }
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string[]]$Args
  )

  & $Name @Args
  if ($LASTEXITCODE -ne 0) {
    throw "$Name fallo con codigo $LASTEXITCODE"
  }
}

function Is-NetworkFailureText {
  param(
    [string]$Text
  )

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $false
  }

  return $Text -match '(?i)network error|timed out|connection timed out|could not resolve|name or service not known|temporary failure in name resolution|no route to host|connection reset|connection refused|host does not exist|unable to open connection'
}

function Get-FirstDetailLine {
  param(
    [string]$Text
  )

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return ""
  }

  $line = ($Text -split "(`r`n|`n|`r)" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
  if (-not $line) {
    return ""
  }

  return $line.Trim()
}

function Test-OpenSshKeyAuth {
  param(
    [Parameter(Mandatory = $true)][string]$SshTarget,
    [Parameter(Mandatory = $true)][string[]]$BaseSshArgs,
    [Parameter(Mandatory = $true)][string]$KeyPath
  )

  if ([string]::IsNullOrWhiteSpace($KeyPath) -or -not (Test-Path -LiteralPath $KeyPath)) {
    return $false
  }

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & ssh @($BaseSshArgs + @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "PreferredAuthentications=publickey", "-o", "PasswordAuthentication=no", $SshTarget, "echo OMI_SSH_KEY_OK")) *> $null
    return ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Ensure-OpenSshKeyPair {
  param(
    [Parameter(Mandatory = $true)][string]$KeyPath
  )

  $pubPath = "$KeyPath.pub"
  if ((Test-Path -LiteralPath $KeyPath) -and (Test-Path -LiteralPath $pubPath)) {
    return $true
  }

  Require-Command -Name "ssh-keygen"
  $sshDir = Split-Path -Parent $KeyPath
  if (-not (Test-Path -LiteralPath $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
  }

  Log "Generando clave SSH automatica para OMI..."
  Invoke-External -Name "ssh-keygen" -Args @("-t", "ed25519", "-N", "", "-f", $KeyPath, "-C", "omi-migrate")
  return ((Test-Path -LiteralPath $KeyPath) -and (Test-Path -LiteralPath $pubPath))
}

function Install-OpenSshPublicKey {
  param(
    [Parameter(Mandatory = $true)][string]$SshTarget,
    [Parameter(Mandatory = $true)][string[]]$BaseSshArgs,
    [Parameter(Mandatory = $true)][string]$PublicKeyPath
  )

  if (-not (Test-Path -LiteralPath $PublicKeyPath)) {
    return $false
  }

  $publicKeyRaw = (Get-Content -LiteralPath $PublicKeyPath -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($publicKeyRaw)) {
    return $false
  }

  # Keep only key type + key payload to avoid quote issues in comments.
  $publicKeyParts = $publicKeyRaw -split '\s+'
  if ($publicKeyParts.Count -lt 2) {
    return $false
  }
  $publicKey = "$($publicKeyParts[0]) $($publicKeyParts[1])"
  $remoteCmd = "umask 077; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; grep -qxF '$publicKey' ~/.ssh/authorized_keys || echo '$publicKey' >> ~/.ssh/authorized_keys"

  Warn "Instalando clave publica SSH en Raspberry (pedira password solo esta vez)..."
  Invoke-ExternalWithRetry -Name "ssh" -Args ($BaseSshArgs + @($SshTarget, $remoteCmd)) -Operation "Instalacion de clave SSH en Raspberry" -MaxRetries 1 -RetryDelaySeconds 1
  return $true
}

function Invoke-ExternalWithRetry {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string[]]$Args,
    [Parameter(Mandatory = $true)][string]$Operation,
    [int]$MaxRetries = 2,
    [int]$RetryDelaySeconds = 2
  )

  for ($attempt = 0; $attempt -le $MaxRetries; $attempt++) {
    $previousErrorActionPreference = $ErrorActionPreference
    $outputText = ""
    try {
      $ErrorActionPreference = "Continue"
      $output = & $Name @Args 2>&1
      $exitCode = $LASTEXITCODE
      $outputText = (($output | Out-String).Trim())
      if (-not [string]::IsNullOrWhiteSpace($outputText)) {
        Write-Host $outputText
      }
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -eq 0) {
      return
    }

    $shouldRetry = (Is-NetworkFailureText -Text $outputText) -and ($attempt -lt $MaxRetries)
    if ($shouldRetry) {
      $nextAttempt = $attempt + 2
      Warn "$Operation fallo por red (intento $($attempt + 1)/$($MaxRetries + 1)). Reintentando en $RetryDelaySeconds s..."
      Start-Sleep -Seconds $RetryDelaySeconds
      continue
    }

    throw "$Name fallo con codigo $exitCode"
  }
}

function Test-RemoteSshAuth {
  param(
    [Parameter(Mandatory = $true)][string]$SshCommand,
    [Parameter(Mandatory = $true)][string[]]$SshArgs,
    [Parameter(Mandatory = $true)][string]$SshTarget,
    [bool]$UsingPutty = $false,
    [switch]$QuietFailure,
    [ref]$FailureText = ([ref]$null)
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $outputText = ""
  try {
    $ErrorActionPreference = "Continue"
    $output = & $SshCommand @($SshArgs + @($SshTarget, "echo OMI_SSH_AUTH_OK")) 2>&1
    $exitCode = $LASTEXITCODE
    $outputText = (($output | Out-String).Trim())
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($FailureText) {
    $FailureText.Value = $outputText
  }

  if ($exitCode -eq 0) {
    return $true
  }

  if ($QuietFailure) {
    return $false
  }

  $detail = Get-FirstDetailLine -Text $outputText
  if (Is-NetworkFailureText -Text $outputText) {
    Err "No se pudo conectar por SSH a $SshTarget."
    if (-not [string]::IsNullOrWhiteSpace($detail)) {
      Warn "Detalle conexion SSH: $detail"
    }
    Warn "Revisa conectividad de red y resolucion DNS/mDNS del host."
  } else {
    Err "Autenticacion SSH rechazada para $SshTarget."
    if ($UsingPutty) {
      Warn "Revisa RPI_USER/RPI_PASSWORD en config/omi.env o usa RPI_SSH_KEY."
      Warn "Prueba directa: & '$SshCommand' -ssh $SshTarget"
    } else {
      Warn "Prueba directa: ssh $SshTarget"
    }
    if (-not [string]::IsNullOrWhiteSpace($detail)) {
      Warn "Detalle autenticacion SSH: $detail"
    }
  }
  return $false
}

function Invoke-DockerSafe {
  param(
    [Parameter(Mandatory = $true)][string[]]$Args,
    [switch]$Silent
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    if ($Silent) {
      & docker @Args *> $null
    } else {
      & docker @Args
    }
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Export-SignalkImageForMigration {
  param(
    [Parameter(Mandatory = $true)][string]$ImageRef,
    [Parameter(Mandatory = $true)][string]$ArchivePath
  )

  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCmd) {
    Warn "Docker no disponible en este equipo. Se omitira exportar imagen Signal K."
    return
  }

  $daemonExit = Invoke-DockerSafe -Args @("info", "--format", "{{.ServerVersion}}") -Silent
  if ($daemonExit -ne 0) {
    Warn "Docker daemon no disponible. Se omitira exportar imagen Signal K."
    Warn "La Raspberry descargara la imagen en init:linux."
    return
  }

  $archiveDir = Split-Path -Parent $ArchivePath
  if (-not (Test-Path -LiteralPath $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
  }

  $inspectExit = Invoke-DockerSafe -Args @("image", "inspect", $ImageRef) -Silent
  if ($inspectExit -ne 0) {
    Warn "Imagen $ImageRef no encontrada localmente. Intentando docker pull..."
    $pullExit = Invoke-DockerSafe -Args @("pull", $ImageRef)
    if ($pullExit -ne 0) {
      Warn "No se pudo obtener $ImageRef. La Raspberry descargara la imagen en init:linux."
      return
    }
  }

  Log "Exportando imagen Docker $ImageRef para migracion..."
  $saveExit = Invoke-DockerSafe -Args @("save", "-o", $ArchivePath, $ImageRef)
  if ($saveExit -ne 0) {
    Warn "No se pudo exportar imagen Docker ($ImageRef)."
    return
  }

  Log "Imagen Docker empaquetada: $ArchivePath"
}

function Find-PuttyTool {
  param(
    [Parameter(Mandatory = $true)][string]$ExeName
  )

  $cmd = Get-Command $ExeName -ErrorAction SilentlyContinue
  if ($cmd -and -not [string]::IsNullOrWhiteSpace($cmd.Source)) {
    return [string]$cmd.Source
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles "PuTTY\$ExeName"),
    (Join-Path ${env:ProgramFiles(x86)} "PuTTY\$ExeName"),
    (Join-Path $env:LOCALAPPDATA "Programs\PuTTY\$ExeName")
  )

  foreach ($path in $candidates) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      return $path
    }
  }

  return $null
}

function Test-TcpPort {
  param(
    [Parameter(Mandatory = $true)][string]$HostName,
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutMs = 1200
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      $client.Close()
      return $false
    }
    $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Get-RaspberryArpCandidates {
  $ouiPrefixes = @(
    "b8-27-eb",
    "dc-a6-32",
    "e4-5f-01",
    "28-cd-c1",
    "2c-cf-67",
    "d8-3a-dd"
  )

  $candidates = @()
  $arpOutput = arp -a 2>$null
  foreach ($line in $arpOutput) {
    if ($line -match '^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F-]{17})\s+\w+') {
      $ip = $Matches[1]
      $mac = $Matches[2].ToLower()
      foreach ($prefix in $ouiPrefixes) {
        if ($mac.StartsWith($prefix)) {
          $candidates += $ip
          break
        }
      }
    }
  }

  return $candidates | Select-Object -Unique
}

function AutoDetect-RaspberryHost {
  param(
    [Parameter(Mandatory = $true)][int]$Port
  )

  if (Test-TcpPort -HostName "raspberrypi.local" -Port $Port) {
    return "raspberrypi.local"
  }

  $raspCandidates = Get-RaspberryArpCandidates
  $reachableRasp = @()
  foreach ($ip in $raspCandidates) {
    if (Test-TcpPort -HostName $ip -Port $Port) {
      $reachableRasp += $ip
    }
  }

  if ($reachableRasp.Count -eq 1) {
    return $reachableRasp[0]
  }
  if ($reachableRasp.Count -gt 1) {
    Warn "Se detectaron varias Raspberry con SSH abierto: $($reachableRasp -join ', ')"
    return $null
  }

  return $null
}

function Get-GenericSshCandidates {
  param(
    [Parameter(Mandatory = $true)][int]$Port
  )

  $genericCandidates = @()
  $arpOutput = arp -a 2>$null
  foreach ($line in $arpOutput) {
    if ($line -match '^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+[0-9a-fA-F-]{17}\s+\w+') {
      $genericCandidates += $Matches[1]
    }
  }
  $genericCandidates = $genericCandidates | Select-Object -Unique | Select-Object -First 20

  $reachable = @()
  foreach ($ip in $genericCandidates) {
    if (Test-TcpPort -HostName $ip -Port $Port -TimeoutMs 700) {
      $reachable += $ip
    }
  }

  return $reachable | Select-Object -Unique
}

function Get-SshConfigHostName {
  param(
    [Parameter(Mandatory = $true)][string]$Alias
  )

  if ([string]::IsNullOrWhiteSpace($Alias)) {
    return $null
  }

  $sshConfigPath = Join-Path $env:USERPROFILE ".ssh\config"
  if (-not (Test-Path -LiteralPath $sshConfigPath)) {
    return $null
  }

  $isMatchingHost = $false
  $lines = Get-Content -LiteralPath $sshConfigPath -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($trimmed -match '^(?i)Host\s+(.+)$') {
      $isMatchingHost = $false
      $patterns = ($Matches[1] -split '\s+') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
      foreach ($pattern in $patterns) {
        if ($pattern -eq "*") {
          continue
        }
        if ($Alias -like $pattern) {
          $isMatchingHost = $true
          break
        }
      }
      continue
    }

    if ($isMatchingHost -and $trimmed -match '^(?i)HostName\s+(.+)$') {
      $hostName = $Matches[1].Trim()
      if (-not [string]::IsNullOrWhiteSpace($hostName)) {
        return $hostName
      }
    }
  }

  return $null
}

function Get-RaspberryHostCandidates {
  param(
    [Parameter(Mandatory = $true)][string]$PrimaryHost,
    [Parameter(Mandatory = $true)][int]$Port
  )

  $candidates = New-Object System.Collections.Generic.List[string]

  if (-not [string]::IsNullOrWhiteSpace($PrimaryHost)) {
    $candidates.Add($PrimaryHost)
  }

  $hostFromSshConfig = Get-SshConfigHostName -Alias $PrimaryHost
  if (-not [string]::IsNullOrWhiteSpace($hostFromSshConfig)) {
    $candidates.Add($hostFromSshConfig)
  }

  $resolveNames = @()
  if (-not [string]::IsNullOrWhiteSpace($PrimaryHost)) {
    $resolveNames += $PrimaryHost
  }

  if ($PrimaryHost -and $PrimaryHost.ToLowerInvariant().EndsWith(".local")) {
    $shortHost = $PrimaryHost.Substring(0, $PrimaryHost.Length - 6)
    if (-not [string]::IsNullOrWhiteSpace($shortHost)) {
      $candidates.Add($shortHost)
      $resolveNames += $shortHost
    }

    $autoHost = AutoDetect-RaspberryHost -Port $Port
    if (-not [string]::IsNullOrWhiteSpace($autoHost)) {
      $candidates.Add($autoHost)
    }

    $arpCandidates = Get-RaspberryArpCandidates
    foreach ($candidateIp in $arpCandidates) {
      if (Test-TcpPort -HostName $candidateIp -Port $Port -TimeoutMs 900) {
        $candidates.Add($candidateIp)
      }
    }
  }

  foreach ($nameToResolve in ($resolveNames | Select-Object -Unique)) {
    if ([string]::IsNullOrWhiteSpace($nameToResolve)) {
      continue
    }
    try {
      $resolvedIps = [System.Net.Dns]::GetHostAddresses($nameToResolve) |
        Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
        ForEach-Object { $_.IPAddressToString }
      foreach ($ip in $resolvedIps) {
        $candidates.Add($ip)
      }
    } catch {
    }
  }

  $genericCandidates = Get-GenericSshCandidates -Port $Port
  foreach ($genericIp in ($genericCandidates | Select-Object -First 8)) {
    $candidates.Add($genericIp)
  }

  return $candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique
}

Write-Host ""
Write-Host "OMI Migration to Raspberry (Windows)" -ForegroundColor Cyan
Write-Host ""

Require-Command -Name "tar"

if ([string]::IsNullOrWhiteSpace($ConfigFile)) {
  if (-not [string]::IsNullOrWhiteSpace($env:RPI_CONFIG_FILE)) {
    $ConfigFile = $env:RPI_CONFIG_FILE
  } elseif (-not [string]::IsNullOrWhiteSpace($env:OMI_CONFIG_FILE)) {
    $ConfigFile = $env:OMI_CONFIG_FILE
  }
}

if ([string]::IsNullOrWhiteSpace($ConfigFile)) {
  $omiConfig = Join-Path $ProjectRoot "config\omi.env"
  if (Test-Path -LiteralPath $omiConfig) {
    $ConfigFile = $omiConfig
  } else {
    $ConfigFile = Join-Path $ProjectRoot "config\raspberry.env"
  }
} elseif (-not [System.IO.Path]::IsPathRooted($ConfigFile)) {
  $ConfigFile = Join-Path $ProjectRoot $ConfigFile
}

$configValues = Load-RaspberryConfigFile -Path $ConfigFile
if ($configValues.Count -gt 0) {
  Log "Config Raspberry cargada desde $ConfigFile"
}

if (-not $explicitTargetHost -and $configValues.ContainsKey("RPI_HOST")) { $TargetHost = [string]$configValues["RPI_HOST"] }
if (-not $explicitTargetUser -and $configValues.ContainsKey("RPI_USER")) { $TargetUser = [string]$configValues["RPI_USER"] }
if (-not $explicitTargetPort -and $configValues.ContainsKey("RPI_PORT")) { $TargetPort = [string]$configValues["RPI_PORT"] }
if (-not $explicitTargetPath -and $configValues.ContainsKey("RPI_PATH")) { $TargetPath = [string]$configValues["RPI_PATH"] }
if (-not $explicitSshKey -and $configValues.ContainsKey("RPI_SSH_KEY")) { $SshKey = [string]$configValues["RPI_SSH_KEY"] }
if (-not $explicitSshPassword -and $configValues.ContainsKey("RPI_PASSWORD")) { $SshPassword = [string]$configValues["RPI_PASSWORD"] }
if (-not $explicitSshHostKey -and $configValues.ContainsKey("RPI_HOSTKEY")) { $SshHostKey = [string]$configValues["RPI_HOSTKEY"] }
if (-not $explicitSshClient -and $configValues.ContainsKey("RPI_SSH_CLIENT")) { $SshClient = [string]$configValues["RPI_SSH_CLIENT"] }

$TargetHost = Resolve-UserScopedEnvVar -Name "RPI_HOST" -CurrentValue $TargetHost
$TargetUser = Resolve-UserScopedEnvVar -Name "RPI_USER" -CurrentValue $TargetUser
$TargetPort = Resolve-UserScopedEnvVar -Name "RPI_PORT" -CurrentValue $TargetPort
$TargetPath = Resolve-UserScopedEnvVar -Name "RPI_PATH" -CurrentValue $TargetPath
$SshKey = Resolve-UserScopedEnvVar -Name "RPI_SSH_KEY" -CurrentValue $SshKey
$SshPassword = Resolve-UserScopedEnvVar -Name "RPI_PASSWORD" -CurrentValue $SshPassword
$SshHostKey = Resolve-UserScopedEnvVar -Name "RPI_HOSTKEY" -CurrentValue $SshHostKey
$SshClient = Resolve-UserScopedEnvVar -Name "RPI_SSH_CLIENT" -CurrentValue $SshClient

if ([string]::IsNullOrWhiteSpace($TargetUser)) {
  $TargetUser = "pi"
}

if ([string]::IsNullOrWhiteSpace($TargetPath)) {
  $TargetPath = "/home/$TargetUser/open-marine"
}
if ([string]::IsNullOrWhiteSpace($TargetPort)) {
  $TargetPort = "22"
}

$parsedPort = 0
if (-not [int]::TryParse($TargetPort, [ref]$parsedPort) -or $parsedPort -le 0) {
  Err "Puerto SSH invalido: $TargetPort"
  exit 1
}
$TargetPort = [string]$parsedPort

if ([string]::IsNullOrWhiteSpace($TargetHost)) {
  $autoHost = AutoDetect-RaspberryHost -Port $parsedPort
  if (-not [string]::IsNullOrWhiteSpace($autoHost)) {
    $confirm = Read-Host "Host Raspberry detectado automaticamente: $autoHost. Usar este host? [Y/n]"
    if ([string]::IsNullOrWhiteSpace($confirm) -or $confirm -in @("y", "Y", "s", "S")) {
      $TargetHost = $autoHost
      Log "Host Raspberry seleccionado: $TargetHost"
    }
  }
}

if ([string]::IsNullOrWhiteSpace($TargetHost)) {
  $generic = Get-GenericSshCandidates -Port $parsedPort
  if ($generic.Count -gt 0) {
    Warn "No se pudo identificar Raspberry de forma segura."
    Warn "Hosts con SSH abierto detectados: $($generic -join ', ')"
    Warn "Indica manualmente el host/IP correcto de la Raspberry."
  }
  $TargetHost = Read-Host "Raspberry host/IP (ej: raspberrypi.local o 192.168.1.50)"
}

if ([string]::IsNullOrWhiteSpace($TargetHost)) {
  Err "Host de Raspberry no especificado."
  exit 1
}

$preferPutty = $false
if (-not [string]::IsNullOrWhiteSpace($SshClient)) {
  $clientSelection = $SshClient.Trim().ToLowerInvariant()
  if ($clientSelection -eq "putty") {
    $preferPutty = $true
  } elseif ($clientSelection -eq "openssh") {
    $preferPutty = $false
  } else {
    Warn "Valor no reconocido para RPI_SSH_CLIENT: $SshClient (valores validos: putty|openssh)"
  }
}

if (-not [string]::IsNullOrWhiteSpace($SshPassword) -and [string]::IsNullOrWhiteSpace($SshKey) -and [string]::IsNullOrWhiteSpace($SshClient)) {
  $preferPutty = $true
}

$usePutty = $false
$plinkPath = $null
$pscpPath = $null

if ($preferPutty) {
  $plinkPath = Find-PuttyTool -ExeName "plink.exe"
  $pscpPath = Find-PuttyTool -ExeName "pscp.exe"
  if ($plinkPath -and $pscpPath) {
    $usePutty = $true
    Log "Cliente SSH seleccionado: PuTTY (plink/pscp)"
  } else {
    Warn "PuTTY no encontrado o incompleto. Se usara OpenSSH."
  }
}

if (-not $usePutty) {
  Require-Command -Name "ssh"
  Require-Command -Name "scp"
}

$openSshAvailable = $true
if (-not (Get-Command ssh -ErrorAction SilentlyContinue) -or -not (Get-Command scp -ErrorAction SilentlyContinue)) {
  $openSshAvailable = $false
}

if (-not $usePutty -and $openSshAvailable -and [string]::IsNullOrWhiteSpace($SshKey)) {
  $baseOpenSshArgs = @(
    "-p", $TargetPort.ToString(),
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "ConnectTimeout=8",
    "-o", "ConnectionAttempts=1"
  )
  $primaryTarget = "$TargetUser@$TargetHost"
  $autoKeyPath = Join-Path $env:USERPROFILE ".ssh\omi_rpi_ed25519"
  $autoPubPath = "$autoKeyPath.pub"

  try {
    if (Ensure-OpenSshKeyPair -KeyPath $autoKeyPath) {
      if (Test-OpenSshKeyAuth -SshTarget $primaryTarget -BaseSshArgs $baseOpenSshArgs -KeyPath $autoKeyPath) {
        $SshKey = $autoKeyPath
        Log "Clave SSH automatica ya disponible para $primaryTarget."
      } else {
        if (Install-OpenSshPublicKey -SshTarget $primaryTarget -BaseSshArgs $baseOpenSshArgs -PublicKeyPath $autoPubPath) {
          if (Test-OpenSshKeyAuth -SshTarget $primaryTarget -BaseSshArgs $baseOpenSshArgs -KeyPath $autoKeyPath) {
            $SshKey = $autoKeyPath
            Log "Clave SSH instalada y activada automaticamente."
          } else {
            Warn "No se pudo validar autenticacion por clave tras instalarla. Se continuara con password interactiva."
          }
        }
      }
    }
  } catch {
    Warn "No se pudo configurar clave SSH automatica: $($_.Exception.Message)"
    Warn "Se continuara con password interactiva."
  }
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$archiveName = "open-marine-migrate-$timestamp.tar.gz"
$archivePath = Join-Path $env:TEMP $archiveName

$tarArgs = @(
  "-czf", $archivePath,
  "--exclude=.git",
  "--exclude=.github",
  "--exclude=.vscode",
  "--exclude=node_modules",
  "--exclude=*/node_modules",
  "--exclude=dist",
  "--exclude=*/dist",
  "--exclude=.angular",
  "--exclude=coverage",
  "--exclude=.omi-*.log",
  "--exclude=.omi-*.pid",
  "--exclude=tools/ais-catcher",
  "-C", $ProjectRoot,
  "."
)

$openSshSshArgs = @(
  "-p", $TargetPort.ToString(),
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=8",
  "-o", "ConnectionAttempts=1"
)
$openSshScpArgs = @(
  "-P", $TargetPort.ToString(),
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=8"
)
if (-not [string]::IsNullOrWhiteSpace($SshKey)) {
  $openSshSshArgs += @("-i", $SshKey)
  $openSshScpArgs += @("-i", $SshKey)
}

$sshCommand = "ssh"
$scpCommand = "scp"
$sshArgs = @($openSshSshArgs)
$scpArgs = @($openSshScpArgs)

if ($usePutty) {
  $sshCommand = $plinkPath
  $scpCommand = $pscpPath

  $sshArgs = @(
    "-batch",
    "-ssh",
    "-P", $TargetPort.ToString()
  )
  $scpArgs = @(
    "-batch",
    "-P", $TargetPort.ToString()
  )

  if (-not [string]::IsNullOrWhiteSpace($SshHostKey)) {
    $sshArgs += @("-hostkey", $SshHostKey)
    $scpArgs += @("-hostkey", $SshHostKey)
  }
  if (-not [string]::IsNullOrWhiteSpace($SshKey)) {
    $sshArgs += @("-i", $SshKey)
    $scpArgs += @("-i", $SshKey)
  }
  if (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
    $sshArgs += @("-pw", $SshPassword)
    $scpArgs += @("-pw", $SshPassword)
  }
} else {
  if (-not [string]::IsNullOrWhiteSpace($SshPassword) -and [string]::IsNullOrWhiteSpace($SshKey)) {
    Warn "RPI_PASSWORD cargada. OpenSSH pedira password interactiva en la conexion."
  }
}

$remoteArchivePath = "/tmp/$archiveName"
$extractCmd = "set -e; mkdir -p '$TargetPath'; tar -xzf '$remoteArchivePath' -C '$TargetPath'; rm -f '$remoteArchivePath'"
$sshTarget = ""
$remoteArchiveSpec = ""
$connectedHost = $TargetHost

try {
  $primaryTarget = "$TargetUser@$TargetHost"
  $skipInteractiveAuthPrecheck = (-not $usePutty) -and (-not [string]::IsNullOrWhiteSpace($SshPassword)) -and [string]::IsNullOrWhiteSpace($SshKey)

  $primaryAuthOk = $true
  if ($skipInteractiveAuthPrecheck) {
    Warn "OpenSSH con password interactiva: se omite pre-check SSH para reducir prompts."
  } else {
    Log "Verificando autenticacion SSH para $primaryTarget..."
    $primaryAuthOk = Test-RemoteSshAuth -SshCommand $sshCommand -SshArgs $sshArgs -SshTarget $primaryTarget -UsingPutty:$usePutty
  }

  if (-not $primaryAuthOk -and $usePutty -and $openSshAvailable) {
    Warn "PuTTY no logro conectar/autenticar. Probando OpenSSH automaticamente..."
    $openSshFailure = ""
    if (Test-RemoteSshAuth -SshCommand "ssh" -SshArgs $openSshSshArgs -SshTarget $primaryTarget -UsingPutty:$false -QuietFailure -FailureText ([ref]$openSshFailure)) {
      $usePutty = $false
      $sshCommand = "ssh"
      $scpCommand = "scp"
      $sshArgs = @($openSshSshArgs)
      $scpArgs = @($openSshScpArgs)
      $primaryAuthOk = $true
      Log "Cliente SSH cambiado automaticamente a OpenSSH."
    } elseif (-not [string]::IsNullOrWhiteSpace($openSshFailure)) {
      Warn "OpenSSH fallback tambien fallo: $(Get-FirstDetailLine -Text $openSshFailure)"
    }
  }

  if (-not $primaryAuthOk) {
    $hostCandidates = @(Get-RaspberryHostCandidates -PrimaryHost $TargetHost -Port $parsedPort | Where-Object { $_ -ne $TargetHost })
    if ($hostCandidates.Count -gt 0) {
      Warn "Intentando host alternativo automaticamente: $($hostCandidates -join ', ')"
      foreach ($candidateHost in $hostCandidates) {
        $candidateTarget = "$TargetUser@$candidateHost"
        Log "Verificando autenticacion SSH para $candidateTarget..."
        $candidateFailure = ""
        if (Test-RemoteSshAuth -SshCommand $sshCommand -SshArgs $sshArgs -SshTarget $candidateTarget -UsingPutty:$usePutty -QuietFailure -FailureText ([ref]$candidateFailure)) {
          $connectedHost = $candidateHost
          Warn "Host alternativo seleccionado automaticamente: $connectedHost"
          break
        }
        if (Is-NetworkFailureText -Text $candidateFailure) {
          Warn "Sin conexion SSH en $candidateHost (timeout/red)."
        } else {
          Warn "Autenticacion rechazada en $candidateHost."
        }
      }
    } else {
      Warn "No se encontraron hosts alternativos con SSH disponible para fallback automatico."
    }

    if ($connectedHost -eq $TargetHost) {
      exit 1
    }
  }

  $sshTarget = "$TargetUser@$connectedHost"
  $remoteArchiveSpec = "$sshTarget`:$remoteArchivePath"

  Export-SignalkImageForMigration -ImageRef $SignalkImageRef -ArchivePath $SignalkImageArchive

  Log "Creando paquete de migracion..."
  Invoke-External -Name "tar" -Args $tarArgs

  Log "Subiendo paquete a Raspberry ($remoteArchivePath)..."
  Invoke-ExternalWithRetry -Name $scpCommand -Args ($scpArgs + @($archivePath, $remoteArchiveSpec)) -Operation "Subida de paquete a Raspberry"

  Log "Extrayendo proyecto en Raspberry en $TargetPath..."
  Invoke-ExternalWithRetry -Name $sshCommand -Args ($sshArgs + @($sshTarget, $extractCmd)) -Operation "Extraccion de paquete en Raspberry"

  Log "Migracion completada."
  Write-Host ""
  Write-Host "Siguientes pasos en Raspberry:" -ForegroundColor Cyan
  Write-Host "  ssh -p $TargetPort $sshTarget"
  Write-Host "  cd $TargetPath"
  Write-Host "  npm run init:linux"
  Write-Host ""
} finally {
  if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
  }
}
