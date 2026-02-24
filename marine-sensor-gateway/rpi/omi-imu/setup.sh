#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  echo "[setup] $*"
}

warn() {
  echo "[setup][warn] $*" >&2
}

fail() {
  echo "[setup][error] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
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

log "Checking I2C bus..."
if [[ ! -e /dev/i2c-1 ]]; then
  fail "/dev/i2c-1 not found. Enable I2C first (sudo raspi-config -> Interface Options -> I2C)."
fi
log "I2C bus /dev/i2c-1 is present."

require_cmd python3
require_cmd pip3

SUDO=""
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  fi
fi

if ! command -v i2cdetect >/dev/null 2>&1; then
  log "i2cdetect not found. Installing i2c-tools..."
  if [[ -n "$SUDO" ]]; then
    $SUDO apt-get update
    $SUDO apt-get install -y i2c-tools
  elif [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    apt-get update
    apt-get install -y i2c-tools
  else
    fail "Cannot install i2c-tools without root privileges. Re-run with sudo."
  fi
fi

log "Scanning I2C bus for IMU at address 0x69 (or 0x68 fallback)..."
SCAN_OUTPUT="$(i2cdetect -y 1)"
echo "$SCAN_OUTPUT"
if echo "$SCAN_OUTPUT" | grep -qiE '(^|[[:space:]])69($|[[:space:]])'; then
  IMU_ADDR="0x69"
elif echo "$SCAN_OUTPUT" | grep -qiE '(^|[[:space:]])68($|[[:space:]])'; then
  IMU_ADDR="0x68"
  warn "Detected ICM-20948 at 0x68 (expected 0x69 for MacArthur HAT). Continuing."
else
  fail "ICM-20948 not detected at 0x69 or 0x68. Check wiring/HAT seating and I2C enablement."
fi
log "Sensor detected at $IMU_ADDR."

log "Installing Python dependencies (icm20948 + requests + websocket-client)..."
if python3 -m pip install --break-system-packages icm20948 requests websocket-client; then
  log "Dependencies installed with --break-system-packages."
else
  warn "Install with --break-system-packages failed. Retrying without it..."
  python3 -m pip install icm20948 requests websocket-client
  log "Dependencies installed without --break-system-packages."
fi

log "Running one-shot sensor probe..."
python3 - <<'PY'
from icm20948 import ICM20948

imu = ICM20948()
ax, ay, az, gx, gy, gz = imu.read_accelerometer_gyro_data()
mx, my, mz = imu.read_magnetometer_data()
print("[probe] accel(g)      :", f"x={ax:.3f}", f"y={ay:.3f}", f"z={az:.3f}")
print("[probe] gyro(dps)     :", f"x={gx:.3f}", f"y={gy:.3f}", f"z={gz:.3f}")
print("[probe] magnetometer  :", f"x={mx:.3f}", f"y={my:.3f}", f"z={mz:.3f}", "uT")
PY

cat <<EOF

[setup] Done.

Next steps on Raspberry Pi:
1) cd "$SCRIPT_DIR"
2) python3 01_test_sensor.py --rate 2
3) python3 02_publish_signalk.py --host 192.168.1.37 --port 3000 --rate 2

Optional:
- Raw only mode: python3 02_publish_signalk.py --host 192.168.1.37 --raw-only
- Dry run mode : python3 02_publish_signalk.py --host 192.168.1.37 --no-publish

From your Windows machine you can verify:
- curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/headingMagnetic
- curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/attitude
- curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/imu
EOF
