#!/usr/bin/env python3
"""Read ICM-20948 data and publish to Signal K delta endpoint."""

from __future__ import annotations

import argparse
import json
import math
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import requests
from icm20948 import ICM20948

try:
    import websocket  # type: ignore[import-untyped]
except Exception:  # noqa: BLE001
    websocket = None

G_TO_MPS2 = 9.80665
DEFAULT_ALPHA = 0.98
DEFAULT_YAW_TIME_CONSTANT_S = 0.25
DEFAULT_STATIONARY_YAW_TIME_CONSTANT_S = 3.0
DEFAULT_STATIONARY_GYRO_THRESHOLD_DPS = 2.0
DEFAULT_RATE_HZ = 10.0
DEFAULT_PORT = 3000
DEFAULT_TIMEOUT_S = 2.5

SOURCE_LABEL = "MacArthur HAT ICM-20948"
SOURCE_SRC = "icm20948"
SOURCE_TYPE = "I2C"

PATH_HEADING_MAGNETIC = "navigation.headingMagnetic"
PATH_ATTITUDE = "navigation.attitude"
PATH_ACCELEROMETER = "sensors.imu.accelerometer"
PATH_GYROSCOPE = "sensors.imu.gyroscope"
PATH_MAGNETOMETER = "sensors.imu.magnetometer"

ICON_OK = "\u2705"
ICON_FAIL = "\u274c"


@dataclass
class RuntimeStats:
    reads_ok: int = 0
    read_errors: int = 0
    publish_attempts: int = 0
    publish_ok: int = 0
    publish_errors: int = 0
    started_monotonic: float = field(default_factory=time.monotonic)

    def uptime_s(self) -> float:
        return max(0.0, time.monotonic() - self.started_monotonic)

    def publish_success_rate(self) -> float:
        if self.publish_attempts == 0:
            return 0.0
        return (self.publish_ok / self.publish_attempts) * 100.0


class ComplementaryFusion:
    """Simple roll/pitch + tilt-compensated magnetic heading."""

    def __init__(
        self,
        alpha: float = DEFAULT_ALPHA,
        yaw_time_constant_s: float = DEFAULT_YAW_TIME_CONSTANT_S,
        stationary_yaw_time_constant_s: float = DEFAULT_STATIONARY_YAW_TIME_CONSTANT_S,
        stationary_gyro_threshold_dps: float = DEFAULT_STATIONARY_GYRO_THRESHOLD_DPS,
    ) -> None:
        self.alpha = alpha
        self.yaw_time_constant_s = yaw_time_constant_s
        self.stationary_yaw_time_constant_s = stationary_yaw_time_constant_s
        self.stationary_gyro_threshold_rads = math.radians(
            stationary_gyro_threshold_dps
        )
        self.yaw_motion_samples = 0
        self.initialized = False
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0

    @staticmethod
    def _wrap_2pi(angle: float) -> float:
        two_pi = 2.0 * math.pi
        wrapped = angle % two_pi
        if wrapped < 0:
            wrapped += two_pi
        return wrapped

    @staticmethod
    def _wrap_pi(angle: float) -> float:
        wrapped = (angle + math.pi) % (2.0 * math.pi) - math.pi
        if wrapped <= -math.pi:
            return wrapped + 2.0 * math.pi
        return wrapped

    def update(
        self,
        ax_mps2: float,
        ay_mps2: float,
        az_mps2: float,
        gx_rads: float,
        gy_rads: float,
        gz_rads: float,
        mx_ut: float,
        my_ut: float,
        mz_ut: float,
        dt_s: float,
    ) -> tuple[float, float, float]:
        was_initialized = self.initialized
        roll_acc = math.atan2(ay_mps2, az_mps2)
        pitch_acc = math.atan2(
            -ax_mps2,
            math.sqrt((ay_mps2 * ay_mps2) + (az_mps2 * az_mps2)),
        )

        if not was_initialized:
            self.roll = roll_acc
            self.pitch = pitch_acc
            self.initialized = True
        else:
            self.roll = (
                self.alpha * (self.roll + (gx_rads * dt_s))
                + (1.0 - self.alpha) * roll_acc
            )
            self.pitch = (
                self.alpha * (self.pitch + (gy_rads * dt_s))
                + (1.0 - self.alpha) * pitch_acc
            )

        x_comp = (mx_ut * math.cos(self.pitch)) + (mz_ut * math.sin(self.pitch))
        y_comp = (
            mx_ut * math.sin(self.roll) * math.sin(self.pitch)
            + my_ut * math.cos(self.roll)
            - mz_ut * math.sin(self.roll) * math.cos(self.pitch)
        )
        mag_heading = math.atan2(-y_comp, x_comp)
        if mag_heading < 0:
            mag_heading += 2.0 * math.pi

        if not was_initialized:
            self.yaw = mag_heading
        else:
            yaw_rate = abs(gz_rads)
            if yaw_rate >= self.stationary_gyro_threshold_rads:
                self.yaw_motion_samples += 1
            else:
                self.yaw_motion_samples = 0
            # X/Y bias must not disable yaw stabilization. Two consecutive
            # Z samples reject isolated spikes; a clear turn (>3x threshold)
            # bypasses the debounce and remains immediate.
            stationary = not (
                yaw_rate >= (3.0 * self.stationary_gyro_threshold_rads)
                or self.yaw_motion_samples >= 2
            )
            # The ICM-20948 keeps a small gyro bias at rest. Integrating it
            # makes the chart hunt even though the device has not moved.
            yaw_pred = self.yaw if stationary else self._wrap_2pi(
                self.yaw + (gz_rads * dt_s)
            )
            yaw_error = self._wrap_pi(mag_heading - yaw_pred)
            # Roll/pitch need strong gyro weighting, but using their 0.98
            # coefficient for yaw makes magnetic corrections take seconds.
            # Use the fast correction while moving and a quieter magnetic
            # correction at rest. This preserves response without publishing
            # magnetometer noise as real vessel rotation.
            yaw_tau = (
                self.stationary_yaw_time_constant_s
                if stationary
                else self.yaw_time_constant_s
            )
            yaw_gain = 1.0 - math.exp(-dt_s / yaw_tau)
            self.yaw = self._wrap_2pi(yaw_pred + (yaw_gain * yaw_error))

        return (self.roll, self.pitch, self.yaw)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish ICM-20948 IMU data to Signal K delta endpoint.",
    )
    parser.add_argument(
        "--host",
        required=True,
        help="Signal K host/IP (example: 192.168.1.37)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Signal K port (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--rate",
        type=float,
        default=DEFAULT_RATE_HZ,
        help=f"Publishing rate in Hz (default: {DEFAULT_RATE_HZ})",
    )
    parser.add_argument(
        "--yaw-time-constant",
        type=float,
        default=DEFAULT_YAW_TIME_CONSTANT_S,
        help=(
            "Magnetic yaw correction time constant in seconds "
            f"(default: {DEFAULT_YAW_TIME_CONSTANT_S})"
        ),
    )
    parser.add_argument(
        "--stationary-yaw-time-constant",
        type=float,
        default=DEFAULT_STATIONARY_YAW_TIME_CONSTANT_S,
        help=(
            "Magnetic yaw correction time constant while stationary in seconds "
            f"(default: {DEFAULT_STATIONARY_YAW_TIME_CONSTANT_S})"
        ),
    )
    parser.add_argument(
        "--stationary-gyro-threshold",
        type=float,
        default=DEFAULT_STATIONARY_GYRO_THRESHOLD_DPS,
        help=(
            "Gyroscope motion threshold in degrees/second "
            f"(default: {DEFAULT_STATIONARY_GYRO_THRESHOLD_DPS})"
        ),
    )
    parser.add_argument(
        "--raw-only",
        action="store_true",
        help="Publish only raw accel/gyro/mag values (disable fusion paths).",
    )
    parser.add_argument(
        "--no-publish",
        action="store_true",
        help="Read and print data only. Do not POST to Signal K.",
    )
    return parser.parse_args()


def utc_timestamp_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00",
        "Z",
    )


def build_base_url(host: str, port: int) -> str:
    host = host.strip()
    if host.startswith("http://") or host.startswith("https://"):
        parsed = urlsplit(host)
        scheme = parsed.scheme
        netloc = parsed.netloc if parsed.netloc else parsed.path
        if ":" not in netloc:
            netloc = f"{netloc}:{port}"
        return urlunsplit((scheme, netloc, "", "", "")).rstrip("/")
    return f"http://{host}:{port}"


class SignalKWebSocketPublisher:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url
        self._socket: Any | None = None

    def publish(self, delta_message: dict[str, Any]) -> tuple[bool, str]:
        if websocket is None:
            return (False, "websocket-client dependency not installed")

        try:
            if self._socket is None:
                self._socket = websocket.create_connection(
                    self.to_ws_url(self.base_url),
                    timeout=DEFAULT_TIMEOUT_S,
                )
            self._socket.send(json.dumps(delta_message))
            return (True, "WS send OK")
        except Exception as exc:  # noqa: BLE001
            self.close()
            return (False, f"WS send failed: {exc}")

    def close(self) -> None:
        if self._socket is None:
            return
        try:
            self._socket.close()
        except Exception:  # noqa: BLE001
            pass
        finally:
            self._socket = None

    @staticmethod
    def to_ws_url(base_url: str) -> str:
        parsed = urlsplit(base_url)
        scheme = "wss" if parsed.scheme == "https" else "ws"
        netloc = parsed.netloc if parsed.netloc else parsed.path
        return urlunsplit((scheme, netloc, "/signalk/v1/stream", "subscribe=none", ""))


def build_delta_message(
    timestamp_iso: str,
    accel: dict[str, float],
    gyro: dict[str, float],
    mag: dict[str, float],
    orientation: dict[str, float] | None,
) -> dict[str, Any]:
    values: list[dict[str, Any]] = [
        {"path": PATH_ACCELEROMETER, "value": accel},
        {"path": PATH_GYROSCOPE, "value": gyro},
        {"path": PATH_MAGNETOMETER, "value": mag},
    ]

    if orientation is not None:
        heading = orientation["yaw"]
        values.append({"path": PATH_HEADING_MAGNETIC, "value": heading})
        values.append(
            {
                "path": PATH_ATTITUDE,
                "value": {
                    "roll": orientation["roll"],
                    "pitch": orientation["pitch"],
                    "yaw": heading,
                },
            }
        )

    return {
        "context": "vessels.self",
        "updates": [
            {
                "timestamp": timestamp_iso,
                "source": {
                    "label": SOURCE_LABEL,
                    "src": SOURCE_SRC,
                    "type": SOURCE_TYPE,
                },
                "values": values,
            }
        ],
    }


def test_signalk_connection(session: requests.Session, base_url: str) -> tuple[bool, str]:
    url = f"{base_url}/signalk/v1/api/"
    try:
        response = session.get(url, timeout=DEFAULT_TIMEOUT_S)
    except requests.RequestException as exc:
        return (False, str(exc))

    if not response.ok:
        return (False, f"HTTP {response.status_code}")
    return (True, f"HTTP {response.status_code}")


def publish_delta(
    session: requests.Session,
    base_url: str,
    delta_message: dict[str, Any],
) -> tuple[bool, int, str]:
    url = f"{base_url}/signalk/v1/api/"
    try:
        response = session.post(url, json=delta_message, timeout=DEFAULT_TIMEOUT_S)
    except requests.RequestException as exc:
        return (False, 0, str(exc))

    if response.ok:
        return (True, response.status_code, f"HTTP {response.status_code}")

    text = response.text.strip()
    if len(text) > 160:
        text = text[:160] + "..."
    suffix = f" - {text}" if text else ""
    return (False, response.status_code, f"HTTP {response.status_code}{suffix}")


def put_value(
    session: requests.Session,
    base_url: str,
    path: str,
    value: Any,
    timestamp_iso: str,
) -> tuple[bool, int, str]:
    sk_path = path.replace(".", "/")
    url = f"{base_url}/signalk/v1/api/vessels/self/{sk_path}"
    payload = {
        "value": value,
        "timestamp": timestamp_iso,
        "source": {
            "label": SOURCE_LABEL,
            "src": SOURCE_SRC,
            "type": SOURCE_TYPE,
        },
    }
    try:
        response = session.put(url, json=payload, timeout=DEFAULT_TIMEOUT_S)
    except requests.RequestException as exc:
        return (False, 0, str(exc))

    if response.ok:
        return (True, response.status_code, f"HTTP {response.status_code}")

    text = response.text.strip()
    if len(text) > 160:
        text = text[:160] + "..."
    suffix = f" - {text}" if text else ""
    return (False, response.status_code, f"HTTP {response.status_code}{suffix}")


def publish_rest_points(
    session: requests.Session,
    base_url: str,
    timestamp_iso: str,
    accel: dict[str, float],
    gyro: dict[str, float],
    mag: dict[str, float],
    orientation: dict[str, float] | None,
) -> tuple[bool, int, str]:
    writes: list[tuple[str, Any]] = [
        (PATH_ACCELEROMETER, accel),
        (PATH_GYROSCOPE, gyro),
        (PATH_MAGNETOMETER, mag),
    ]
    if orientation is not None:
        writes.append((PATH_HEADING_MAGNETIC, orientation["yaw"]))
        writes.append(
            (
                PATH_ATTITUDE,
                {
                    "roll": orientation["roll"],
                    "pitch": orientation["pitch"],
                    "yaw": orientation["yaw"],
                },
            )
        )

    for path, value in writes:
        ok, status, detail = put_value(session, base_url, path, value, timestamp_iso)
        if not ok:
            return (False, status, f"REST {path}: {detail}")
        if status not in (200, 201, 202):
            return (False, status, f"REST {path}: unexpected HTTP {status}")
    return (True, 200, "REST PUT OK")


def print_loop_line(
    timestamp_iso: str,
    roll_rad: float | None,
    pitch_rad: float | None,
    heading_rad: float | None,
    status_ok: bool,
    note: str,
) -> None:
    icon = ICON_OK if status_ok else ICON_FAIL
    heading_deg = math.degrees(heading_rad) if heading_rad is not None else float("nan")
    roll_deg = math.degrees(roll_rad) if roll_rad is not None else float("nan")
    pitch_deg = math.degrees(pitch_rad) if pitch_rad is not None else float("nan")

    heading_txt = f"{heading_deg:7.2f} deg" if not math.isnan(heading_deg) else "    n/a"
    roll_txt = f"{roll_deg:7.2f} deg" if not math.isnan(roll_deg) else "    n/a"
    pitch_txt = f"{pitch_deg:7.2f} deg" if not math.isnan(pitch_deg) else "    n/a"
    print(
        f"{timestamp_iso} | hdg={heading_txt} roll={roll_txt} pitch={pitch_txt} | {icon} {note}"
    )


def print_summary(stats: RuntimeStats, publish_enabled: bool) -> None:
    print("\nSummary:")
    print(f"  Uptime: {stats.uptime_s():.1f} s")
    print(f"  Reads OK: {stats.reads_ok}")
    print(f"  Read errors: {stats.read_errors}")
    if publish_enabled:
        print(f"  Publish attempts: {stats.publish_attempts}")
        print(f"  Publish OK: {stats.publish_ok}")
        print(f"  Publish errors: {stats.publish_errors}")
        print(f"  Publish success rate: {stats.publish_success_rate():.1f}%")
    else:
        print("  Publish mode: disabled (--no-publish)")


def main() -> int:
    args = parse_args()

    if args.rate <= 0:
        raise SystemExit("--rate must be > 0")
    if args.yaw_time_constant <= 0:
        raise SystemExit("--yaw-time-constant must be > 0")
    if args.stationary_yaw_time_constant <= 0:
        raise SystemExit("--stationary-yaw-time-constant must be > 0")
    if args.stationary_gyro_threshold <= 0:
        raise SystemExit("--stationary-gyro-threshold must be > 0")
    if args.port <= 0 or args.port > 65535:
        raise SystemExit("--port must be in range 1-65535")

    base_url = build_base_url(args.host, args.port)
    period_s = 1.0 / args.rate
    stats = RuntimeStats()
    fusion = ComplementaryFusion(
        alpha=DEFAULT_ALPHA,
        yaw_time_constant_s=args.yaw_time_constant,
        stationary_yaw_time_constant_s=args.stationary_yaw_time_constant,
        stationary_gyro_threshold_dps=args.stationary_gyro_threshold,
    )
    session = requests.Session()
    imu = ICM20948()

    print(f"Signal K target: {base_url}/signalk/v1/api/")
    print(
        f"Rate: {args.rate} Hz | yaw-tau={args.yaw_time_constant:.2f} s "
        f"| stationary-yaw-tau={args.stationary_yaw_time_constant:.2f} s "
        f"| stationary-gyro={args.stationary_gyro_threshold:.2f} deg/s "
        f"| raw-only={args.raw_only} | no-publish={args.no_publish}"
    )

    if not args.no_publish:
        ok, detail = test_signalk_connection(session, base_url)
        icon = ICON_OK if ok else ICON_FAIL
        print(f"Startup connection test: {icon} {detail}")
        if not ok:
            print("Signal K not reachable right now. Will keep retrying on every cycle.")

    print("Publishing loop started. Press Ctrl+C to stop.")

    next_tick = time.monotonic()
    last_fusion_tick = time.monotonic()
    rest_fallback_enabled = False
    ws_fallback_enabled = False
    ws_publisher = SignalKWebSocketPublisher(base_url)

    try:
        while True:
            ts_iso = utc_timestamp_iso()

            try:
                ax_g, ay_g, az_g, gx_dps, gy_dps, gz_dps = imu.read_accelerometer_gyro_data()
                mx_ut, my_ut, mz_ut = imu.read_magnetometer_data()
                stats.reads_ok += 1
            except Exception as exc:  # noqa: BLE001
                stats.read_errors += 1
                print_loop_line(
                    ts_iso,
                    None,
                    None,
                    None,
                    status_ok=False,
                    note=f"sensor read failed: {exc}",
                )
                next_tick += period_s
                sleep_s = next_tick - time.monotonic()
                if sleep_s > 0:
                    time.sleep(sleep_s)
                else:
                    next_tick = time.monotonic()
                continue

            accel = {
                "x": ax_g * G_TO_MPS2,
                "y": ay_g * G_TO_MPS2,
                "z": az_g * G_TO_MPS2,
            }
            gyro = {
                "x": math.radians(gx_dps),
                "y": math.radians(gy_dps),
                "z": math.radians(gz_dps),
            }
            mag = {"x": mx_ut, "y": my_ut, "z": mz_ut}

            orientation: dict[str, float] | None = None
            roll: float | None = None
            pitch: float | None = None
            heading: float | None = None

            if not args.raw_only:
                now_tick = time.monotonic()
                dt_s = max(1e-3, now_tick - last_fusion_tick)
                last_fusion_tick = now_tick
                roll, pitch, heading = fusion.update(
                    accel["x"],
                    accel["y"],
                    accel["z"],
                    gyro["x"],
                    gyro["y"],
                    gyro["z"],
                    mag["x"],
                    mag["y"],
                    mag["z"],
                    dt_s,
                )
                orientation = {"roll": roll, "pitch": pitch, "yaw": heading}

            delta = build_delta_message(ts_iso, accel, gyro, mag, orientation)

            if args.no_publish:
                print_loop_line(
                    ts_iso,
                    roll,
                    pitch,
                    heading,
                    status_ok=True,
                    note="dry-run (--no-publish)",
                )
            else:
                stats.publish_attempts += 1
                if ws_fallback_enabled:
                    ok, detail = ws_publisher.publish(delta)
                elif rest_fallback_enabled:
                    ok, status, detail = publish_rest_points(
                        session,
                        base_url,
                        ts_iso,
                        accel,
                        gyro,
                        mag,
                        orientation,
                    )
                    if not ok and status == 405:
                        ws_fallback_enabled = True
                        ok, detail = ws_publisher.publish(delta)
                        detail = f"{detail} (REST PUT unavailable, WS fallback active)"
                else:
                    ok, status, detail = publish_delta(session, base_url, delta)
                    if not ok and status == 404:
                        rest_fallback_enabled = True
                        ok, status, detail = publish_rest_points(
                            session,
                            base_url,
                            ts_iso,
                            accel,
                            gyro,
                            mag,
                            orientation,
                        )
                        detail = f"{detail} (delta POST unavailable, REST fallback active)"
                        if not ok and status == 405:
                            ws_fallback_enabled = True
                            ok, detail = ws_publisher.publish(delta)
                            detail = (
                                f"{detail} (REST PUT unavailable, WS fallback active)"
                            )
                if ok:
                    stats.publish_ok += 1
                else:
                    stats.publish_errors += 1
                print_loop_line(
                    ts_iso,
                    roll,
                    pitch,
                    heading,
                    status_ok=ok,
                    note=detail,
                )

            next_tick += period_s
            sleep_s = next_tick - time.monotonic()
            if sleep_s > 0:
                time.sleep(sleep_s)
            else:
                next_tick = time.monotonic()
    except KeyboardInterrupt:
        print_summary(stats, publish_enabled=not args.no_publish)
        ws_publisher.close()
        session.close()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
