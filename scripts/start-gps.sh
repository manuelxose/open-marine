#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GPS_PUBLISHER="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_gps_signalk.py"

CONFIG_FILE="${OMI_CONFIG_FILE:-$PROJECT_ROOT/config/omi.env}"
CFG_GPS_DEVICE=""
CFG_GPS_BAUD=""
CFG_GPS_HOST=""
CFG_GPS_PORT=""
CFG_GPS_RATE=""
CFG_GPS_NO_PUBLISH=""
CFG_GPS_STATIONARY_SOG_KNOTS=""
CFG_GPS_STATIONARY_RADIUS_METERS=""

load_omi_config_file() {
  local file="$1"
  local line key value

  [[ -f "$file" ]] || return

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
        GPS_DEVICE) CFG_GPS_DEVICE="$value" ;;
        GPS_BAUD) CFG_GPS_BAUD="$value" ;;
        GPS_HOST) CFG_GPS_HOST="$value" ;;
        GPS_PORT) CFG_GPS_PORT="$value" ;;
        GPS_RATE) CFG_GPS_RATE="$value" ;;
        GPS_NO_PUBLISH) CFG_GPS_NO_PUBLISH="$value" ;;
        GPS_STATIONARY_SOG_KNOTS) CFG_GPS_STATIONARY_SOG_KNOTS="$value" ;;
        GPS_STATIONARY_RADIUS_METERS) CFG_GPS_STATIONARY_RADIUS_METERS="$value" ;;
      esac
    fi
  done < "$file"
}

if [[ -n "$CONFIG_FILE" && "$CONFIG_FILE" != /* ]]; then
  CONFIG_FILE="$PROJECT_ROOT/$CONFIG_FILE"
fi
load_omi_config_file "$CONFIG_FILE"

GPS_DEVICE="${GPS_DEVICE:-${CFG_GPS_DEVICE:-auto}}"
GPS_BAUD="${GPS_BAUD:-${CFG_GPS_BAUD:-9600}}"
GPS_HOST="${GPS_HOST:-${CFG_GPS_HOST:-127.0.0.1}}"
GPS_PORT="${GPS_PORT:-${CFG_GPS_PORT:-3000}}"
GPS_RATE="${GPS_RATE:-${CFG_GPS_RATE:-1}}"
GPS_NO_PUBLISH="${GPS_NO_PUBLISH:-${CFG_GPS_NO_PUBLISH:-0}}"
GPS_STATIONARY_SOG_KNOTS="${GPS_STATIONARY_SOG_KNOTS:-${CFG_GPS_STATIONARY_SOG_KNOTS:-2.0}}"
GPS_STATIONARY_RADIUS_METERS="${GPS_STATIONARY_RADIUS_METERS:-${CFG_GPS_STATIONARY_RADIUS_METERS:-12}}"

if [[ ! -f "$GPS_PUBLISHER" ]]; then
  echo "[ERROR] GPS publisher no encontrado en $GPS_PUBLISHER"
  echo "        Verifica que exista marine-sensor-gateway/rpi/omi-imu/02_publish_gps_signalk.py."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 no encontrado."
  exit 1
fi

gps_no_publish_normalized="$(echo "$GPS_NO_PUBLISH" | tr '[:upper:]' '[:lower:]')"
gps_args=(
  --host "$GPS_HOST"
  --port "$GPS_PORT"
  --device "$GPS_DEVICE"
  --baud "$GPS_BAUD"
  --rate "$GPS_RATE"
  --stationary-sog-knots "$GPS_STATIONARY_SOG_KNOTS"
  --stationary-radius-meters "$GPS_STATIONARY_RADIUS_METERS"
)

if [[ "$gps_no_publish_normalized" == "1" || "$gps_no_publish_normalized" == "true" || "$gps_no_publish_normalized" == "yes" ]]; then
  gps_args+=(--no-publish)
  echo "[GPS] Iniciando GPS publisher en modo dry-run (--no-publish)"
else
  echo "[GPS] Iniciando GPS publisher -> Signal K $GPS_HOST:$GPS_PORT (DEVICE=$GPS_DEVICE, BAUD=$GPS_BAUD, RATE=${GPS_RATE}Hz, STOP<=${GPS_STATIONARY_SOG_KNOTS}kn, R=${GPS_STATIONARY_RADIUS_METERS}m)"
fi

exec python3 "$GPS_PUBLISHER" "${gps_args[@]}"
