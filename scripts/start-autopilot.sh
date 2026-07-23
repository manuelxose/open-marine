#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENGINE_DIR="$PROJECT_ROOT/marine-autopilot-engine"
CONFIG_FILE="${OMI_CONFIG_FILE:-$PROJECT_ROOT/config/omi.env}"

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

      if [[ -z "${!key+x}" ]]; then
        export "$key=$value"
      fi
    fi
  done < "$file"
}

if [[ -n "$CONFIG_FILE" && "$CONFIG_FILE" != /* ]]; then
  CONFIG_FILE="$PROJECT_ROOT/$CONFIG_FILE"
fi
load_omi_config_file "$CONFIG_FILE"

: "${AP_MOTOR_BACKEND:=sim}"
: "${AP_SENSOR_BACKEND:=signalk}"
export AP_MOTOR_BACKEND AP_SENSOR_BACKEND

if [[ -f "$ENGINE_DIR/dist/cli.js" ]]; then
  mode="dist"
  args=(start)
else
  mode="tsx"
  args=(run dev --)
fi

echo "[autopilot] starting engine ($mode, motor=${AP_MOTOR_BACKEND}, sensors=${AP_SENSOR_BACKEND})"
exec npm --prefix "$ENGINE_DIR" "${args[@]}" "$@"
