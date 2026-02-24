#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${OMI_CONFIG_FILE:-$PROJECT_ROOT/config/omi.env}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OMI]${NC} $1"; }
warn() { echo -e "${YELLOW}[OMI]${NC} $1"; }
err()  { echo -e "${RED}[OMI]${NC} $1"; }
info() { echo -e "${BLUE}[OMI]${NC} $1"; }

AIS_PPM_DEFAULT="-50"
AIS_GAIN_DEFAULT="33"
AIS_HOST_DEFAULT="127.0.0.1"
AIS_PORT_DEFAULT="10110"
IMU_HOST_DEFAULT="127.0.0.1"
IMU_PORT_DEFAULT="3000"
IMU_RATE_DEFAULT="10"
IMU_AUTO_SETUP_DEFAULT="true"
IMU_RAW_ONLY_DEFAULT="false"
IMU_NO_PUBLISH_DEFAULT="false"
GPS_DEVICE_DEFAULT="auto"
GPS_BAUD_DEFAULT="9600"
GPS_HOST_DEFAULT="127.0.0.1"
GPS_PORT_DEFAULT="3000"
GPS_RATE_DEFAULT="1"
GPS_AUTO_SETUP_DEFAULT="true"
OMI_SIGNALK_IMAGE_DEFAULT="signalk/signalk-server:v2.22.1"
DOCKER_CMD=(docker)
DOCKER_USING_SUDO=0

docker_cmd() {
  "${DOCKER_CMD[@]}" "$@"
}

docker_compose_cmd() {
  docker_cmd compose "$@"
}

normalize_arch() {
  local raw="${1:-}"
  raw="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$raw" in
    amd64|x86_64) echo "amd64" ;;
    arm64|aarch64) echo "arm64" ;;
    armv7l|armv7|armhf) echo "armv7" ;;
    *) echo "$raw" ;;
  esac
}

get_host_arch() {
  local raw=""
  raw="$(docker_cmd info --format '{{.Architecture}}' 2>/dev/null || true)"
  if [[ -z "$raw" ]]; then
    raw="$(uname -m 2>/dev/null || true)"
  fi
  normalize_arch "$raw"
}

get_image_arch() {
  local image_ref="$1"
  local raw=""
  raw="$(docker_cmd image inspect --format '{{.Architecture}}' "$image_ref" 2>/dev/null || true)"
  normalize_arch "$raw"
}

enable_sudo_docker_mode() {
  if [[ "$DOCKER_USING_SUDO" -eq 1 ]]; then
    return 0
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    return 1
  fi

  warn "Intentando modo automatico con sudo para Docker..."
  if ! sudo -v; then
    warn "No se pudo autenticar sudo."
    return 1
  fi

  if sudo docker info >/dev/null 2>&1; then
    DOCKER_CMD=(sudo docker)
    DOCKER_USING_SUDO=1
    log "Docker daemon OK (modo sudo)"
    return 0
  fi

  return 1
}

load_omi_config_file() {
  local file="$1"
  local line key value

  [[ -f "$file" ]] || return
  log "Config OMI cargada desde $file"

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)[[:space:]]*$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"

      if [[ "$value" =~ ^\".*\"$ ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      fi

      case "$key" in
        AIS_PPM) AIS_PPM_DEFAULT="$value" ;;
        AIS_GAIN) AIS_GAIN_DEFAULT="$value" ;;
        AIS_HOST) AIS_HOST_DEFAULT="$value" ;;
        AIS_PORT) AIS_PORT_DEFAULT="$value" ;;
        IMU_HOST) IMU_HOST_DEFAULT="$value" ;;
        IMU_PORT) IMU_PORT_DEFAULT="$value" ;;
        IMU_RATE) IMU_RATE_DEFAULT="$value" ;;
        IMU_AUTO_SETUP) IMU_AUTO_SETUP_DEFAULT="$value" ;;
        IMU_RAW_ONLY) IMU_RAW_ONLY_DEFAULT="$value" ;;
        IMU_NO_PUBLISH) IMU_NO_PUBLISH_DEFAULT="$value" ;;
        GPS_DEVICE) GPS_DEVICE_DEFAULT="$value" ;;
        GPS_BAUD) GPS_BAUD_DEFAULT="$value" ;;
        GPS_HOST) GPS_HOST_DEFAULT="$value" ;;
        GPS_PORT) GPS_PORT_DEFAULT="$value" ;;
        GPS_RATE) GPS_RATE_DEFAULT="$value" ;;
        GPS_AUTO_SETUP) GPS_AUTO_SETUP_DEFAULT="$value" ;;
        OMI_SIGNALK_IMAGE) OMI_SIGNALK_IMAGE_DEFAULT="$value" ;;
      esac
    fi
  done < "$file"
}

is_truthy() {
  local value="${1:-}"
  value="$(echo "$value" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == "1" || "$value" == "true" || "$value" == "yes" || "$value" == "y" || "$value" == "s" ]]
}

detect_usb_gps_device() {
  local candidates=(
    /dev/ttyACM0
    /dev/ttyUSB0
  )
  local dev

  for dev in "${candidates[@]}"; do
    if [[ -e "$dev" ]]; then
      echo "$dev"
      return 0
    fi
  done

  for dev in /dev/ttyACM* /dev/ttyUSB*; do
    if [[ -e "$dev" ]]; then
      echo "$dev"
      return 0
    fi
  done

  return 1
}

detect_imu_i2c_address() {
  if [[ ! -e /dev/i2c-1 ]]; then
    return 1
  fi

  if ! command -v i2cdetect >/dev/null 2>&1; then
    echo "i2c-1"
    return 0
  fi

  local scan_output=""
  scan_output="$(i2cdetect -y 1 2>/dev/null || true)"
  if echo "$scan_output" | grep -qiE '(^|[[:space:]])69($|[[:space:]])'; then
    echo "0x69"
    return 0
  fi
  if echo "$scan_output" | grep -qiE '(^|[[:space:]])68($|[[:space:]])'; then
    echo "0x68"
    return 0
  fi

  return 1
}

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    err "Este script es para Linux. En Windows usa scripts/init.ps1"
    exit 1
  fi
}

check_prereqs() {
  local missing=0

  if ! command -v node >/dev/null 2>&1; then
    err "Node.js no encontrado. Instala Node.js 20/22 LTS: https://nodejs.org/"
    missing=1
  else
    local node_ver node_major
    node_ver="$(node --version | sed 's/^v//')"
    node_major="$(echo "$node_ver" | cut -d. -f1)"
    if [[ "$node_major" != "20" && "$node_major" != "22" ]]; then
      err "Node.js v${node_ver} detectado, se requiere v20.x o v22.x"
      missing=1
    else
      log "Node.js v${node_ver} OK"
    fi
  fi

  if ! command -v npm >/dev/null 2>&1; then
    err "npm no encontrado"
    missing=1
  else
    local npm_ver npm_major
    npm_ver="$(npm --version)"
    npm_major="$(echo "$npm_ver" | cut -d. -f1)"
    if [[ "$npm_major" -lt 10 ]]; then
      err "npm v${npm_ver} detectado, se requiere >=10"
      missing=1
    else
      log "npm v${npm_ver} OK"
    fi
  fi

  if ! command -v docker >/dev/null 2>&1; then
    err "Docker no encontrado. Instala Docker Engine: https://docs.docker.com/engine/install/"
    missing=1
  else
    log "Docker OK"
  fi

  if ! docker compose version >/dev/null 2>&1; then
    err "docker compose no encontrado (plugin requerido)"
    missing=1
  else
    log "docker compose OK"
  fi

  if ! command -v git >/dev/null 2>&1; then
    err "Git no encontrado. Instala Git: https://git-scm.com/downloads"
    missing=1
  else
    log "Git OK"
  fi

  if ! command -v curl >/dev/null 2>&1; then
    warn "curl no encontrado. Se recomienda instalarlo para validaciones HTTP."
  fi

  if [[ "$missing" -ne 0 ]]; then
    err "Faltan prerequisitos. Instalalos y vuelve a ejecutar."
    exit 1
  fi
}

check_docker_daemon() {
  if docker_cmd info >/dev/null 2>&1; then
    log "Docker daemon OK"
    return
  fi

  local docker_error=""
  docker_error="$(docker_cmd info 2>&1 || true)"

  warn "Docker daemon no disponible en primer intento."

  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files docker.service >/dev/null 2>&1; then
    if ! systemctl is-active --quiet docker; then
      warn "Intentando iniciar servicio docker..."
      if [[ "$EUID" -eq 0 ]]; then
        systemctl start docker >/dev/null 2>&1 || true
      elif command -v sudo >/dev/null 2>&1; then
        sudo systemctl start docker >/dev/null 2>&1 || true
      else
        warn "No hay sudo disponible para iniciar docker.service."
      fi
    fi
  fi

  if docker_cmd info >/dev/null 2>&1; then
    log "Docker daemon OK"
    return
  fi

  docker_error="$(docker_cmd info 2>&1 || true)"

  err "Docker daemon no esta disponible."
  if [[ -n "$docker_error" ]]; then
    local detail_line=""
    detail_line="$(echo "$docker_error" | grep -iE 'permission denied|cannot connect|is the docker daemon running|got permission denied' | head -n 1 || true)"
    if [[ -z "$detail_line" ]]; then
      detail_line="$(echo "$docker_error" | head -n 1)"
    fi
    warn "Detalle Docker: $detail_line"
  fi

  if echo "$docker_error" | grep -qi "permission denied"; then
    warn "Parece un problema de permisos sobre /var/run/docker.sock."

    if ! id -nG "$USER" 2>/dev/null | grep -qw docker; then
      if command -v sudo >/dev/null 2>&1; then
        warn "Anadiendo $USER al grupo docker automaticamente..."
        if sudo usermod -aG docker "$USER"; then
          warn "Grupo docker actualizado para futuras sesiones."
        else
          warn "No se pudo actualizar el grupo docker automaticamente."
        fi
      fi
    fi

    if enable_sudo_docker_mode; then
      warn "Se continuara este init usando sudo para Docker."
      warn "En una nueva sesion SSH, Docker deberia funcionar sin sudo si el grupo se aplico."
      return
    fi

    if id -nG "$USER" 2>/dev/null | grep -qw docker; then
      warn "Tu usuario ya pertenece al grupo docker, pero la sesion actual no lo ha aplicado."
      warn "Ejecuta: newgrp docker"
    else
      warn "Ejecuta: sudo usermod -aG docker $USER"
      warn "Luego abre nueva sesion (o ejecuta: newgrp docker)"
    fi
    warn "Despues valida con: docker info"
    exit 1
  fi

  if enable_sudo_docker_mode; then
    warn "Se continuara este init usando sudo para Docker."
    return
  fi

  warn "En Raspberry/Linux prueba: sudo systemctl enable --now docker"
  warn "Luego valida con: docker info"
  exit 1
}

run_compose_up_with_timeout() {
  local timeout_sec="${1:-180}"
  local compose_pid=""
  local start_ts=0
  local now_ts=0
  local elapsed=0
  local rc=0

  (
    docker_compose_cmd --ansi never up -d
  ) &
  compose_pid=$!
  start_ts="$(date +%s)"

  while kill -0 "$compose_pid" >/dev/null 2>&1; do
    now_ts="$(date +%s)"
    elapsed=$((now_ts - start_ts))
    if (( elapsed >= timeout_sec )); then
      warn "docker compose up -d sigue en ejecucion tras ${timeout_sec}s. Cancelando intento..."
      kill "$compose_pid" >/dev/null 2>&1 || true
      sleep 2
      kill -9 "$compose_pid" >/dev/null 2>&1 || true
      set +e
      wait "$compose_pid" >/dev/null 2>&1
      set -e
      return 124
    fi
    sleep 1
  done

  set +e
  wait "$compose_pid"
  rc=$?
  set -e
  return "$rc"
}

restart_docker_service_best_effort() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return
  fi
  if ! systemctl list-unit-files docker.service >/dev/null 2>&1; then
    return
  fi

  warn "Intentando reiniciar docker.service..."
  if [[ "$EUID" -eq 0 ]]; then
    systemctl restart docker >/dev/null 2>&1 || true
  elif command -v sudo >/dev/null 2>&1; then
    sudo systemctl restart docker >/dev/null 2>&1 || true
  fi
}

docker_compose_up_with_recovery() {
  local attempt=1
  local max_attempts=2
  local timeout_sec="${OMI_DOCKER_COMPOSE_UP_TIMEOUT_SEC:-180}"
  local rc=0

  while (( attempt <= max_attempts )); do
    info "Levantando Signal K con Docker Compose (intento ${attempt}/${max_attempts})..."
    if run_compose_up_with_timeout "$timeout_sec"; then
      return 0
    fi

    rc=$?
    if [[ "$rc" -eq 124 ]]; then
      warn "docker compose up -d excedio ${timeout_sec}s."
    else
      warn "docker compose up -d fallo (codigo $rc)."
    fi

    warn "Diagnostico Docker Compose:"
    docker_compose_cmd ps || true
    docker_cmd network ls || true

    if (( attempt < max_attempts )); then
      restart_docker_service_best_effort
      sleep 2
    fi
    attempt=$((attempt + 1))
  done

  err "No se pudo iniciar Signal K con Docker Compose tras varios intentos."
  return 1
}

verify_project_structure() {
  local required=(
    "marine-data-contract"
    "marine-data-simulator"
    "marine-sensor-gateway"
    "marine-instrumentation-ui"
    "signalk-runtime"
  )
  local missing=0

  for dir in "${required[@]}"; do
    if [[ ! -d "$PROJECT_ROOT/$dir" ]]; then
      err "Directorio requerido no encontrado: $dir"
      missing=1
    fi
  done

  if [[ "$missing" -ne 0 ]]; then
    err "Estructura del proyecto incompleta."
    exit 1
  fi

  mkdir -p "$PROJECT_ROOT/scripts" "$PROJECT_ROOT/tools"
}

load_signalk_image_from_migration() {
  local image_ref="${OMI_SIGNALK_IMAGE:-$OMI_SIGNALK_IMAGE_DEFAULT}"
  local image_archive_tar="$PROJECT_ROOT/tools/docker-images/signalk-signalk-server_latest.tar"
  local image_archive_tgz="$PROJECT_ROOT/tools/docker-images/signalk-signalk-server_latest.tar.gz"
  local host_arch=""
  local image_arch=""
  host_arch="$(get_host_arch)"

  if docker_cmd image inspect "$image_ref" >/dev/null 2>&1; then
    image_arch="$(get_image_arch "$image_ref")"
    if [[ -n "$host_arch" && -n "$image_arch" && "$host_arch" != "$image_arch" ]]; then
      warn "Imagen local $image_ref ($image_arch) no coincide con host ($host_arch)."
      warn "Se eliminara la imagen local para forzar pull compatible."
      docker_cmd image rm -f "$image_ref" >/dev/null 2>&1 || true
    else
      log "Imagen Docker $image_ref ya disponible localmente."
      return
    fi
  fi

  if [[ -f "$image_archive_tar" ]]; then
    log "Cargando imagen Docker desde migracion: $image_archive_tar"
    if docker_cmd load -i "$image_archive_tar" >/dev/null 2>&1; then
      log "Imagen Docker cargada desde archivo local."
    else
      warn "Fallo al cargar imagen Docker desde $image_archive_tar"
    fi
  elif [[ -f "$image_archive_tgz" ]]; then
    log "Cargando imagen Docker desde migracion: $image_archive_tgz"
    if gzip -dc "$image_archive_tgz" | docker_cmd load >/dev/null 2>&1; then
      log "Imagen Docker cargada desde archivo comprimido."
    else
      warn "Fallo al cargar imagen Docker desde $image_archive_tgz"
    fi
  fi

  if docker_cmd image inspect "$image_ref" >/dev/null 2>&1; then
    image_arch="$(get_image_arch "$image_ref")"
    if [[ -n "$host_arch" && -n "$image_arch" && "$host_arch" != "$image_arch" ]]; then
      warn "Imagen de migracion incompatible ($image_arch) para host ($host_arch)."
      warn "Se eliminara y Docker descargara una variante compatible."
      docker_cmd image rm -f "$image_ref" >/dev/null 2>&1 || true
    else
      log "Imagen Docker $image_ref preparada localmente."
    fi
  fi

  if ! docker_cmd image inspect "$image_ref" >/dev/null 2>&1; then
    info "Descargando imagen Signal K compatible con arquitectura local..."
    docker_cmd pull "$image_ref" >/dev/null 2>&1 || warn "No se pudo hacer pull previo; Docker compose lo intentara al levantar."
  fi

  if docker_cmd image inspect "$image_ref" >/dev/null 2>&1; then
    image_arch="$(get_image_arch "$image_ref")"
    if [[ -n "$host_arch" && -n "$image_arch" && "$host_arch" != "$image_arch" ]]; then
      warn "Persistio imagen incompatible ($image_arch) para host ($host_arch)."
      warn "Verifica manualmente: docker image inspect $image_ref --format '{{.Architecture}}'"
    else
      log "Imagen Docker $image_ref lista para arquitectura ${host_arch:-desconocida}."
    fi
  else
    warn "No se encontro imagen local $image_ref. Docker compose la descargara."
  fi
}

setup_signalk() {
  log "Configurando Signal K..."
  cd "$PROJECT_ROOT/signalk-runtime"

  if [[ ! -f docker-compose.yml ]]; then
    err "No existe signalk-runtime/docker-compose.yml"
    exit 1
  fi

  if ! grep -q '10110:10110/udp' docker-compose.yml; then
    warn "Anadiendo puerto UDP 10110 a docker-compose.yml"
    awk '
      { print }
      /"3000:3000"/ { print "      - \"10110:10110/udp\"" }
    ' docker-compose.yml > docker-compose.yml.tmp
    mv docker-compose.yml.tmp docker-compose.yml
  fi

  mkdir -p data
  if [[ -f data/settings.json ]] && ! grep -q '"id": "ais-catcher-udp"' data/settings.json; then
    cp data/settings.json "data/settings.json.bak.$(date +%Y%m%d%H%M%S)"
  fi

  cat > data/settings.json <<'SETTINGS_EOF'
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
SETTINGS_EOF

  log "settings.json configurado con proveedor UDP AIS"
  load_signalk_image_from_migration

  docker_compose_cmd down >/dev/null 2>&1 || true
  if ! docker_compose_up_with_recovery; then
    docker_compose_cmd logs --tail=40 signalk || true
    exit 1
  fi

  if command -v curl >/dev/null 2>&1; then
    info "Esperando a que Signal K arranque..."
    local tries=0
    until curl -fsS "http://localhost:3000/signalk" >/dev/null 2>&1; do
      tries=$((tries + 1))
      if [[ "$tries" -ge 30 ]]; then
        err "Signal K no respondio en 30 segundos"
        docker_compose_cmd logs --tail=20 signalk || true
        exit 1
      fi
      sleep 1
    done
    log "Signal K operativo en http://localhost:3000"
  else
    warn "No se pudo validar HTTP de Signal K (curl no instalado)."
  fi
}

build_packages() {
  log "Instalando dependencias y compilando paquetes..."

  cd "$PROJECT_ROOT/marine-data-contract"
  npm install
  npm run build
  log "marine-data-contract OK"

  cd "$PROJECT_ROOT/marine-data-simulator"
  npm install
  npm run build
  log "marine-data-simulator OK"

  cd "$PROJECT_ROOT/marine-instrumentation-ui"
  npm install
  log "marine-instrumentation-ui dependencias OK"

  cd "$PROJECT_ROOT/marine-sensor-gateway"
  npm install
  log "marine-sensor-gateway dependencias OK"
}

compile_ais_catcher() {
  local dest_dir="$1"
  local src_dir="/tmp/AIS-catcher-src"
  local arch jobs

  if ! command -v apt-get >/dev/null 2>&1; then
    err "Compilacion automatica soportada solo en distros con apt-get."
    return 1
  fi

  arch="$(uname -m)"
  jobs="${OMI_AIS_BUILD_JOBS:-}"
  if [[ -z "$jobs" ]]; then
    case "$arch" in
      aarch64|armv7l|armv6l) jobs=1 ;;
      *) jobs="$(nproc)" ;;
    esac
  fi

  info "Instalando dependencias de compilacion (requiere sudo)..."
  sudo apt-get update
  sudo apt-get install -y git cmake pkg-config build-essential librtlsdr-dev libairspy-dev libusb-1.0-0-dev

  rm -rf "$src_dir"
  git clone --depth 1 https://github.com/jvde-github/AIS-catcher.git "$src_dir"
  cd "$src_dir"
  mkdir -p build
  cd build
  cmake -DCMAKE_BUILD_TYPE=Release ..

  if ! make -j"$jobs"; then
    warn "Compilacion inicial de AIS-catcher fallo. Reintentando en modo seguro (j=1, -O1)..."
    if ! make clean >/dev/null 2>&1; then
      true
    fi
    if ! CFLAGS="${CFLAGS:-} -O1" CXXFLAGS="${CXXFLAGS:-} -O1" make -j1; then
      err "Compilacion de AIS-catcher fallo tambien en modo seguro."
      rm -rf "$src_dir"
      return 1
    fi
  fi

  cp AIS-catcher "$dest_dir/"
  chmod +x "$dest_dir/AIS-catcher"
  rm -rf "$src_dir"
}

setup_ais_catcher() {
  local ais_dir="$PROJECT_ROOT/tools/ais-catcher"
  local ais_bin="$ais_dir/AIS-catcher"

  if [[ -x "$ais_bin" ]]; then
    log "AIS-catcher ya instalado en $ais_dir"
    return
  fi

  read -r -p "Deseas instalar AIS-catcher para recepcion AIS real? [s/N]: " response
  if [[ ! "$response" =~ ^[sSyY]$ ]]; then
    warn "Instalacion de AIS-catcher omitida."
    return
  fi

  mkdir -p "$ais_dir"
  local arch download_url tmp_zip
  arch="$(uname -m)"
  tmp_zip="/tmp/ais-catcher.zip"

  case "$arch" in
    x86_64)
      download_url="https://github.com/jvde-github/AIS-catcher/releases/latest/download/AIS-catcher-linux-x86_64.zip"
      ;;
    aarch64)
      download_url="https://github.com/jvde-github/AIS-catcher/releases/latest/download/AIS-catcher-linux-aarch64.zip"
      ;;
    *)
      warn "Arquitectura $arch no tiene binario precompilado."
      download_url=""
      ;;
  esac

  if [[ -n "$download_url" ]]; then
    log "Descargando AIS-catcher ($arch)..."
    local download_ok=0
    if command -v curl >/dev/null 2>&1; then
      if curl -fsSL "$download_url" -o "$tmp_zip"; then
        download_ok=1
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -q -O "$tmp_zip" "$download_url"; then
        download_ok=1
      fi
    else
      warn "No hay curl/wget para descargar binario."
    fi

    if [[ "$download_ok" -eq 0 ]]; then
      warn "No hay binario precompilado disponible en el release actual para $arch."
    elif [[ -f "$tmp_zip" ]]; then
      if ! command -v unzip >/dev/null 2>&1; then
        err "unzip no encontrado. Instalalo para descomprimir AIS-catcher."
      else
        unzip -qo "$tmp_zip" -d "$ais_dir/"
        chmod +x "$ais_bin" 2>/dev/null || true
        rm -f "$tmp_zip"
      fi
    fi
  fi

  if [[ ! -x "$ais_bin" ]]; then
    read -r -p "No se pudo instalar binario. Compilar AIS-catcher desde fuente? [s/N]: " compile_response
    if [[ "$compile_response" =~ ^[sSyY]$ ]]; then
      if ! compile_ais_catcher "$ais_dir"; then
        warn "AIS-catcher no pudo compilarse automaticamente. El init continuara sin AIS real."
      fi
    fi
  fi

  if [[ -x "$ais_bin" ]]; then
    log "AIS-catcher instalado en $ais_dir"
  else
    warn "AIS-catcher no quedo instalado. Puedes hacerlo manualmente mas tarde."
    return
  fi

  if [[ -d /etc/udev/rules.d ]]; then
    read -r -p "Instalar reglas udev para RTL-SDR (requiere sudo)? [s/N]: " udev_response
    if [[ "$udev_response" =~ ^[sSyY]$ ]]; then
      sudo bash -c 'cat > /etc/udev/rules.d/20-rtlsdr.rules << "EOF"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2838", GROUP="plugdev", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="2832", GROUP="plugdev", MODE="0666"
EOF'
      sudo udevadm control --reload-rules
      sudo udevadm trigger
      log "Reglas udev instaladas"
    fi
  fi
}

setup_imu_publisher() {
  local imu_setup_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/setup.sh"
  local imu_publish_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_signalk.py"
  local imu_addr=""
  local setup_now=0

  if [[ ! -f "$imu_publish_script" ]]; then
    warn "Script IMU no encontrado: $imu_publish_script"
    return
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    warn "python3 no disponible. Se omite setup IMU."
    return
  fi

  imu_addr="$(detect_imu_i2c_address || true)"
  if [[ -z "$imu_addr" ]]; then
    warn "No se detecto IMU ICM-20948 en I2C (0x69/0x68) o no existe /dev/i2c-1."
    return
  fi

  log "IMU detectado en bus I2C ($imu_addr)"

  if [[ ! -f "$imu_setup_script" ]]; then
    warn "setup.sh de IMU no encontrado: $imu_setup_script"
    return
  fi

  if is_truthy "$IMU_AUTO_SETUP_DEFAULT"; then
    setup_now=1
  else
    local setup_response
    read -r -p "IMU detectado. Deseas ejecutar setup.sh ahora? [s/N]: " setup_response
    if [[ "$setup_response" =~ ^[sSyY]$ ]]; then
      setup_now=1
    fi
  fi

  if [[ "$setup_now" -ne 1 ]]; then
    warn "Setup IMU omitido."
    return
  fi

  info "Configurando dependencias IMU..."
  if bash "$imu_setup_script"; then
    log "Setup IMU completado."
  else
    warn "setup.sh de IMU fallo. Puedes reintentarlo con:"
    warn "  bash $imu_setup_script"
  fi
}

setup_gps_publisher() {
  local gps_setup_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/setup_gps.sh"
  local gps_publish_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_gps_signalk.py"
  local gps_device=""
  local setup_now=0

  if [[ ! -f "$gps_publish_script" ]]; then
    warn "Script GPS no encontrado: $gps_publish_script"
    return
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    warn "python3 no disponible. Se omite setup GPS."
    return
  fi

  gps_device="$(detect_usb_gps_device || true)"
  if [[ -z "$gps_device" ]]; then
    warn "No se detecto GPS USB (/dev/ttyACM* o /dev/ttyUSB*)."
    return
  fi

  log "GPS USB detectado en $gps_device"

  if [[ ! -f "$gps_setup_script" ]]; then
    warn "setup_gps.sh no encontrado: $gps_setup_script"
    return
  fi

  if is_truthy "$GPS_AUTO_SETUP_DEFAULT"; then
    setup_now=1
  else
    local setup_response
    read -r -p "GPS detectado. Deseas ejecutar setup_gps.sh ahora? [s/N]: " setup_response
    if [[ "$setup_response" =~ ^[sSyY]$ ]]; then
      setup_now=1
    fi
  fi

  if [[ "$setup_now" -ne 1 ]]; then
    warn "Setup GPS omitido."
    return
  fi

  info "Configurando dependencias GPS..."
  if bash "$gps_setup_script"; then
    log "Setup GPS completado."
  else
    warn "setup_gps.sh fallo. Puedes reintentarlo con:"
    warn "  bash $gps_setup_script"
  fi
}

detect_lan_ip() {
  local lan_ip=""

  if command -v ip >/dev/null 2>&1; then
    lan_ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
    if [[ -n "$lan_ip" ]]; then
      echo "$lan_ip"
      return
    fi
  fi

  if command -v ip >/dev/null 2>&1; then
    lan_ip="$(ip -4 -o addr show up scope global 2>/dev/null | awk '!/ docker|br-|veth|lo / {split($4,a,\"/\"); print a[1]; exit}')"
    if [[ -n "$lan_ip" ]]; then
      echo "$lan_ip"
      return
    fi
  fi

  if command -v hostname >/dev/null 2>&1; then
    lan_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [[ -n "$lan_ip" ]]; then
      echo "$lan_ip"
      return
    fi
  fi

  echo ""
}

print_summary() {
  local ais_bin="$PROJECT_ROOT/tools/ais-catcher/AIS-catcher"
  local imu_publish_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_signalk.py"
  local gps_publish_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_gps_signalk.py"
  local imu_addr=""
  local gps_device=""
  local lan_ip
  lan_ip="$(detect_lan_ip)"
  imu_addr="$(detect_imu_i2c_address || true)"
  gps_device="$(detect_usb_gps_device || true)"
  echo ""
  echo -e "${GREEN}============================================================${NC}"
  echo -e "${GREEN} OMI - Open Marine Instrumentation - Inicializado OK       ${NC}"
  echo -e "${GREEN}============================================================${NC}"
  echo ""
  echo -e "  ${BLUE}Signal K local:${NC}  http://localhost:3000"
  if [[ -n "$lan_ip" ]]; then
    echo -e "  ${BLUE}Signal K red:${NC}    http://${lan_ip}:3000"
  fi
  echo -e "  ${BLUE}UDP AIS:${NC}   puerto 10110"
  echo ""
  echo -e "  ${YELLOW}UI:${NC}         npm run start:ui"
  if [[ -n "$lan_ip" ]]; then
    echo -e "  ${YELLOW}UI en red:${NC}   http://${lan_ip}:4200"
  fi
  echo -e "  ${YELLOW}Simulator:${NC}  cd marine-data-simulator && npm run dev"
  echo -e "  ${YELLOW}Nota:${NC}        localhost solo funciona en la Raspberry."
  echo ""
  echo -e "  ${YELLOW}AIS real:${NC}"
  if [[ -x "$ais_bin" ]]; then
    echo "    npm run start:ais"
    echo "    (config: PPM=$AIS_PPM_DEFAULT, GAIN=$AIS_GAIN_DEFAULT, HOST=$AIS_HOST_DEFAULT, PORT=$AIS_PORT_DEFAULT)"
  else
    echo "    Ejecuta scripts/init.sh y selecciona instalacion de AIS-catcher."
  fi
  echo ""
  echo -e "  ${YELLOW}IMU real:${NC}"
  if [[ -f "$imu_publish_script" ]]; then
    echo "    npm run start:imu"
    echo "    (config: HOST=$IMU_HOST_DEFAULT, PORT=$IMU_PORT_DEFAULT, RATE=${IMU_RATE_DEFAULT}Hz, RAW_ONLY=$IMU_RAW_ONLY_DEFAULT)"
    if [[ -n "$imu_addr" ]]; then
      echo "    IMU I2C detectado: $imu_addr"
    else
      echo "    IMU I2C no detectado ahora (/dev/i2c-1, 0x69/0x68)."
    fi
  else
    echo "    Script IMU no encontrado en marine-sensor-gateway/rpi/omi-imu."
  fi
  echo ""
  echo -e "  ${YELLOW}GPS real:${NC}"
  if [[ -f "$gps_publish_script" ]]; then
    echo "    npm run start:gps"
    echo "    (config: DEVICE=$GPS_DEVICE_DEFAULT, BAUD=$GPS_BAUD_DEFAULT, HOST=$GPS_HOST_DEFAULT, PORT=$GPS_PORT_DEFAULT, RATE=${GPS_RATE_DEFAULT}Hz)"
    if [[ -n "$gps_device" ]]; then
      echo "    GPS USB detectado: $gps_device"
    else
      echo "    GPS USB no detectado ahora (/dev/ttyACM* o /dev/ttyUSB*)."
    fi
  else
    echo "    Script GPS no encontrado en marine-sensor-gateway/rpi/omi-imu."
  fi
  echo ""
}

start_post_init_services() {
  local start_ui_response
  read -r -p "Deseas arrancar UI ahora? [s/N]: " start_ui_response
  if [[ "$start_ui_response" =~ ^[sSyY]$ ]]; then
    (
      cd "$PROJECT_ROOT/marine-instrumentation-ui"
      nohup npm run start:lan > "$PROJECT_ROOT/.omi-ui.log" 2>&1 &
      echo $! > "$PROJECT_ROOT/.omi-ui.pid"
    )
    log "UI arrancada en background."
    info "Log UI: $PROJECT_ROOT/.omi-ui.log"
  fi

  local start_sim_response
  read -r -p "Deseas arrancar Simulator ahora? [s/N]: " start_sim_response
  if [[ "$start_sim_response" =~ ^[sSyY]$ ]]; then
    local scenario_choice scenario rate_input rate

    echo "Escenarios disponibles:"
    echo "  1) basic-cruise (default)"
    echo "  2) harbor-traffic"
    echo "  3) coastal-run"
    echo "  4) anchored-stale"
    echo "  5) busy-shipping-lane"
    echo "  6) combined-failures"
    echo "  7) anchor-drift"
    read -r -p "Selecciona escenario [1-7 o nombre]: " scenario_choice

    case "$scenario_choice" in
      ""|"1") scenario="basic-cruise" ;;
      "2") scenario="harbor-traffic" ;;
      "3") scenario="coastal-run" ;;
      "4") scenario="anchored-stale" ;;
      "5") scenario="busy-shipping-lane" ;;
      "6") scenario="combined-failures" ;;
      "7") scenario="anchor-drift" ;;
      "basic-cruise"|"harbor-traffic"|"coastal-run"|"anchored-stale"|"busy-shipping-lane"|"combined-failures"|"anchor-drift")
        scenario="$scenario_choice"
        ;;
      *)
        warn "Escenario invalido. Se usara basic-cruise."
        scenario="basic-cruise"
        ;;
    esac

    read -r -p "Frecuencia del simulador en Hz [1]: " rate_input
    if [[ -z "$rate_input" ]]; then
      rate="1"
    elif [[ "$rate_input" =~ ^[0-9]+([.][0-9]+)?$ ]] && [[ ! "$rate_input" =~ ^0+([.]0+)?$ ]]; then
      rate="$rate_input"
    else
      warn "Rate invalido. Se usara 1 Hz."
      rate="1"
    fi

    (
      cd "$PROJECT_ROOT/marine-data-simulator"
      nohup npm run dev -- --scenario "$scenario" --rate "$rate" > "$PROJECT_ROOT/.omi-simulator.log" 2>&1 &
      echo $! > "$PROJECT_ROOT/.omi-simulator.pid"
    )

    log "Simulator arrancado en background (scenario=$scenario, rate=${rate}Hz)."
    info "Log Simulator: $PROJECT_ROOT/.omi-simulator.log"
  fi

  if [[ -x "$PROJECT_ROOT/tools/ais-catcher/AIS-catcher" ]]; then
    local ais_response
    read -r -p "Deseas arrancar AIS-catcher ahora? [s/N]: " ais_response
    if [[ "$ais_response" =~ ^[sSyY]$ ]]; then
      nohup bash "$PROJECT_ROOT/scripts/start-ais.sh" > "$PROJECT_ROOT/.omi-ais.log" 2>&1 &
      echo $! > "$PROJECT_ROOT/.omi-ais.pid"
      log "AIS-catcher arrancado en background."
      info "Log AIS: $PROJECT_ROOT/.omi-ais.log"
    fi
  fi

  local imu_publish_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_signalk.py"
  if [[ -f "$imu_publish_script" ]]; then
    local imu_addr
    imu_addr="$(detect_imu_i2c_address || true)"
    if [[ -n "$imu_addr" ]]; then
      local imu_response
      read -r -p "Deseas arrancar IMU publisher ahora? [s/N]: " imu_response
      if [[ "$imu_response" =~ ^[sSyY]$ ]]; then
        nohup bash "$PROJECT_ROOT/scripts/start-imu.sh" > "$PROJECT_ROOT/.omi-imu.log" 2>&1 &
        echo $! > "$PROJECT_ROOT/.omi-imu.pid"
        log "IMU publisher arrancado en background."
        info "Log IMU: $PROJECT_ROOT/.omi-imu.log"
      fi
    else
      warn "IMU publisher disponible pero no se detecta ICM-20948 por I2C."
    fi
  fi

  local gps_publish_script="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_gps_signalk.py"
  if [[ -f "$gps_publish_script" ]]; then
    local gps_device
    gps_device="$(detect_usb_gps_device || true)"
    if [[ -n "$gps_device" ]]; then
      local gps_response
      read -r -p "Deseas arrancar GPS publisher ahora? [s/N]: " gps_response
      if [[ "$gps_response" =~ ^[sSyY]$ ]]; then
        nohup bash "$PROJECT_ROOT/scripts/start-gps.sh" > "$PROJECT_ROOT/.omi-gps.log" 2>&1 &
        echo $! > "$PROJECT_ROOT/.omi-gps.pid"
        log "GPS publisher arrancado en background."
        info "Log GPS: $PROJECT_ROOT/.omi-gps.log"
      fi
    else
      warn "GPS publisher disponible pero no se detecta dispositivo USB GPS."
    fi
  fi
}

main() {
  echo ""
  echo -e "${BLUE}OMI Project Initialization (Linux)${NC}"
  echo ""
  require_linux
  if [[ -n "$CONFIG_FILE" && "$CONFIG_FILE" != /* ]]; then
    CONFIG_FILE="$PROJECT_ROOT/$CONFIG_FILE"
  fi
  load_omi_config_file "$CONFIG_FILE"
  check_prereqs
  check_docker_daemon
  verify_project_structure
  setup_signalk
  build_packages
  setup_ais_catcher
  setup_imu_publisher
  setup_gps_publisher
  print_summary
  start_post_init_services
}

main "$@"
