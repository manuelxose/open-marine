#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log() { echo "[OMI] $1"; }
err() { echo "[OMI] $1" >&2; }
warn() { echo "[OMI] $1"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Comando requerido no encontrado: $1"
    exit 1
  fi
}

test_tcp_port() {
  local host="$1"
  local port="$2"

  if command -v nc >/dev/null 2>&1; then
    nc -z -w 1 "$host" "$port" >/dev/null 2>&1
    return $?
  fi

  if command -v timeout >/dev/null 2>&1; then
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" >/dev/null 2>&1
    return $?
  fi

  return 1
}

get_raspberry_arp_candidates() {
  local oui_regex='^(b8:27:eb|dc:a6:32|e4:5f:01|28:cd:c1|2c:cf:67|d8:3a:dd)'
  if ! command -v ip >/dev/null 2>&1; then
    return 0
  fi

  ip neigh show 2>/dev/null | awk -v re="$oui_regex" '
    /lladdr/ {
      ip=$1
      mac=tolower($5)
      if (mac ~ re) print ip
    }
  ' | sort -u
}

auto_detect_raspberry_host() {
  local port="$1"
  local ip

  if test_tcp_port "raspberrypi.local" "$port"; then
    echo "raspberrypi.local"
    return
  fi

  local candidates=()
  while IFS= read -r ip; do
    [[ -n "$ip" ]] && candidates+=("$ip")
  done < <(get_raspberry_arp_candidates)

  local reachable=()
  for ip in "${candidates[@]}"; do
    if test_tcp_port "$ip" "$port"; then
      reachable+=("$ip")
    fi
  done

  if [[ ${#reachable[@]} -eq 1 ]]; then
    echo "${reachable[0]}"
    return
  fi
  if [[ ${#reachable[@]} -gt 1 ]]; then
    warn "Se detectaron varias Raspberry con SSH abierto: ${reachable[*]}"
    echo ""
    return
  fi

  echo ""
}

get_generic_ssh_candidates() {
  local port="$1"
  local ip
  local generic=()

  if command -v arp >/dev/null 2>&1; then
    while IFS= read -r ip; do
      [[ -n "$ip" ]] && generic+=("$ip")
    done < <(arp -an 2>/dev/null | awk '/\([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\)/ {gsub(/[()]/,"",$2); print $2}' | sort -u | head -n 20)
  fi

  local reachable=()
  for ip in "${generic[@]}"; do
    if test_tcp_port "$ip" "$port"; then
      reachable+=("$ip")
    fi
  done

  printf '%s\n' "${reachable[@]}" | awk 'NF' | sort -u
}

TARGET_HOST="${1:-${RPI_HOST:-}}"
TARGET_USER="${2:-${RPI_USER:-}}"
TARGET_PORT="${3:-${RPI_PORT:-}}"
TARGET_PATH="${4:-${RPI_PATH:-}}"
SSH_KEY="${RPI_SSH_KEY:-}"
SSH_PASSWORD="${RPI_PASSWORD:-}"
SSH_HOSTKEY="${RPI_HOSTKEY:-}"
SSH_CLIENT="${RPI_SSH_CLIENT:-}"
CONFIG_FILE="${RPI_CONFIG_FILE:-${OMI_CONFIG_FILE:-}}"
SIGNALK_IMAGE_REF="${OMI_SIGNALK_IMAGE:-signalk/signalk-server:v2.22.1}"
SIGNALK_IMAGE_ARCHIVE="$PROJECT_ROOT/tools/docker-images/signalk-signalk-server_latest.tar"
INCLUDE_DOCKER_IMAGE_MIGRATION="${OMI_MIGRATE_INCLUDE_DOCKER_IMAGE:-false}"

if [[ -z "$CONFIG_FILE" ]]; then
  if [[ -f "$PROJECT_ROOT/config/omi.env" ]]; then
    CONFIG_FILE="$PROJECT_ROOT/config/omi.env"
  else
    CONFIG_FILE="$PROJECT_ROOT/config/raspberry.env"
  fi
fi

load_raspberry_config_file() {
  local file="$1"
  local line key value

  [[ -f "$file" ]] || return
  log "Config Raspberry cargada desde $file"

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
        RPI_HOST) [[ -z "$TARGET_HOST" ]] && TARGET_HOST="$value" ;;
        RPI_USER) [[ -z "$TARGET_USER" ]] && TARGET_USER="$value" ;;
        RPI_PORT) [[ -z "$TARGET_PORT" ]] && TARGET_PORT="$value" ;;
        RPI_PATH) [[ -z "$TARGET_PATH" ]] && TARGET_PATH="$value" ;;
        RPI_SSH_KEY) [[ -z "$SSH_KEY" ]] && SSH_KEY="$value" ;;
        RPI_PASSWORD) [[ -z "$SSH_PASSWORD" ]] && SSH_PASSWORD="$value" ;;
        RPI_HOSTKEY) [[ -z "$SSH_HOSTKEY" ]] && SSH_HOSTKEY="$value" ;;
        RPI_SSH_CLIENT) [[ -z "$SSH_CLIENT" ]] && SSH_CLIENT="$value" ;;
      esac
    fi
  done < "$file"
}

export_signalk_image_for_migration() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker no disponible en este equipo. Se omitira exportar imagen Signal K."
    return
  fi

  mkdir -p "$(dirname "$SIGNALK_IMAGE_ARCHIVE")"

  if ! docker image inspect "$SIGNALK_IMAGE_REF" >/dev/null 2>&1; then
    warn "Imagen $SIGNALK_IMAGE_REF no encontrada localmente. Intentando docker pull..."
    if ! docker pull "$SIGNALK_IMAGE_REF"; then
      warn "No se pudo obtener $SIGNALK_IMAGE_REF. La Raspberry descargara la imagen en npm run init."
      return
    fi
  fi

  log "Exportando imagen Docker $SIGNALK_IMAGE_REF para migracion..."
  if docker save -o "$SIGNALK_IMAGE_ARCHIVE" "$SIGNALK_IMAGE_REF"; then
    log "Imagen Docker empaquetada: $SIGNALK_IMAGE_ARCHIVE"
  else
    warn "No se pudo exportar imagen Docker ($SIGNALK_IMAGE_REF)."
  fi
}

require_cmd ssh
require_cmd scp
require_cmd tar

if [[ -n "$CONFIG_FILE" && "$CONFIG_FILE" != /* ]]; then
  CONFIG_FILE="$PROJECT_ROOT/$CONFIG_FILE"
fi
load_raspberry_config_file "$CONFIG_FILE"

if [[ -z "$TARGET_USER" ]]; then
  TARGET_USER="pi"
fi
if [[ -z "$TARGET_PORT" ]]; then
  TARGET_PORT="22"
fi
if [[ -z "$TARGET_PATH" ]]; then
  TARGET_PATH="/home/${TARGET_USER}/open-marine"
fi

if [[ -z "$TARGET_HOST" ]]; then
  TARGET_HOST="$(auto_detect_raspberry_host "$TARGET_PORT")"
  if [[ -n "$TARGET_HOST" ]]; then
    read -r -p "Host Raspberry detectado automaticamente: $TARGET_HOST. Usar este host? [Y/n]: " use_detected
    if [[ -z "${use_detected:-}" || "${use_detected:-}" =~ ^[yYsS]$ ]]; then
      log "Host Raspberry seleccionado: $TARGET_HOST"
    else
      TARGET_HOST=""
    fi
  fi
fi

if [[ -z "$TARGET_HOST" ]]; then
  mapfile -t generic_hosts < <(get_generic_ssh_candidates "$TARGET_PORT")
  if [[ ${#generic_hosts[@]} -gt 0 ]]; then
    warn "No se pudo identificar Raspberry de forma segura."
    warn "Hosts con SSH abierto detectados: ${generic_hosts[*]}"
    warn "Indica manualmente el host/IP correcto de la Raspberry."
  fi
  read -r -p "Raspberry host/IP (ej: raspberrypi.local o 192.168.1.50): " TARGET_HOST
fi
if [[ -z "$TARGET_HOST" ]]; then
  err "Host de Raspberry no especificado."
  exit 1
fi

use_sshpass=0
if [[ -n "$SSH_PASSWORD" && -z "$SSH_KEY" ]]; then
  if [[ -n "$SSH_CLIENT" && "$SSH_CLIENT" != "sshpass" && "$SSH_CLIENT" != "openssh" ]]; then
    warn "Valor no reconocido para RPI_SSH_CLIENT: $SSH_CLIENT (valores validos: sshpass|openssh)"
  fi

  if [[ "$SSH_CLIENT" != "openssh" ]] && command -v sshpass >/dev/null 2>&1; then
    use_sshpass=1
    log "Cliente SSH seleccionado: sshpass + OpenSSH"
  else
    warn "RPI_PASSWORD cargada. OpenSSH pedira password interactiva en la conexion."
    warn "Para modo no interactivo instala sshpass: sudo apt-get install -y sshpass"
  fi
fi

timestamp="$(date +%Y%m%d%H%M%S)"
archive_name="open-marine-migrate-${timestamp}.tar.gz"
archive_path="/tmp/${archive_name}"

ssh_cmd=(ssh -p "$TARGET_PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 -o ConnectionAttempts=1)
scp_cmd=(scp -P "$TARGET_PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8)

if [[ -n "$SSH_KEY" ]]; then
  ssh_cmd+=(-i "$SSH_KEY")
  scp_cmd+=(-i "$SSH_KEY")
fi

if [[ "$use_sshpass" -eq 1 ]]; then
  ssh_cmd=(sshpass -p "$SSH_PASSWORD" "${ssh_cmd[@]}" -o PubkeyAuthentication=no -o PreferredAuthentications=password -o NumberOfPasswordPrompts=1)
  scp_cmd=(sshpass -p "$SSH_PASSWORD" "${scp_cmd[@]}" -o PubkeyAuthentication=no -o PreferredAuthentications=password -o NumberOfPasswordPrompts=1)
fi

log "Creando paquete de migracion..."
case "$(echo "$INCLUDE_DOCKER_IMAGE_MIGRATION" | tr '[:upper:]' '[:lower:]')" in
  true|1|yes|y|s|si)
    export_signalk_image_for_migration
    ;;
  *)
    warn "Se omite imagen Docker en el paquete. Usa OMI_MIGRATE_INCLUDE_DOCKER_IMAGE=true para migracion offline."
    ;;
esac
tar -czf "$archive_path" \
  --exclude=.git \
  --exclude=.github \
  --exclude=.vscode \
  --exclude=node_modules \
  --exclude='*/node_modules' \
  --exclude=dist \
  --exclude='*/dist' \
  --exclude=.angular \
  --exclude=coverage \
  --exclude=.omi-*.log \
  --exclude=.omi-*.pid \
  --exclude=tools/ais-catcher \
  --exclude=tools/docker-images \
  -C "$PROJECT_ROOT" .

remote="${TARGET_USER}@${TARGET_HOST}"

log "Conectando por SSH a $remote (puede pedir password)..."
log "Creando ruta destino en Raspberry: $TARGET_PATH"
"${ssh_cmd[@]}" "$remote" "mkdir -p '$TARGET_PATH'"

log "Subiendo paquete a Raspberry..."
"${scp_cmd[@]}" "$archive_path" "$remote:$TARGET_PATH/$archive_name"

log "Extrayendo proyecto en Raspberry..."
"${ssh_cmd[@]}" "$remote" "set -e; cd '$TARGET_PATH'; tar -xzf '$archive_name'; rm -f '$archive_name'; find '$TARGET_PATH' -type f \( -name '*.sh' -o -name '*.py' -o -name '*.mjs' \) -exec sed -i 's/\r$//' {} +"

rm -f "$archive_path"

log "Migracion completada."
echo ""
echo "Siguientes pasos en Raspberry:"
echo "  ssh -p $TARGET_PORT $remote"
echo "  cd $TARGET_PATH"
echo "  npm run init"
echo ""
