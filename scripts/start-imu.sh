#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMU_PUBLISHER="$PROJECT_ROOT/marine-sensor-gateway/rpi/omi-imu/02_publish_signalk.py"

CONFIG_FILE="${OMI_CONFIG_FILE:-$PROJECT_ROOT/config/omi.env}"
CFG_IMU_HOST=""
CFG_IMU_PORT=""
CFG_IMU_RATE=""
CFG_IMU_RAW_ONLY=""
CFG_IMU_NO_PUBLISH=""

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
        IMU_HOST) CFG_IMU_HOST="$value" ;;
        IMU_PORT) CFG_IMU_PORT="$value" ;;
        IMU_RATE) CFG_IMU_RATE="$value" ;;
        IMU_RAW_ONLY) CFG_IMU_RAW_ONLY="$value" ;;
        IMU_NO_PUBLISH) CFG_IMU_NO_PUBLISH="$value" ;;
      esac
    fi
  done < "$file"
}

if [[ -n "$CONFIG_FILE" && "$CONFIG_FILE" != /* ]]; then
  CONFIG_FILE="$PROJECT_ROOT/$CONFIG_FILE"
fi
load_omi_config_file "$CONFIG_FILE"

IMU_HOST="${IMU_HOST:-${CFG_IMU_HOST:-127.0.0.1}}"
IMU_PORT="${IMU_PORT:-${CFG_IMU_PORT:-3000}}"
IMU_RATE="${IMU_RATE:-${CFG_IMU_RATE:-10}}"
IMU_RAW_ONLY="${IMU_RAW_ONLY:-${CFG_IMU_RAW_ONLY:-0}}"
IMU_NO_PUBLISH="${IMU_NO_PUBLISH:-${CFG_IMU_NO_PUBLISH:-0}}"

if [[ ! -f "$IMU_PUBLISHER" ]]; then
  echo "[ERROR] IMU publisher no encontrado en $IMU_PUBLISHER"
  echo "        Verifica que exista marine-sensor-gateway/rpi/omi-imu/02_publish_signalk.py."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 no encontrado."
  exit 1
fi

if [[ ! -e /dev/i2c-1 ]]; then
  echo "[ERROR] /dev/i2c-1 no existe. Habilita I2C en la Raspberry."
  exit 1
fi

imu_raw_only_normalized="$(echo "$IMU_RAW_ONLY" | tr '[:upper:]' '[:lower:]')"
imu_no_publish_normalized="$(echo "$IMU_NO_PUBLISH" | tr '[:upper:]' '[:lower:]')"

imu_args=(
  --host "$IMU_HOST"
  --port "$IMU_PORT"
  --rate "$IMU_RATE"
)

if [[ "$imu_raw_only_normalized" == "1" || "$imu_raw_only_normalized" == "true" || "$imu_raw_only_normalized" == "yes" ]]; then
  imu_args+=(--raw-only)
fi

if [[ "$imu_no_publish_normalized" == "1" || "$imu_no_publish_normalized" == "true" || "$imu_no_publish_normalized" == "yes" ]]; then
  imu_args+=(--no-publish)
  echo "[IMU] Iniciando IMU publisher en modo dry-run (--no-publish)"
else
  echo "[IMU] Iniciando IMU publisher -> Signal K $IMU_HOST:$IMU_PORT (RATE=${IMU_RATE}Hz)"
fi

exec python3 "$IMU_PUBLISHER" "${imu_args[@]}"
