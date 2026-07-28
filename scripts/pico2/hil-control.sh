#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
shift || true
PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
PICO_DIR="${PROJECT_ROOT}/marine-autopilot-engine/pico2"
PYTHON="${HOME}/.venvs/pico-tools/bin/python"
PID_FILE="/tmp/omi-autopilot-hil.pid"
LOCK_FILE="/tmp/omi-pico2-control.lock"
LOG_FILE="${HOME}/.local/state/omi/autopilot-hil.log"
API_PORT=43990
DEVICE_GLOB="/dev/serial/by-id/usb-MicroPython_Board_in_FS_mode_*-if00"

resolve_device() {
  local devices=()
  mapfile -t devices < <(compgen -G "${DEVICE_GLOB}" || true)
  [[ "${#devices[@]}" -eq 1 ]] || {
    echo "Expected exactly one Pico 2; found ${#devices[@]}." >&2
    exit 1
  }
  printf '%s\n' "${devices[0]}"
}

active_pid() {
  [[ -f "${PID_FILE}" ]] || return 1
  local pid
  pid="$(<"${PID_FILE}")"
  kill -0 "${pid}" 2>/dev/null || return 1
  printf '%s\n' "${pid}"
}

api() {
  local endpoint="$1"
  local body="${2:-{}}"
  curl --fail --silent --show-error \
    -H "Content-Type: application/json" \
    -X POST \
    -d "${body}" \
    "http://127.0.0.1:${API_PORT}/vessels/self/autopilots/_default/${endpoint}"
  printf '\n'
}

case "${ACTION}" in
  start)
    [[ "${1:-}" == "--confirm-physical-motor" ]] || {
      echo "Refusing HIL start without --confirm-physical-motor." >&2
      exit 2
    }
    if active_pid >/dev/null; then
      echo "HIL is already running (PID $(active_pid))."
      exit 0
    fi
    device="$(resolve_device)"
    "${PYTHON}" "${PICO_DIR}/pico_motor_cli.py" preflight --profile hil-motor
    mkdir -p "$(dirname "${LOG_FILE}")"
    (
      exec 9>"${LOCK_FILE}"
      flock -n 9 || {
        echo "Pico 2 serial port is already controlled by another process." >&2
        exit 1
      }
      export AP_MOTOR_BACKEND=hil
      export AP_SENSOR_BACKEND=sim
      export AP_HIL_CONFIRM=I_UNDERSTAND_HIL_MOVES_REAL_MOTOR
      export AP_HIL_MAX_DUTY=0.10
      export AP_HIL_SESSION_MS=30000
      export AP_PWM_MAX=0.10
      export AP_SERIAL_PORT="${device}"
      export AP_API_PORT="${API_PORT}"
      export AP_API_HOST=127.0.0.1
      exec bash "${PROJECT_ROOT}/scripts/start-autopilot.sh"
    ) >>"${LOG_FILE}" 2>&1 &
    pid=$!
    printf '%s\n' "${pid}" >"${PID_FILE}"
    sleep 2
    kill -0 "${pid}" 2>/dev/null || {
      tail -n 30 "${LOG_FILE}" >&2
      rm -f -- "${PID_FILE}"
      exit 1
    }
    echo "HIL started in STANDBY (PID ${pid}, API ${API_PORT})."
    echo "Physical motor remains stopped until the separate engage command."
    ;;
  engage)
    active_pid >/dev/null || { echo "HIL is not running." >&2; exit 1; }
    api mode '{"value":"compass"}'
    api engage
    ;;
  disengage)
    active_pid >/dev/null || { echo "HIL is not running." >&2; exit 1; }
    api disengage
    ;;
  heading-change)
    degrees="${1:-}"
    [[ "${degrees}" =~ ^-?[0-9]+([.][0-9]+)?$ ]] || {
      echo "Usage: $0 heading-change DEGREES" >&2
      exit 2
    }
    radians="$(awk -v degrees="${degrees}" 'BEGIN { printf "%.10f", degrees * atan2(0,-1) / 180 }')"
    api dodge "{\"value\":${radians}}"
    echo "Target heading changed by ${degrees} degrees; this is not a motor-angle command."
    ;;
  stop)
    if pid="$(active_pid)"; then
      api disengage >/dev/null 2>&1 || true
      kill -TERM "${pid}" 2>/dev/null || true
      for _index in {1..40}; do
        kill -0 "${pid}" 2>/dev/null || break
        sleep 0.05
      done
      kill -0 "${pid}" 2>/dev/null && {
        echo "HIL process did not stop cleanly." >&2
        exit 1
      }
    fi
    rm -f -- "${PID_FILE}"
    device="$(resolve_device)"
    "${PYTHON}" "${PICO_DIR}/pico_motor_cli.py" --device "${device}" stop
    echo "HIL stopped; Pico PWM=0."
    ;;
  status)
    if pid="$(active_pid)"; then
      echo "HIL running (PID ${pid}, API ${API_PORT})."
      curl --fail --silent --show-error "http://127.0.0.1:${API_PORT}/health"
      printf '\n'
    else
      echo "HIL stopped."
    fi
    ;;
  *)
    echo "Usage: $0 {start --confirm-physical-motor|engage|disengage|heading-change DEGREES|stop|status}" >&2
    exit 2
    ;;
esac
