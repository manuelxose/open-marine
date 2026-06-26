#!/usr/bin/env bash
set -euo pipefail

if ! command -v python3 >/dev/null 2>&1 || ! command -v pip3 >/dev/null 2>&1; then
  echo "[wind] python3 and pip3 are required" >&2
  exit 1
fi

echo "[wind] installing pyserial, requests and websocket-client"
if ! python3 -m pip install --break-system-packages pyserial requests websocket-client; then
  python3 -m pip install pyserial requests websocket-client
fi

if getent group dialout >/dev/null 2>&1; then
  sudo usermod -a -G dialout "$USER"
  echo "[wind] added $USER to dialout; log out and back in before using serial"
fi

echo "[wind] serial candidates:"
find /dev/serial/by-id /dev -maxdepth 1 \( -name 'ttyUSB*' -o -name 'ttyACM*' \) 2>/dev/null || true
