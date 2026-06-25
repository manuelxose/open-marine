#!/usr/bin/env python3
"""Read MWV/MWD from a serial NMEA 0183 wind sensor and publish to Signal K."""

from __future__ import annotations

import argparse
import glob
import json
import time
from datetime import datetime, timezone
from typing import Any

import requests
import serial

from wind_nmea import parse_wind_sentence, reading_to_signalk_values

try:
    import websocket  # type: ignore[import-untyped]
except ImportError:
    websocket = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--baud", type=int, default=4800)
    parser.add_argument("--timeout", type=float, default=1.0)
    parser.add_argument("--no-publish", action="store_true")
    return parser.parse_args()


def detect_device(requested: str) -> str:
    if requested != "auto" and glob.glob(requested):
        return requested
    for pattern in ("/dev/serial/by-id/*", "/dev/ttyUSB*", "/dev/ttyACM*"):
        matches = sorted(glob.glob(pattern))
        if matches:
            return matches[0]
    raise RuntimeError("NMEA wind serial device not found")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def build_delta(timestamp: str, values: list[dict[str, float]]) -> dict[str, Any]:
    return {
        "context": "vessels.self",
        "updates": [{
            "timestamp": timestamp,
            "source": {
                "label": "NMEA 0183 wind sensor",
                "src": "wind-nmea0183",
                "type": "NMEA0183",
            },
            "values": values,
        }],
    }


class SignalKPublisher:
    def __init__(self, endpoint: str, ws_endpoint: str) -> None:
        self.endpoint = endpoint
        self.ws_endpoint = ws_endpoint
        self.session = requests.Session()
        self.socket: Any | None = None
        self.websocket_only = False

    def publish(self, delta: dict[str, Any]) -> None:
        if not self.websocket_only:
            response = self.session.post(self.endpoint, json=delta, timeout=2.5)
            if response.ok:
                return
            if response.status_code not in (404, 405):
                response.raise_for_status()
            self.websocket_only = True
            print(
                f"[wind] HTTP delta unavailable ({response.status_code}); "
                "using Signal K WebSocket"
            )

        if websocket is None:
            raise RuntimeError(
                "websocket-client is required by this Signal K runtime; "
                "run setup_wind.sh"
            )
        try:
            if self.socket is None:
                self.socket = websocket.create_connection(self.ws_endpoint, timeout=2.5)
            self.socket.send(json.dumps(delta))
        except Exception:
            self.close_socket()
            raise

    def close_socket(self) -> None:
        if self.socket is None:
            return
        try:
            self.socket.close()
        finally:
            self.socket = None


def main() -> int:
    args = parse_args()
    if args.port <= 0 or args.port > 65535:
        raise SystemExit("--port must be in range 1-65535")
    if args.baud <= 0 or args.timeout <= 0:
        raise SystemExit("--baud and --timeout must be > 0")

    device = detect_device(args.device)
    endpoint = f"http://{args.host}:{args.port}/signalk/v1/api/"
    ws_endpoint = f"ws://{args.host}:{args.port}/signalk/v1/stream?subscribe=none"
    publisher = SignalKPublisher(endpoint, ws_endpoint)
    print(f"[wind] device={device} baud={args.baud} target={endpoint}")

    while True:
        try:
            with serial.Serial(device, args.baud, timeout=args.timeout) as stream:
                while True:
                    raw = stream.readline().decode("ascii", errors="replace").strip()
                    if not raw:
                        continue
                    try:
                        reading = parse_wind_sentence(raw)
                    except (ValueError, TypeError) as error:
                        print(f"[wind] ignored invalid sentence: {error}")
                        continue
                    if reading is None:
                        continue

                    timestamp = utc_now()
                    values = reading_to_signalk_values(reading)
                    if args.no_publish:
                        print(json.dumps(build_delta(timestamp, values), separators=(",", ":")))
                        continue

                    try:
                        publisher.publish(build_delta(timestamp, values))
                        print(
                            f"[wind] {reading.reference} "
                            f"speed={reading.speed_mps:.2f}m/s angle={reading.angle_rad:.3f}rad"
                        )
                    except (requests.RequestException, RuntimeError, OSError) as error:
                        print(f"[wind] Signal K publish failed: {error}")
        except (serial.SerialException, OSError) as error:
            print(f"[wind] serial disconnected: {error}; retrying in 3s")
            time.sleep(3)
            device = detect_device(args.device)


if __name__ == "__main__":
    raise SystemExit(main())
