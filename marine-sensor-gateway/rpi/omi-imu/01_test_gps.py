#!/usr/bin/env python3
"""Read NMEA0183 from USB GPS and print parsed fixes."""

from __future__ import annotations

import argparse
import glob
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import pynmea2
import serial


@dataclass
class GpsSnapshot:
    latitude: float | None = None
    longitude: float | None = None
    altitude_m: float | None = None
    sog_knots: float | None = None
    cog_deg: float | None = None
    gps_quality: int | None = None
    gsa_fix_type: int | None = None
    rmc_status: str | None = None
    satellites_used: int | None = None
    satellites_in_view: int | None = None
    hdop: float | None = None
    gps_datetime_utc: datetime | None = None
    magnetic_variation_deg: float | None = None
    last_sentence: str | None = None
    fix_type: str = "none"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read and parse NMEA GPS data from USB serial.",
    )
    parser.add_argument(
        "--device",
        default="auto",
        help="GPS serial device (default: auto -> /dev/ttyACM0 or /dev/ttyUSB0)",
    )
    parser.add_argument(
        "--baud",
        type=int,
        default=9600,
        help="Serial baudrate (default: 9600)",
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
    if requested != "auto":
        if requested.startswith("/dev/") and glob.glob(requested):
            return requested
        if requested in ("/dev/ttyACM0", "/dev/ttyUSB0"):
            if glob.glob(requested):
                return requested

    for fixed in ("/dev/ttyACM0", "/dev/ttyUSB0"):
        if glob.glob(fixed):
            return fixed

    for pattern in ("/dev/ttyACM*", "/dev/ttyUSB*"):
        matches = sorted(glob.glob(pattern))
        if matches:
            return matches[0]

    raise RuntimeError("No GPS serial device found (/dev/ttyACM* or /dev/ttyUSB*)")


def update_fix_type(snapshot: GpsSnapshot) -> None:
    if snapshot.rmc_status == "V":
        snapshot.fix_type = "none"
        return

    if snapshot.gps_quality is not None:
        if snapshot.gps_quality <= 0:
            snapshot.fix_type = "none"
            return
        if snapshot.gps_quality == 2:
            snapshot.fix_type = "dgps"
            return
        if snapshot.gsa_fix_type == 3:
            snapshot.fix_type = "3d"
            return
        if snapshot.gsa_fix_type == 2:
            snapshot.fix_type = "2d"
            return
        snapshot.fix_type = "3d"
        return

    if snapshot.gsa_fix_type == 3:
        snapshot.fix_type = "3d"
        return
    if snapshot.gsa_fix_type == 2:
        snapshot.fix_type = "2d"
        return
    snapshot.fix_type = "none"


def update_from_message(message: pynmea2.NMEASentence, snapshot: GpsSnapshot) -> bool:
    sentence = message.sentence_type
    snapshot.last_sentence = sentence

    if sentence == "RMC":
        lat = parse_float(getattr(message, "latitude", None))
        lon = parse_float(getattr(message, "longitude", None))
        if lat is not None and lon is not None:
            snapshot.latitude = lat
            snapshot.longitude = lon

        snapshot.sog_knots = parse_float(getattr(message, "spd_over_grnd", None))
        snapshot.cog_deg = parse_float(getattr(message, "true_course", None))
        snapshot.rmc_status = str(getattr(message, "status", "")).strip() or None

        mag_var = parse_float(getattr(message, "mag_variation", None))
        if mag_var is not None:
            mag_dir = str(getattr(message, "mag_var_dir", "")).strip().upper()
            if mag_dir == "W":
                mag_var = -abs(mag_var)
            elif mag_dir == "E":
                mag_var = abs(mag_var)
            snapshot.magnetic_variation_deg = mag_var

        datestamp = getattr(message, "datestamp", None)
        timestamp = getattr(message, "timestamp", None)
        if datestamp and timestamp:
            snapshot.gps_datetime_utc = datetime.combine(
                datestamp,
                timestamp,
                tzinfo=timezone.utc,
            )

        update_fix_type(snapshot)
        return True

    if sentence == "GGA":
        lat = parse_float(getattr(message, "latitude", None))
        lon = parse_float(getattr(message, "longitude", None))
        if lat is not None and lon is not None:
            snapshot.latitude = lat
            snapshot.longitude = lon

        snapshot.altitude_m = parse_float(getattr(message, "altitude", None))
        snapshot.satellites_used = parse_int(getattr(message, "num_sats", None))
        snapshot.hdop = parse_float(getattr(message, "horizontal_dil", None))
        snapshot.gps_quality = parse_int(getattr(message, "gps_qual", None))
        update_fix_type(snapshot)
        return True

    if sentence == "GSA":
        snapshot.gsa_fix_type = parse_int(getattr(message, "mode_fix_type", None))
        hdop = parse_float(getattr(message, "hdop", None))
        if hdop is not None:
            snapshot.hdop = hdop
        update_fix_type(snapshot)
        return True

    if sentence == "GSV":
        snapshot.satellites_in_view = parse_int(getattr(message, "num_sv_in_view", None))
        return True

    if sentence == "VTG":
        true_track = parse_float(getattr(message, "true_track", None))
        if true_track is not None:
            snapshot.cog_deg = true_track
        sog_kts = parse_float(getattr(message, "spd_over_grnd_kts", None))
        if sog_kts is not None:
            snapshot.sog_knots = sog_kts
        return True

    return False


def has_valid_fix(snapshot: GpsSnapshot) -> bool:
    return (
        snapshot.fix_type != "none"
        and snapshot.latitude is not None
        and snapshot.longitude is not None
    )


def format_lat_lon(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.6f}"


def format_num(value: float | None, unit: str = "") -> str:
    if value is None:
        return "n/a"
    suffix = f" {unit}" if unit else ""
    return f"{value:.2f}{suffix}"


def print_snapshot(snapshot: GpsSnapshot) -> None:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    sats = snapshot.satellites_in_view
    if sats is None:
        sats = snapshot.satellites_used
    fix_label = "FIX" if has_valid_fix(snapshot) else "NO_FIX"
    print(
        f"{ts} [{snapshot.last_sentence}] {fix_label} "
        f"fix={snapshot.fix_type} "
        f"lat={format_lat_lon(snapshot.latitude)} "
        f"lon={format_lat_lon(snapshot.longitude)} "
        f"alt={format_num(snapshot.altitude_m, 'm')} "
        f"sog={format_num(snapshot.sog_knots, 'kn')} "
        f"cog={format_num(snapshot.cog_deg, 'deg')} "
        f"sats={sats if sats is not None else 'n/a'} "
        f"hdop={format_num(snapshot.hdop)} "
        f"q={snapshot.gps_quality if snapshot.gps_quality is not None else 'n/a'}"
    )


def main() -> int:
    args = parse_args()
    if args.baud <= 0:
        raise SystemExit("--baud must be > 0")

    device = detect_serial_device(args.device)
    print(f"GPS device: {device} @ {args.baud} baud")
    print("Reading NMEA sentences (Ctrl+C to stop)...")

    snapshot = GpsSnapshot()
    raw_lines = 0
    parsed_ok = 0
    parsed_errors = 0
    valid_fix_updates = 0

    with serial.Serial(device, baudrate=args.baud, timeout=1.0) as ser:
        try:
            while True:
                line = ser.readline().decode("ascii", errors="replace").strip()
                if not line:
                    continue
                raw_lines += 1
                print(f"RAW: {line}")

                if not line.startswith("$"):
                    continue

                try:
                    msg = pynmea2.parse(line)
                    parsed_ok += 1
                except pynmea2.nmea.ParseError as exc:
                    parsed_errors += 1
                    print(f"Parse error: {exc}")
                    continue

                if update_from_message(msg, snapshot):
                    if has_valid_fix(snapshot):
                        valid_fix_updates += 1
                    print_snapshot(snapshot)
        except KeyboardInterrupt:
            print("\nStopping GPS test...")
            print(f"Raw lines read: {raw_lines}")
            print(f"Parsed messages: {parsed_ok}")
            print(f"Parse errors: {parsed_errors}")
            print(f"Valid-fix updates: {valid_fix_updates}")
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
