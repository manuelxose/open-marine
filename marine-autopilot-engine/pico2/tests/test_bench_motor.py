"""Hardware-free safety tests for the Pico 2 bench-motor profile."""

import argparse
from pathlib import Path
import sys
import types
import unittest
from unittest import mock


PICO_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PICO_DIR))

if "fcntl" not in sys.modules:
    sys.modules["fcntl"] = types.SimpleNamespace(
        LOCK_EX=0,
        LOCK_NB=0,
        flock=lambda *_args: None,
    )
if "serial" not in sys.modules:
    sys.modules["serial"] = types.SimpleNamespace(
        SerialException=OSError,
        Serial=None,
    )

import build_config
import motor_policy
import pico_motor_cli as cli


BENCH_STATUS = [
    "R,pico2,profile=bench-motor,pwm=15,dir=14,pwm_output=0.000,"
    "dir_output=0,enabled=0,drive=0.000,heartbeat=0,"
    "estop=not-configured,estop_raw=unavailable,current=unavailable,"
    "current_v=unavailable,max_drive=0.100,ready=1,fault="
]


class BenchMotorPolicyTests(unittest.TestCase):
    def test_profile_defaults_and_boot_output_are_safe(self):
        profile = {}
        exec(
            (PICO_DIR / "profiles" / "bench-motor.py").read_text(encoding="utf-8"),
            profile,
        )
        firmware = (PICO_DIR / "main.py").read_text(encoding="utf-8")
        self.assertEqual(profile["BENCH_MOTOR_MAX_DRIVE"], 0.10)
        self.assertFalse(profile["CURRENT_SENSOR_CONFIGURED"])
        self.assertIn("pwm.duty_u16(0)", firmware)
        self.assertIn("direction = Pin(DIR_PIN, Pin.OUT, value=0)", firmware)

    def test_bench_limit_never_exceeds_twenty_percent(self):
        self.assertEqual(motor_policy.profile_drive_limit("bench-motor", 0.50), 0.20)
        self.assertEqual(motor_policy.profile_drive_limit("bench-motor", 0.07), 0.07)

    def test_motion_and_watchdog_limits(self):
        firmware = (PICO_DIR / "main.py").read_text(encoding="utf-8")
        self.assertEqual(
            motor_policy.PROFILE_MAX_MOTION_MS["bench-motor"],
            1_000,
        )
        self.assertTrue(motor_policy.heartbeat_is_fresh(450, 450))
        self.assertFalse(motor_policy.heartbeat_is_fresh(451, 450))
        self.assertIn('latch_fault("heartbeat-timeout")', firmware)
        self.assertIn('latch_fault("{}-timeout".format(profile))', firmware)

    def test_sensor_requirements_are_not_relaxed_for_other_profiles(self):
        self.assertFalse(motor_policy.requires_current_sensor("bench-motor"))
        self.assertFalse(motor_policy.requires_estop("bench-motor"))
        for profile in ("motor-commissioning", "hil-motor", "production"):
            self.assertTrue(motor_policy.requires_current_sensor(profile))
            self.assertTrue(motor_policy.requires_estop(profile))

    def test_missing_current_is_not_reported_as_zero(self):
        self.assertEqual(motor_policy.sensor_value(None), "unavailable")
        self.assertEqual(motor_policy.sensor_value(0.0), "0.00")

    def test_build_config_skips_calibration_only_for_bench_motor(self):
        missing = PICO_DIR / "tests" / "missing-calibration.json"
        rendered = build_config.build_config(
            PICO_DIR / "profiles" / "bench-motor.py",
            missing,
        )
        self.assertIn('PROFILE = "bench-motor"', rendered)
        self.assertIn("CURRENT_SENSOR_CONFIGURED = False", rendered)
        with self.assertRaises(ValueError):
            build_config.build_config(
                PICO_DIR / "profiles" / "motor-commissioning.py",
                missing,
            )


class BenchMotorCliTests(unittest.TestCase):
    def bench_args(self, **overrides):
        values = {
            "command": "bench-pulse",
            "confirm_no_driver": False,
            "confirm_motor_safe": False,
            "confirm_bench_motor": True,
            "duty": 5,
            "milliseconds": 800,
            "cycles": 1,
            "seconds": 1,
        }
        values.update(overrides)
        return argparse.Namespace(**values)

    def test_confirmation_is_mandatory(self):
        with self.assertRaisesRegex(RuntimeError, "confirm-bench-motor"):
            cli.validate(self.bench_args(confirm_bench_motor=False))

    def test_duration_above_one_second_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "50..1000"):
            cli.validate(self.bench_args(milliseconds=1_001))

    def test_cli_rejects_duty_above_absolute_limit(self):
        with self.assertRaisesRegex(RuntimeError, "1..20"):
            cli.validate(self.bench_args(duty=21))

    def test_wrong_active_profile_is_rejected(self):
        response = [
            BENCH_STATUS[0].replace(
                "profile=bench-motor", "profile=motor-commissioning"
            )
        ]
        with self.assertRaisesRegex(RuntimeError, "not bench-motor"):
            cli.require_bench_status(response)

    def test_both_directions_have_opposite_signed_drive(self):
        self.assertEqual(cli.bench_drive_value("starboard", 5), 0.05)
        self.assertEqual(cli.bench_drive_value("port", 5), -0.05)
        self.assertEqual(motor_policy.direction_level(0.05), 1)
        self.assertEqual(motor_policy.direction_level(-0.05), 0)

    def test_exception_during_command_always_attempts_stop(self):
        frames = []

        def failing_send(_port, frame):
            frames.append(frame)
            if frame.startswith("C,"):
                raise OSError("simulated serial failure")

        with (
            mock.patch.object(cli, "query", return_value=BENCH_STATUS),
            mock.patch.object(cli, "rearm"),
            mock.patch.object(cli, "send", side_effect=failing_send),
            mock.patch.object(cli.time, "sleep"),
        ):
            with self.assertRaises(OSError):
                cli.bench_drive_for(object(), "starboard", 5, 800)

        self.assertIn("C,0,0.050,1", frames)
        self.assertGreaterEqual(frames.count("X"), 1)

    def test_stop_rejects_nonzero_pwm(self):
        _status, values = cli.status_values(
            [BENCH_STATUS[0].replace("pwm_output=0.000", "pwm_output=0.050")]
        )
        with self.assertRaisesRegex(RuntimeError, "PWM output is not zero"):
            cli.require_stopped(values)

    def test_direction_sequence_attempts_stop_after_exception(self):
        with (
            mock.patch.object(cli, "bench_stop"),
            mock.patch.object(
                cli, "bench_drive_for", side_effect=RuntimeError("simulated")
            ),
            mock.patch.object(cli, "best_effort_stop") as stop,
        ):
            with self.assertRaisesRegex(RuntimeError, "simulated"):
                cli.bench_direction_test(object())
        stop.assert_called_once()

    def test_status_fails_when_firmware_does_not_answer(self):
        args = argparse.Namespace(command="status")
        with mock.patch.object(cli, "query", return_value=[]):
            with self.assertRaisesRegex(RuntimeError, "status frame"):
                cli.run(object(), args)


if __name__ == "__main__":
    unittest.main()
