#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  echo "[setup-gps] $*"
}

warn() {
  echo "[setup-gps][warn] $*" >&2
}

fail() {
  echo "[setup-gps][error] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

detect_gps_device() {
  local candidates=(
    /dev/ttyACM0
    /dev/ttyUSB0
  )
  local dev
  for dev in "${candidates[@]}"; do
    if [[ -e "$dev" ]]; then
      echo "$dev"
      return 0
    fi
  done

  local globbed
  for globbed in /dev/ttyACM* /dev/ttyUSB*; do
    if [[ -e "$globbed" ]]; then
      echo "$globbed"
      return 0
    fi
  done

  return 1
}

log "Checking platform..."
if [[ ! -f /proc/device-tree/model ]]; then
  fail "Cannot find /proc/device-tree/model. This script must run on Raspberry Pi."
fi
MODEL="$(tr -d '\0' </proc/device-tree/model)"
if [[ "$MODEL" != *"Raspberry Pi"* ]]; then
  fail "Detected model is not Raspberry Pi: $MODEL"
fi
log "Detected model: $MODEL"

require_cmd python3
require_cmd pip3

SUDO=""
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  fi
fi

GPS_DEV=""
if GPS_DEV="$(detect_gps_device)"; then
  log "Detected GPS serial device: $GPS_DEV"
else
  fail "No GPS serial device detected (/dev/ttyACM* or /dev/ttyUSB*)."
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet gpsd 2>/dev/null; then
    warn "gpsd service is active and may lock $GPS_DEV. Stop it if serial open fails:"
    warn "  sudo systemctl stop gpsd.socket gpsd"
  fi
fi

if [[ ! -r "$GPS_DEV" || ! -w "$GPS_DEV" ]]; then
  warn "Current user may not have full read/write access to $GPS_DEV."
  warn "If needed: sudo usermod -a -G dialout \$USER && reboot"
fi

log "Installing Python dependencies (pyserial + pynmea2 + requests + websocket-client)..."
if python3 -m pip install --break-system-packages pyserial pynmea2 requests websocket-client; then
  log "Dependencies installed with --break-system-packages."
else
  warn "Install with --break-system-packages failed. Retrying without it..."
  python3 -m pip install pyserial pynmea2 requests websocket-client
  log "Dependencies installed without --break-system-packages."
fi

log "Reading raw NMEA for 5 seconds from $GPS_DEV..."
python3 - "$GPS_DEV" <<'PY'
import serial
import sys
import time

dev = sys.argv[1]
deadline = time.monotonic() + 5.0
lines = 0

with serial.Serial(dev, baudrate=9600, timeout=1.0) as ser:
    while time.monotonic() < deadline:
        line = ser.readline().decode("ascii", errors="replace").strip()
        if not line:
            continue
        lines += 1
        print(line)

if lines == 0:
    print("[probe] No NMEA lines received in 5 seconds.")
else:
    print(f"[probe] Received {lines} NMEA lines.")
PY

cat <<EOF

[setup-gps] Done.

Next steps on Raspberry Pi:
1) cd "$SCRIPT_DIR"
2) python3 01_test_gps.py --device "$GPS_DEV" --baud 9600
3) python3 02_publish_gps_signalk.py --host 192.168.1.37 --port 3000 --device "$GPS_DEV" --baud 9600 --rate 1

Optional:
- Dry run mode: python3 02_publish_gps_signalk.py --host 192.168.1.37 --rate 1 --no-publish

From your Windows machine you can verify:
- curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/position
- curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/speedOverGround
- curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/courseOverGroundTrue
- curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/gps
EOF
