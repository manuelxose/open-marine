# Data Model

## Unit conventions

- Angles: radians (internal)
- Speed: meters per second (m/s)
- Depth: meters (m)
- Voltage: volts (V)
- Current: amps (A)

## Data flow

```
Sensors/Simulators
     |
     |  (SourceRef + Timestamp + QualityFlag)
     v
Signal K Server
     |
     |  REST / WebSocket delta stream
     v
Consumers (UI, loggers, analytics)
```

## Path list (MVP)

- navigation.position
- navigation.speedOverGround
- navigation.courseOverGroundTrue
- navigation.headingTrue
- environment.depth.belowTransducer
- environment.wind.angleApparent
- environment.wind.speedApparent
- electrical.batteries.house.voltage
- electrical.batteries.house.current

## Example payloads

### DataPoint JSON

```json
{
  "path": "navigation.speedOverGround",
  "value": 3.2,
  "timestamp": "2026-01-24T22:10:00.000Z",
  "source": {
    "label": "simulator",
    "type": "nmea0183"
  },
  "quality": "good"
}
```

### Signal K delta update

```json
{
  "context": "vessels.self",
  "updates": [
    {
      "source": { "label": "simulator" },
      "timestamp": "2026-01-24T22:10:00.000Z",
      "values": [
        { "path": "navigation.speedOverGround", "value": 3.2 }
      ]
    }
  ]
}
```

## Quality lifecycle

```
good  -->  suspect  -->  bad
  ^          |          |
  |          |          |
  +----------+----------+
      explicit reset
```

Rules:
- Degradation follows `good -> suspect -> bad` with no skipping.
- Recovery to `good` is explicit (source reset or manual override).

## SourceRef rules

- `priority`: higher values are preferred when multiple sources provide the same path.
- `fallback`: label of the preferred fallback source when the primary becomes invalid.
- `validityTimeoutMs`: time after the last update when the source is considered stale.

Defaults:
- `priority`: 0
- `validityTimeoutMs`: 10_000 ms

## Timestamp normalization and clock drift

Rules:
- All timestamps are normalized to ISO 8601 UTC strings.
- If the timestamp is invalid or the drift exceeds `DEFAULT_MAX_CLOCK_DRIFT_MS` (2_000 ms),
  the timestamp is clamped to the local clock time.

## Unit conversion helpers

- `degToRad` / `radToDeg`
- `knotsToMetersPerSecond` / `metersPerSecondToKnots`

## True wind calculation (TWA/TWS)

Coordinate system:
- Heading and COG are radians clockwise from true north.
- Boat frame uses forward (x) and starboard (y).

Formulas:

```
V_aw_forward = AWS * cos(AWA)
V_aw_starboard = AWS * sin(AWA)

V_aw_north = V_aw_forward * cos(Heading) - V_aw_starboard * sin(Heading)
V_aw_east  = V_aw_forward * sin(Heading) + V_aw_starboard * cos(Heading)

V_boat_north = SOG * cos(COG)
V_boat_east  = SOG * sin(COG)

V_true = V_aw + V_boat
TWS = sqrt(V_true_north^2 + V_true_east^2)
TWD = atan2(V_true_east, V_true_north)
TWA = wrap_pi(TWD - Heading)
```

Validation rules:
- If AWA/AWS are invalid, TWA/TWS are not computed.
- If SOG is below 0.3 m/s, TWA/TWS are suppressed (low-speed edge case).
- If heading is invalid, fall back to COG; if both are invalid, TWA/TWS are not computed.
