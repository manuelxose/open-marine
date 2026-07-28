#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
CONFIRM="${2:-}"
PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
PICO_DIR="${PROJECT_ROOT}/marine-autopilot-engine/pico2"
PYTHON="${HOME}/.venvs/pico-tools/bin/python"
PID_FILE="/tmp/omi-autopilot-production.pid"
LOCK_FILE="/tmp/omi-pico2-control.lock"
LOG_FILE="${HOME}/.local/state/omi/autopilot-production.log"
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

case "${ACTION}" in
  start)
    [[ "${CONFIRM}" == "--confirm-physical-motor" ]] || {
      echo "Refusing production start without --confirm-physical-motor." >&2
      exit 2
    }
    active_pid >/dev/null && { echo "Production autopilot is already running."; exit 0; }
    device="$(resolve_device)"
    "${PYTHON}" "${PICO_DIR}/pico_motor_cli.py" preflight --profile production
    mkdir -p "$(dirname "${LOG_FILE}")"
    (
      exec 9>"${LOCK_FILE}"
      flock -n 9 || {
        echo "Pico 2 serial port is already controlled by another process." >&2
        exit 1
      }
      export AP_MOTOR_BACKEND=serial
      export AP_SENSOR_BACKEND=signalk
      export AP_SERIAL_PORT="${device}"
      export AP_API_PORT=3990
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
    echo "Production autopilot started in STANDBY (PID ${pid}); motor remains stopped."
    ;;
  stop)
    if pid="$(active_pid)"; then
      kill -TERM "${pid}" 2>/dev/null || true
      for _index in {1..40}; do
        kill -0 "${pid}" 2>/dev/null || break
        sleep 0.05
      done
      kill -0 "${pid}" 2>/dev/null && {
        echo "Production autopilot did not stop cleanly." >&2
        exit 1
      }
    fi
    rm -f -- "${PID_FILE}"
    device="$(resolve_device)"
    "${PYTHON}" "${PICO_DIR}/pico_motor_cli.py" --device "${device}" stop
    echo "Production autopilot stopped; Pico PWM=0."
    ;;
  status)
    if pid="$(active_pid)"; then
      echo "Production autopilot running in PID ${pid}."
    else
      echo "Production autopilot stopped."
    fi
    ;;
  *)
    echo "Usage: $0 {start --confirm-physical-motor|stop|status}" >&2
    exit 2
    ;;
esac
