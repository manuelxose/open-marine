"""NMEA 0183 wind parsing shared by the Raspberry publisher and tests."""

from __future__ import annotations

import math
from dataclasses import dataclass

KNOT_TO_MPS = 0.514444
KMH_TO_MPS = 1.0 / 3.6


@dataclass(frozen=True)
class WindReading:
    speed_mps: float
    angle_rad: float
    reference: str  # apparent | true-relative | true-ground


def checksum(payload: str) -> int:
    value = 0
    for character in payload:
        value ^= ord(character)
    return value


def split_sentence(raw: str) -> tuple[str, list[str]]:
    sentence = raw.strip()
    if not sentence.startswith("$"):
        raise ValueError("sentence must start with '$'")

    body_and_checksum = sentence[1:].split("*", 1)
    body = body_and_checksum[0]
    if not body:
        raise ValueError("empty NMEA sentence")
    if len(body_and_checksum) == 2:
        expected = int(body_and_checksum[1][:2], 16)
        actual = checksum(body)
        if expected != actual:
            raise ValueError("invalid NMEA checksum")

    fields = body.split(",")
    sentence_id = fields[0][-3:].upper()
    return sentence_id, fields[1:]


def speed_to_mps(value: str, unit: str) -> float:
    speed = float(value)
    normalized = unit.strip().upper()
    if normalized == "N":
        return speed * KNOT_TO_MPS
    if normalized == "K":
        return speed * KMH_TO_MPS
    if normalized == "M":
        return speed
    raise ValueError(f"unsupported wind speed unit: {unit}")


def parse_wind_sentence(raw: str) -> WindReading | None:
    sentence_id, fields = split_sentence(raw)
    if sentence_id == "MWV":
        if len(fields) < 5:
            raise ValueError("incomplete MWV sentence")
        angle, reference, speed, unit, status = fields[:5]
        if status.strip().upper() != "A":
            return None
        ref = reference.strip().upper()
        if ref not in {"R", "T"}:
            raise ValueError(f"unsupported MWV reference: {reference}")
        return WindReading(
            speed_mps=speed_to_mps(speed, unit),
            angle_rad=math.radians(float(angle) % 360.0),
            reference="apparent" if ref == "R" else "true-relative",
        )

    if sentence_id == "MWD":
        if len(fields) < 8:
            raise ValueError("incomplete MWD sentence")
        true_degrees = fields[0]
        speed_knots = fields[4]
        speed_mps = fields[6]
        if not true_degrees:
            raise ValueError("MWD true direction is missing")
        if speed_mps:
            speed = float(speed_mps)
        elif speed_knots:
            speed = speed_to_mps(speed_knots, "N")
        else:
            raise ValueError("MWD speed is missing")
        return WindReading(
            speed_mps=speed,
            angle_rad=math.radians(float(true_degrees) % 360.0),
            reference="true-ground",
        )

    return None


def reading_to_signalk_values(reading: WindReading) -> list[dict[str, float]]:
    if reading.reference == "apparent":
        return [
            {"path": "environment.wind.angleApparent", "value": reading.angle_rad},
            {"path": "environment.wind.speedApparent", "value": reading.speed_mps},
        ]
    if reading.reference == "true-relative":
        return [
            {"path": "environment.wind.angleTrueWater", "value": reading.angle_rad},
            {"path": "environment.wind.speedTrue", "value": reading.speed_mps},
        ]
    return [
        {"path": "environment.wind.angleTrueGround", "value": reading.angle_rad},
        {"path": "environment.wind.directionTrue", "value": reading.angle_rad},
        {"path": "environment.wind.speedTrue", "value": reading.speed_mps},
    ]
