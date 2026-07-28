#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="${1:-bench-led}"
BENCH_MOTOR_MAX_DUTY="${2:-10}"
BENCH_MOTOR_ESTOP="${3:-0}"
VENV="${HOME}/.venvs/pico-tools"
DEVICE_GLOB="/dev/serial/by-id/usb-MicroPython_Board_in_FS_mode_*-if00"
BACKUP_DIR="${HOME}/pico2-backups"
CALIBRATION_FILE="${HOME}/.config/omi/pico2-current.json"

case "$PROFILE" in
  bench-led|bench-motor|motor-commissioning|hil-motor|production) ;;
  *)
    echo "Usage: $0 [bench-led|bench-motor|motor-commissioning|hil-motor|production] [bench-max-duty] [bench-estop-0-or-1]" >&2
    exit 2
    ;;
esac
if [[ ! "$BENCH_MOTOR_MAX_DUTY" =~ ^[0-9]+$ ]] \
  || (( BENCH_MOTOR_MAX_DUTY < 1 || BENCH_MOTOR_MAX_DUTY > 20 )); then
  echo "bench-motor maximum duty must be 1..20 percent." >&2
  exit 2
fi
if [[ "$BENCH_MOTOR_ESTOP" != "0" && "$BENCH_MOTOR_ESTOP" != "1" ]]; then
  echo "bench-motor E-stop flag must be 0 or 1." >&2
  exit 2
fi

profile_file="${SCRIPT_DIR}/profiles/${PROFILE}.py"
if [[ ! -f "$profile_file" ]]; then
  echo "Missing profile: $profile_file" >&2
  exit 1
fi

generated_config="$(mktemp)"
trap 'rm -f -- "${generated_config}"' EXIT
build_args=(
  "${profile_file}"
  "${generated_config}"
  "${CALIBRATION_FILE}"
  --bench-motor-max-duty "${BENCH_MOTOR_MAX_DUTY}"
)
if [[ "$BENCH_MOTOR_ESTOP" == "1" ]]; then
  build_args+=(--bench-motor-estop-configured)
fi
python3 "${SCRIPT_DIR}/build_config.py" "${build_args[@]}"

python3 -m venv "${VENV}"
"${VENV}/bin/python" -m pip install --disable-pip-version-check --quiet --upgrade mpremote

mapfile -t devices < <(compgen -G "${DEVICE_GLOB}" || true)
if [[ "${#devices[@]}" -ne 1 ]]; then
  echo "Expected one Pico 2; found ${#devices[@]}." >&2
  exit 1
fi
device="${devices[0]}"

mkdir -p "${BACKUP_DIR}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
if "${VENV}/bin/mpremote" connect "${device}" fs ls : 2>/dev/null | grep -q 'main.py'; then
  "${VENV}/bin/mpremote" connect "${device}" fs cp :main.py "${BACKUP_DIR}/main-${timestamp}.py"
  echo "Existing main.py backed up in ${BACKUP_DIR}."
fi

"${VENV}/bin/mpremote" connect "${device}" fs cp "${generated_config}" :config.py
"${VENV}/bin/mpremote" connect "${device}" fs cp "${SCRIPT_DIR}/motor_policy.py" :motor_policy.py
"${VENV}/bin/mpremote" connect "${device}" fs cp "${SCRIPT_DIR}/main.py" :main.py
"${VENV}/bin/mpremote" connect "${device}" exec "import machine; machine.reset()" \
  >/dev/null 2>&1 || true
status_ok=0
for attempt in 1 2 3 4 5; do
  sleep 2
  if "${VENV}/bin/python" "${SCRIPT_DIR}/pico_motor_cli.py" status; then
    status_ok=1
    break
  fi
  echo "Waiting for Pico 2 firmware after reset (${attempt}/5)..." >&2
done
if [[ "${status_ok}" -ne 1 ]]; then
  echo "Pico 2 firmware did not return a status frame after reset." >&2
  exit 1
fi
echo "Pico 2 firmware installed with profile '${PROFILE}'."
echo "Outputs boot with PWM=0 and DIR=0."
