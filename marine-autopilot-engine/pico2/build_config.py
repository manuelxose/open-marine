#!/usr/bin/env python3
"""Build a fail-closed Pico config from a profile and verified calibration."""

import argparse
import json
from pathlib import Path
import runpy


def build_config(
    profile_file,
    calibration_file,
    bench_motor_max_duty=10,
    bench_motor_estop_configured=False,
):
    profile = runpy.run_path(str(profile_file))
    name = profile["PROFILE"]
    if name == "bench-led":
        return profile_file.read_text(encoding="utf-8")
    if name == "bench-motor":
        if not 1 <= bench_motor_max_duty <= 20:
            raise ValueError("bench-motor max duty must be within 1..20 percent")
        return "\n".join(
            (
                'PROFILE = "bench-motor"',
                "ESTOP_CONFIGURED = {}".format(
                    "True" if bench_motor_estop_configured else "False"
                ),
                "CURRENT_SENSOR_CONFIGURED = False",
                "CURRENT_ZERO_VOLTS = 0.0",
                "CURRENT_VOLTS_PER_AMP = 0.0",
                "CURRENT_LIMIT_AMPS = 0.0",
                "BENCH_MOTOR_MAX_DRIVE = {:.3f}".format(
                    bench_motor_max_duty / 100
                ),
                "",
            )
        )

    try:
        calibration = json.loads(calibration_file.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError) as error:
        raise ValueError("Missing valid Pico calibration: {}".format(error))

    zero = float(calibration.get("current_zero_volts", -1))
    sensitivity = float(calibration.get("current_volts_per_amp", 0))
    limit = float(calibration.get("current_limit_amps", 0))
    if calibration.get("estop_verified") is not True:
        raise ValueError("E-stop NC wiring has not been verified")
    if not 0 <= zero <= 3.3 or sensitivity <= 0 or not 0 < limit <= 10:
        raise ValueError("Invalid current calibration; limit must be <= 10 A")

    return "\n".join(
        (
            'PROFILE = "{}"'.format(name),
            "ESTOP_CONFIGURED = True",
            "CURRENT_SENSOR_CONFIGURED = True",
            "CURRENT_ZERO_VOLTS = {:.6f}".format(zero),
            "CURRENT_VOLTS_PER_AMP = {:.6f}".format(sensitivity),
            "CURRENT_LIMIT_AMPS = {:.3f}".format(limit),
            "",
        )
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("profile_file", type=Path)
    parser.add_argument("output_file", type=Path)
    parser.add_argument("calibration_file", type=Path)
    parser.add_argument("--bench-motor-max-duty", type=int, default=10)
    parser.add_argument("--bench-motor-estop-configured", action="store_true")
    args = parser.parse_args()
    try:
        rendered = build_config(
            args.profile_file,
            args.calibration_file,
            args.bench_motor_max_duty,
            args.bench_motor_estop_configured,
        )
    except ValueError as error:
        raise SystemExit(str(error))
    args.output_file.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
