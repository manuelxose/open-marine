#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PUBLISHER="$PROJECT_ROOT/marine-sensor-gateway/rpi/wind/03_publish_wind_signalk.py"
CONFIG_FILE="${OMI_CONFIG_FILE:-$PROJECT_ROOT/config/omi.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
fi

WIND_DEVICE="${WIND_DEVICE:-auto}"
WIND_BAUD="${WIND_BAUD:-4800}"
WIND_HOST="${WIND_HOST:-127.0.0.1}"
WIND_PORT="${WIND_PORT:-3000}"
WIND_NO_PUBLISH="${WIND_NO_PUBLISH:-false}"

args=(
  --device "$WIND_DEVICE"
  --baud "$WIND_BAUD"
  --host "$WIND_HOST"
  --port "$WIND_PORT"
)

case "${WIND_NO_PUBLISH,,}" in
  1|true|yes) args+=(--no-publish) ;;
esac

exec python3 "$PUBLISHER" "${args[@]}"
