#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AIS_BIN="$PROJECT_ROOT/tools/ais-catcher/AIS-catcher"

CONFIG_FILE="${OMI_CONFIG_FILE:-$PROJECT_ROOT/config/omi.env}"
CFG_AIS_PPM=""
CFG_AIS_GAIN=""
CFG_AIS_HOST=""
CFG_AIS_PORT=""

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
        AIS_PPM) CFG_AIS_PPM="$value" ;;
        AIS_GAIN) CFG_AIS_GAIN="$value" ;;
        AIS_HOST) CFG_AIS_HOST="$value" ;;
        AIS_PORT) CFG_AIS_PORT="$value" ;;
      esac
    fi
  done < "$file"
}

if [[ -n "$CONFIG_FILE" && "$CONFIG_FILE" != /* ]]; then
  CONFIG_FILE="$PROJECT_ROOT/$CONFIG_FILE"
fi
load_omi_config_file "$CONFIG_FILE"

PPM="${AIS_PPM:-${CFG_AIS_PPM:--50}}"
GAIN="${AIS_GAIN:-${CFG_AIS_GAIN:-33}}"
UDP_HOST="${AIS_HOST:-${CFG_AIS_HOST:-127.0.0.1}}"
UDP_PORT="${AIS_PORT:-${CFG_AIS_PORT:-10110}}"

if [[ ! -x "$AIS_BIN" ]]; then
  echo "[ERROR] AIS-catcher no encontrado en $AIS_BIN"
  echo "        Ejecuta scripts/init.sh primero."
  exit 1
fi

DEVICE_LIST="$("$AIS_BIN" -l 2>&1 || true)"
RTL_DEVICE_LINE="$(
  printf '%s\n' "$DEVICE_LIST" \
    | grep -Ei '^[[:space:]]*[0-9]+:.*(RTL-SDR|RTL28[0-9A-Z]*|R820T|R828D|Realtek)' \
    | head -n 1 \
    || true
)"
if [[ -z "$RTL_DEVICE_LINE" ]]; then
  echo "[AIS] No hay un receptor RTL-SDR conectado; servicio detenido sin abrir puertos serie."
  exit 0
fi
RTL_DEVICE_INDEX="$(
  printf '%s\n' "$RTL_DEVICE_LINE" \
    | sed -E 's/^[[:space:]]*([0-9]+):.*/\1/'
)"

echo "[AIS] RTL-SDR detectado como dispositivo $RTL_DEVICE_INDEX."
echo "[AIS] Iniciando AIS-catcher -> UDP $UDP_HOST:$UDP_PORT (PPM=$PPM, GAIN=$GAIN)"
exec "$AIS_BIN" -d:"$RTL_DEVICE_INDEX" -gr TUNER "$GAIN" RTLAGC off -p "$PPM" -u "$UDP_HOST" "$UDP_PORT" -v 2
