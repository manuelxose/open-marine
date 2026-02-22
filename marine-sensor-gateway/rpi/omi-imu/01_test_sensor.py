#!/usr/bin/env python3
"""Read ICM-20948 9-axis data and print it at a fixed rate."""

from __future__ import annotations

import argparse
import time
from datetime import datetime, timezone

from icm20948 import ICM20948


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ICM-20948 quick test (accel+gyro+mag), Ctrl+C to stop.",
    )
    parser.add_argument(
        "--rate",
        type=float,
        default=2.0,
        help="Read rate in Hz (default: 2)",
    )
    return parser.parse_args()


def utc_clock() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def main() -> int:
    args = parse_args()
    if args.rate <= 0:
        raise SystemExit("--rate must be > 0")

    period_s = 1.0 / args.rate
    imu = ICM20948()

    print("ICM-20948 test started. Press Ctrl+C to stop.")
    print("Expected at rest (flat): accel ~ X:0g Y:0g Z:+1g, gyro ~ 0 dps.")
    print("-" * 116)
    print(
        f"{'UTC':<10}"
        f"{'AX(g)':>10}{'AY(g)':>10}{'AZ(g)':>10}"
        f"{'GX(dps)':>12}{'GY(dps)':>12}{'GZ(dps)':>12}"
        f"{'MX(uT)':>12}{'MY(uT)':>12}{'MZ(uT)':>12}"
    )
    print("-" * 116)

    reads = 0
    errors = 0
    next_tick = time.monotonic()

    try:
        while True:
            loop_ts = utc_clock()
            try:
                ax, ay, az, gx, gy, gz = imu.read_accelerometer_gyro_data()
                mx, my, mz = imu.read_magnetometer_data()
                reads += 1
                print(
                    f"{loop_ts:<10}"
                    f"{ax:>10.3f}{ay:>10.3f}{az:>10.3f}"
                    f"{gx:>12.3f}{gy:>12.3f}{gz:>12.3f}"
                    f"{mx:>12.3f}{my:>12.3f}{mz:>12.3f}"
                )
            except Exception as exc:  # noqa: BLE001
                errors += 1
                print(f"{loop_ts:<10} read error: {exc}")

            next_tick += period_s
            sleep_s = next_tick - time.monotonic()
            if sleep_s > 0:
                time.sleep(sleep_s)
            else:
                next_tick = time.monotonic()
    except KeyboardInterrupt:
        print("\nStopping sensor test...")
        print(f"Total reads: {reads}")
        print(f"Read errors: {errors}")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
