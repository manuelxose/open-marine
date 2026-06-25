import math
import unittest

from wind_nmea import parse_wind_sentence, reading_to_signalk_values


class WindNmeaTest(unittest.TestCase):
    def test_mwv_apparent_knots(self) -> None:
        reading = parse_wind_sentence("$WIMWV,045.0,R,10.0,N,A")
        self.assertIsNotNone(reading)
        assert reading is not None
        self.assertEqual(reading.reference, "apparent")
        self.assertAlmostEqual(reading.speed_mps, 5.14444, places=5)
        self.assertAlmostEqual(reading.angle_rad, math.pi / 4)
        paths = {item["path"] for item in reading_to_signalk_values(reading)}
        self.assertEqual(
            paths,
            {"environment.wind.angleApparent", "environment.wind.speedApparent"},
        )

    def test_mwv_invalid_status_is_ignored(self) -> None:
        self.assertIsNone(parse_wind_sentence("$WIMWV,045.0,R,10.0,N,V"))

    def test_mwd_uses_true_direction_and_mps(self) -> None:
        reading = parse_wind_sentence("$WIMWD,270.0,T,265.0,M,12.0,N,6.2,M")
        self.assertIsNotNone(reading)
        assert reading is not None
        self.assertEqual(reading.reference, "true-ground")
        self.assertAlmostEqual(reading.speed_mps, 6.2)
        self.assertAlmostEqual(reading.angle_rad, math.radians(270))

    def test_invalid_checksum_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "checksum"):
            parse_wind_sentence("$WIMWV,045.0,R,10.0,N,A*00")

    def test_kmh_conversion(self) -> None:
        reading = parse_wind_sentence("$WIMWV,180.0,R,36.0,K,A")
        assert reading is not None
        self.assertAlmostEqual(reading.speed_mps, 10.0)


if __name__ == "__main__":
    unittest.main()
