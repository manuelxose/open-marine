#!/usr/bin/env python3
"""Read USB GPS NMEA0183 and publish to Signal K."""

from __future__ import annotations

import argparse
import glob
import json
import math
import time
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import pynmea2
import requests
import serial

try:
    import websocket  # type: ignore[import-untyped]
except Exception:  # noqa: BLE001
    websocket = None

KNOT_TO_MPS = 0.514444
DEFAULT_PORT = 3000
DEFAULT_BAUD = 9600
DEFAULT_DEVICE = "/dev/ttyACM0"
DEFAULT_TIMEOUT_S = 2.5
DEFAULT_RATE_HZ = 1.0
NMEA_STALE_TIMEOUT_S = 3.0
DEFAULT_STATIONARY_SOG_KNOTS = 2.0
DEFAULT_STATIONARY_RADIUS_METERS = 12.0

SOURCE_LABEL = "G-Mouse DL28U9U GPS"
SOURCE_SRC = "gps-usb"
SOURCE_TYPE = "NMEA0183"

PATH_POSITION = "navigation.position"
PATH_SOG = "navigation.speedOverGround"
PATH_COG_TRUE = "navigation.courseOverGroundTrue"
PATH_MAG_VAR = "navigation.magneticVariation"
PATH_NAV_DATETIME = "navigation.datetime"
PATH_GPS_FIX = "sensors.gps.fix"
PATH_GPS_SATS_IN_VIEW = "sensors.gps.satellitesInView"
PATH_GPS_HDOP = "sensors.gps.horizontalDilution"

ICON_OK = "\u2705"
ICON_FAIL = "\u274c"


@dataclass
class RuntimeStats:
    lines_read: int = 0
    parse_ok: int = 0
    parse_errors: int = 0
    fixes_valid: int = 0
    fixes_none: int = 0
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


@dataclass
class GpsState:
    latitude: float | None = None
    longitude: float | None = None
    altitude_m: float | None = None
    sog_knots: float | None = None
    cog_deg_true: float | None = None
    magnetic_variation_deg: float | None = None
    gps_datetime_utc: datetime | None = None
    rmc_status: str | None = None
    gps_quality: int | None = None
    gsa_fix_type: int | None = None
    satellites_used: int | None = None
    satellites_in_view: int | None = None
    hdop: float | None = None
    fix_type: str = "none"


@dataclass
class StationaryFilterState:
    locked_latitude: float | None = None
    locked_longitude: float | None = None
    locked_cog_deg_true: float | None = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish USB GPS NMEA0183 data to Signal K.",
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
        "--device",
        default=DEFAULT_DEVICE,
        help=f"GPS serial device (default: {DEFAULT_DEVICE})",
    )
    parser.add_argument(
        "--baud",
        type=int,
        default=DEFAULT_BAUD,
        help=f"GPS baudrate (default: {DEFAULT_BAUD})",
    )
    parser.add_argument(
        "--rate",
        type=float,
        default=DEFAULT_RATE_HZ,
        help=f"Publishing rate in Hz (default: {DEFAULT_RATE_HZ})",
    )
    parser.add_argument(
        "--no-publish",
        action="store_true",
        help="Read and parse only; do not publish to Signal K.",
    )
    parser.add_argument(
        "--stationary-sog-knots",
        type=float,
        default=DEFAULT_STATIONARY_SOG_KNOTS,
        help=(
            "Treat GPS fixes at or below this SOG as stopped and suppress jitter "
            f"(default: {DEFAULT_STATIONARY_SOG_KNOTS} kn)."
        ),
    )
    parser.add_argument(
        "--stationary-radius-meters",
        type=float,
        default=DEFAULT_STATIONARY_RADIUS_METERS,
        help=(
            "Maximum position drift to freeze while stopped "
            f"(default: {DEFAULT_STATIONARY_RADIUS_METERS} m)."
        ),
    )
    return parser.parse_args()


def parse_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_int(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def detect_serial_device(requested: str) -> str:
    if requested and glob.glob(requested):
        return requested

    fallback_candidates = ["/dev/ttyACM0", "/dev/ttyUSB0"]
    for candidate in fallback_candidates:
        if glob.glob(candidate):
            return candidate

    for pattern in ("/dev/ttyACM*", "/dev/ttyUSB*"):
        matches = sorted(glob.glob(pattern))
        if matches:
            return matches[0]

    raise RuntimeError(
        f"GPS serial device not found. Requested '{requested}', and no /dev/ttyACM* or /dev/ttyUSB* detected.",
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


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00",
        "Z",
    )


def to_iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00",
        "Z",
    )


def has_valid_fix(state: GpsState) -> bool:
    return (
        state.fix_type != "none"
        and state.latitude is not None
        and state.longitude is not None
        and state.rmc_status != "V"
    )


def distance_meters(
    lat_a: float,
    lon_a: float,
    lat_b: float,
    lon_b: float,
) -> float:
    earth_radius_m = 6_371_000.0
    phi_a = math.radians(lat_a)
    phi_b = math.radians(lat_b)
    delta_phi = math.radians(lat_b - lat_a)
    delta_lambda = math.radians(lon_b - lon_a)
    hav = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi_a) * math.cos(phi_b) * math.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * earth_radius_m * math.atan2(math.sqrt(hav), math.sqrt(1.0 - hav))


def apply_stationary_filter(
    state: GpsState,
    filter_state: StationaryFilterState,
    stationary_sog_knots: float,
    stationary_radius_meters: float,
) -> GpsState:
    if not has_valid_fix(state):
        filter_state.locked_latitude = None
        filter_state.locked_longitude = None
        filter_state.locked_cog_deg_true = None
        return state

    if state.sog_knots is None or state.sog_knots > stationary_sog_knots:
        filter_state.locked_latitude = state.latitude
        filter_state.locked_longitude = state.longitude
        filter_state.locked_cog_deg_true = state.cog_deg_true
        return state

    lat = state.latitude
    lon = state.longitude
    if lat is None or lon is None:
        return state

    if filter_state.locked_latitude is None or filter_state.locked_longitude is None:
        filter_state.locked_latitude = lat
        filter_state.locked_longitude = lon
        filter_state.locked_cog_deg_true = state.cog_deg_true

    distance_from_lock = distance_meters(
        filter_state.locked_latitude,
        filter_state.locked_longitude,
        lat,
        lon,
    )
    if distance_from_lock > stationary_radius_meters:
        filter_state.locked_latitude = lat
        filter_state.locked_longitude = lon
        filter_state.locked_cog_deg_true = state.cog_deg_true

    return replace(
        state,
        latitude=filter_state.locked_latitude,
        longitude=filter_state.locked_longitude,
        sog_knots=0.0,
        cog_deg_true=filter_state.locked_cog_deg_true,
    )


def derive_fix_type(state: GpsState) -> str:
    if state.rmc_status == "V":
        return "none"

    if state.gps_quality is not None:
        if state.gps_quality <= 0:
            return "none"
        if state.gps_quality == 2:
            return "dgps"
        if state.gsa_fix_type == 2:
            return "2d"
        if state.gsa_fix_type == 3:
            return "3d"
        return "3d"

    if state.gsa_fix_type == 2:
        return "2d"
    if state.gsa_fix_type == 3:
        return "3d"
    return "none"


def update_from_message(message: pynmea2.NMEASentence, state: GpsState) -> bool:
    sentence = message.sentence_type
    changed = False

    if sentence == "RMC":
        lat = parse_float(getattr(message, "latitude", None))
        lon = parse_float(getattr(message, "longitude", None))
        if lat is not None and lon is not None:
            state.latitude = lat
            state.longitude = lon
            changed = True

        sog = parse_float(getattr(message, "spd_over_grnd", None))
        if sog is not None:
            state.sog_knots = sog
            changed = True

        cog = parse_float(getattr(message, "true_course", None))
        if cog is not None:
            state.cog_deg_true = cog
            changed = True

        status = str(getattr(message, "status", "")).strip() or None
        if status != state.rmc_status:
            state.rmc_status = status
            changed = True

        mag_var = parse_float(getattr(message, "mag_variation", None))
        if mag_var is not None:
            mag_dir = str(getattr(message, "mag_var_dir", "")).strip().upper()
            if mag_dir == "W":
                mag_var = -abs(mag_var)
            elif mag_dir == "E":
                mag_var = abs(mag_var)
            state.magnetic_variation_deg = mag_var
            changed = True

        datestamp = getattr(message, "datestamp", None)
        timestamp = getattr(message, "timestamp", None)
        if datestamp and timestamp:
            state.gps_datetime_utc = datetime.combine(
                datestamp,
                timestamp,
                tzinfo=timezone.utc,
            )
            changed = True

    elif sentence == "GGA":
        lat = parse_float(getattr(message, "latitude", None))
        lon = parse_float(getattr(message, "longitude", None))
        if lat is not None and lon is not None:
            state.latitude = lat
            state.longitude = lon
            changed = True

        altitude = parse_float(getattr(message, "altitude", None))
        if altitude is not None:
            state.altitude_m = altitude
            changed = True

        sats_used = parse_int(getattr(message, "num_sats", None))
        if sats_used is not None:
            state.satellites_used = sats_used
            changed = True

        hdop = parse_float(getattr(message, "horizontal_dil", None))
        if hdop is not None:
            state.hdop = hdop
            changed = True

        gps_quality = parse_int(getattr(message, "gps_qual", None))
        if gps_quality is not None:
            state.gps_quality = gps_quality
            changed = True

    elif sentence == "GSA":
        gsa_fix = parse_int(getattr(message, "mode_fix_type", None))
        if gsa_fix is not None:
            state.gsa_fix_type = gsa_fix
            changed = True

        hdop = parse_float(getattr(message, "hdop", None))
        if hdop is not None:
            state.hdop = hdop
            changed = True

    elif sentence == "GSV":
        sats_in_view = parse_int(getattr(message, "num_sv_in_view", None))
        if sats_in_view is not None:
            state.satellites_in_view = sats_in_view
            changed = True

    elif sentence == "VTG":
        cog = parse_float(getattr(message, "true_track", None))
        if cog is not None:
            state.cog_deg_true = cog
            changed = True

        sog = parse_float(getattr(message, "spd_over_grnd_kts", None))
        if sog is not None:
            state.sog_knots = sog
            changed = True

    new_fix_type = derive_fix_type(state)
    if new_fix_type != state.fix_type:
        state.fix_type = new_fix_type
        changed = True

    return changed


def build_values(state: GpsState, timestamp_iso: str) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = [
        {"path": PATH_GPS_FIX, "value": state.fix_type},
    ]

    sats = state.satellites_in_view
    if sats is None:
        sats = state.satellites_used
    if sats is not None:
        values.append({"path": PATH_GPS_SATS_IN_VIEW, "value": sats})

    if state.hdop is not None:
        values.append({"path": PATH_GPS_HDOP, "value": state.hdop})

    if has_valid_fix(state):
        position: dict[str, float] = {
            "latitude": state.latitude if state.latitude is not None else 0.0,
            "longitude": state.longitude if state.longitude is not None else 0.0,
        }
        if state.altitude_m is not None:
            position["altitude"] = state.altitude_m
        values.append({"path": PATH_POSITION, "value": position})

        if state.sog_knots is not None:
            values.append({"path": PATH_SOG, "value": state.sog_knots * KNOT_TO_MPS})

        if state.cog_deg_true is not None:
            values.append({"path": PATH_COG_TRUE, "value": math.radians(state.cog_deg_true)})

        if state.magnetic_variation_deg is not None:
            values.append(
                {
                    "path": PATH_MAG_VAR,
                    "value": math.radians(state.magnetic_variation_deg),
                }
            )

        nav_datetime = timestamp_iso
        if state.gps_datetime_utc is not None:
            nav_datetime = to_iso_utc(state.gps_datetime_utc)
        values.append({"path": PATH_NAV_DATETIME, "value": nav_datetime})

    return values


def build_delta_message(timestamp_iso: str, values: list[dict[str, Any]]) -> dict[str, Any]:
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


def publish_rest_values(
    session: requests.Session,
    base_url: str,
    timestamp_iso: str,
    values: list[dict[str, Any]],
) -> tuple[bool, int, str]:
    for item in values:
        path = str(item.get("path", "")).strip()
        if not path:
            continue
        ok, status, detail = put_value(
            session,
            base_url,
            path,
            item.get("value"),
            timestamp_iso,
        )
        if not ok:
            return (False, status, f"REST {path}: {detail}")
        if status not in (200, 201, 202):
            return (False, status, f"REST {path}: unexpected HTTP {status}")
    return (True, 200, "REST PUT OK")


def print_line(
    timestamp_iso: str,
    state: GpsState,
    status_ok: bool,
    note: str,
) -> None:
    icon = ICON_OK if status_ok else ICON_FAIL
    lat = f"{state.latitude:.6f}" if state.latitude is not None else "n/a"
    lon = f"{state.longitude:.6f}" if state.longitude is not None else "n/a"
    sog = f"{state.sog_knots:.2f} kn" if state.sog_knots is not None else "n/a"
    cog = f"{state.cog_deg_true:.2f} deg" if state.cog_deg_true is not None else "n/a"
    sats = state.satellites_in_view
    if sats is None:
        sats = state.satellites_used
    sats_txt = str(sats) if sats is not None else "n/a"
    print(
        f"{timestamp_iso} | fix={state.fix_type} lat={lat} lon={lon} "
        f"sog={sog} cog={cog} sats={sats_txt} | {icon} {note}"
    )


def print_summary(stats: RuntimeStats, publish_enabled: bool) -> None:
    print("\nSummary:")
    print(f"  Uptime: {stats.uptime_s():.1f} s")
    print(f"  NMEA lines read: {stats.lines_read}")
    print(f"  Parsed messages: {stats.parse_ok}")
    print(f"  Parse errors: {stats.parse_errors}")
    print(f"  Valid fixes: {stats.fixes_valid}")
    print(f"  No-fix cycles: {stats.fixes_none}")
    if publish_enabled:
        print(f"  Publish attempts: {stats.publish_attempts}")
        print(f"  Publish OK: {stats.publish_ok}")
        print(f"  Publish errors: {stats.publish_errors}")
        print(f"  Publish success rate: {stats.publish_success_rate():.1f}%")
    else:
        print("  Publish mode: disabled (--no-publish)")


def main() -> int:
    args = parse_args()
    if args.port <= 0 or args.port > 65535:
        raise SystemExit("--port must be in range 1-65535")
    if args.baud <= 0:
        raise SystemExit("--baud must be > 0")
    if args.rate <= 0:
        raise SystemExit("--rate must be > 0")
    if args.stationary_sog_knots < 0:
        raise SystemExit("--stationary-sog-knots must be >= 0")
    if args.stationary_radius_meters <= 0:
        raise SystemExit("--stationary-radius-meters must be > 0")

    device = detect_serial_device(args.device)
    base_url = build_base_url(args.host, args.port)
    publish_period_s = 1.0 / args.rate
    serial_timeout_s = max(0.05, min(0.5, publish_period_s / 4.0))
    state = GpsState()
    stationary_filter = StationaryFilterState()
    stats = RuntimeStats()
    session = requests.Session()
    ws_publisher = SignalKWebSocketPublisher(base_url)

    rest_fallback_enabled = False
    ws_fallback_enabled = False
    next_publish_due = time.monotonic()
    last_nmea_monotonic: float | None = None

    print(f"GPS device: {device} @ {args.baud} baud")
    print(f"Signal K target: {base_url}/signalk/v1/api/")
    print(f"Rate: {args.rate} Hz")
    print(
        "Stationary filter: "
        f"SOG <= {args.stationary_sog_knots:.2f} kn, "
        f"radius <= {args.stationary_radius_meters:.1f} m"
    )
    print(f"Publish enabled: {not args.no_publish}")

    if not args.no_publish:
        ok, detail = test_signalk_connection(session, base_url)
        icon = ICON_OK if ok else ICON_FAIL
        print(f"Startup connection test: {icon} {detail}")
        if not ok:
            print("Signal K not reachable right now. Will keep retrying on every cycle.")

    with serial.Serial(device, baudrate=args.baud, timeout=serial_timeout_s) as ser:
        try:
            while True:
                line = ser.readline().decode("ascii", errors="replace").strip()
                now = time.monotonic()
                if line:
                    stats.lines_read += 1
                    if line.startswith("$"):
                        try:
                            msg = pynmea2.parse(line)
                            stats.parse_ok += 1
                            update_from_message(msg, state)
                            last_nmea_monotonic = now
                        except pynmea2.nmea.ParseError:
                            stats.parse_errors += 1

                if now < next_publish_due:
                    continue
                next_publish_due += publish_period_s
                if next_publish_due < now:
                    next_publish_due = now + publish_period_s

                if (
                    last_nmea_monotonic is not None
                    and (now - last_nmea_monotonic) > NMEA_STALE_TIMEOUT_S
                ):
                    state.fix_type = "none"

                timestamp_iso = (
                    to_iso_utc(state.gps_datetime_utc)
                    if state.gps_datetime_utc is not None
                    else utc_now_iso()
                )
                publish_state = apply_stationary_filter(
                    state,
                    stationary_filter,
                    args.stationary_sog_knots,
                    args.stationary_radius_meters,
                )
                values = build_values(publish_state, timestamp_iso)
                delta = build_delta_message(timestamp_iso, values)

                if has_valid_fix(publish_state):
                    stats.fixes_valid += 1
                else:
                    stats.fixes_none += 1

                if args.no_publish:
                    print_line(timestamp_iso, publish_state, status_ok=True, note="dry-run (--no-publish)")
                    continue

                stats.publish_attempts += 1
                if ws_fallback_enabled:
                    ok, detail = ws_publisher.publish(delta)
                elif rest_fallback_enabled:
                    ok, status, detail = publish_rest_values(
                        session,
                        base_url,
                        timestamp_iso,
                        values,
                    )
                    if not ok and status == 405:
                        ws_fallback_enabled = True
                        ok, detail = ws_publisher.publish(delta)
                        detail = f"{detail} (REST PUT unavailable, WS fallback active)"
                else:
                    ok, status, detail = publish_delta(session, base_url, delta)
                    if not ok and status == 404:
                        rest_fallback_enabled = True
                        ok, status, detail = publish_rest_values(
                            session,
                            base_url,
                            timestamp_iso,
                            values,
                        )
                        detail = f"{detail} (delta POST unavailable, REST fallback active)"
                        if not ok and status == 405:
                            ws_fallback_enabled = True
                            ok, detail = ws_publisher.publish(delta)
                            detail = f"{detail} (REST PUT unavailable, WS fallback active)"

                if ok:
                    stats.publish_ok += 1
                else:
                    stats.publish_errors += 1
                print_line(timestamp_iso, publish_state, status_ok=ok, note=detail)

        except KeyboardInterrupt:
            print_summary(stats, publish_enabled=not args.no_publish)
            ws_publisher.close()
            session.close()
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
