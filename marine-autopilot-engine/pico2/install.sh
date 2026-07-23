#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="${1:-bench-led}"
VENV="${HOME}/.venvs/pico-tools"
DEVICE_GLOB="/dev/serial/by-id/usb-MicroPython_Board_in_FS_mode_*-if00"
BACKUP_DIR="${HOME}/pico2-backups"
CALIBRATION_FILE="${HOME}/.config/omi/pico2-current.json"

case "$PROFILE" in
  bench-led|motor-commissioning|hil-motor|production) ;;
  *)
    echo "Usage: $0 [bench-led|motor-commissioning|hil-motor|production]" >&2
    exit 2
    ;;
esac

profile_file="${SCRIPT_DIR}/profiles/${PROFILE}.py"
if [[ ! -f "$profile_file" ]]; then
  echo "Missing profile: $profile_file" >&2
  exit 1
fi

generated_config="$(mktemp)"
trap 'rm -f -- "${generated_config}"' EXIT
python3 "${SCRIPT_DIR}/build_config.py" \
  "${profile_file}" "${generated_config}" "${CALIBRATION_FILE}"

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
"${VENV}/bin/mpremote" connect "${device}" fs cp "${SCRIPT_DIR}/main.py" :main.py
"${VENV}/bin/mpremote" connect "${device}" reset
sleep 3
echo "Pico 2 firmware installed with profile '${PROFILE}'."
echo "Outputs boot with PWM=0 and DIR=0."
