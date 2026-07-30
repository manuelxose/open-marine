from __future__ import annotations

import importlib.util
import math
import sys
import types
import unittest
from pathlib import Path


def load_publisher_module():
    fake_icm20948 = types.ModuleType("icm20948")
    fake_icm20948.ICM20948 = object
    sys.modules.setdefault("icm20948", fake_icm20948)

    module_path = Path(__file__).with_name("02_publish_signalk.py")
    spec = importlib.util.spec_from_file_location("omi_imu_publish_signalk", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


publisher = load_publisher_module()


def magnetic_vector(heading_deg: float) -> tuple[float, float, float]:
    heading = math.radians(heading_deg)
    return (math.cos(heading), -math.sin(heading), 0.0)


def signed_degrees(angle: float) -> float:
    return math.degrees((angle + math.pi) % (2.0 * math.pi) - math.pi)


class ComplementaryFusionTest(unittest.TestCase):
    def test_stationary_bias_and_magnetic_noise_do_not_move_heading(self) -> None:
        fusion = publisher.ComplementaryFusion()
        samples: list[float] = []

        for index in range(100):
            mx, my, mz = magnetic_vector(1.0 if index % 2 == 0 else -1.0)
            _, _, yaw = fusion.update(
                0.0,
                0.0,
                9.80665,
                0.0,
                0.0,
                math.radians(0.3),
                mx,
                my,
                mz,
                0.1,
            )
            if index >= 40:
                samples.append(signed_degrees(yaw))

        self.assertLess(max(samples) - min(samples), 0.3)

    def test_roll_pitch_bias_does_not_mark_yaw_as_moving(self) -> None:
        fusion = publisher.ComplementaryFusion()
        mx, my, mz = magnetic_vector(0.0)
        for _ in range(5):
            fusion.update(
                0.0,
                0.0,
                9.80665,
                math.radians(4.0),
                math.radians(-5.0),
                math.radians(0.3),
                mx,
                my,
                mz,
                0.1,
            )

        self.assertEqual(fusion.yaw_motion_samples, 0)

    def test_real_rotation_keeps_fast_gyro_response(self) -> None:
        fusion = publisher.ComplementaryFusion()
        mx, my, mz = magnetic_vector(0.0)
        fusion.update(0.0, 0.0, 9.80665, 0.0, 0.0, 0.0, mx, my, mz, 0.1)

        yaw = 0.0
        for step in range(1, 6):
            mx, my, mz = magnetic_vector(step * 3.0)
            _, _, yaw = fusion.update(
                0.0,
                0.0,
                9.80665,
                0.0,
                0.0,
                math.radians(30.0),
                mx,
                my,
                mz,
                0.1,
            )

        self.assertGreater(signed_degrees(yaw), 14.0)


if __name__ == "__main__":
    unittest.main()
