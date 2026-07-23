#!/usr/bin/env python3
"""Build a fail-closed Pico config from a profile and verified calibration."""

import argparse
import json
from pathlib import Path
import runpy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("profile_file", type=Path)
    parser.add_argument("output_file", type=Path)
    parser.add_argument("calibration_file", type=Path)
    args = parser.parse_args()

    profile = runpy.run_path(str(args.profile_file))
    name = profile["PROFILE"]
    if name == "bench-led":
        args.output_file.write_text(args.profile_file.read_text(encoding="utf-8"), encoding="utf-8")
        return

    try:
        calibration = json.loads(args.calibration_file.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError) as error:
        raise SystemExit("Missing valid Pico calibration: {}".format(error))

    zero = float(calibration.get("current_zero_volts", -1))
    sensitivity = float(calibration.get("current_volts_per_amp", 0))
    limit = float(calibration.get("current_limit_amps", 0))
    if calibration.get("estop_verified") is not True:
        raise SystemExit("E-stop NC wiring has not been verified")
    if not 0 <= zero <= 3.3 or sensitivity <= 0 or not 0 < limit <= 10:
        raise SystemExit("Invalid current calibration; limit must be <= 10 A")

    args.output_file.write_text(
        "\n".join(
            (
                'PROFILE = "{}"'.format(name),
                "ESTOP_CONFIGURED = True",
                "CURRENT_SENSOR_CONFIGURED = True",
                "CURRENT_ZERO_VOLTS = {:.6f}".format(zero),
                "CURRENT_VOLTS_PER_AMP = {:.6f}".format(sensitivity),
                "CURRENT_LIMIT_AMPS = {:.3f}".format(limit),
                "",
            )
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
