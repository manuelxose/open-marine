# Marine Data Contract

Type-safe shared contract for Signal K paths, units, and data structures.

## Requirements

- Node.js 20 LTS

## Install

```bash
npm install
npm run build
```

## Paths (MVP)

- navigation.position
- navigation.speedOverGround
- navigation.courseOverGroundTrue
- navigation.headingTrue
- environment.depth.belowTransducer
- environment.wind.angleApparent
- environment.wind.speedApparent
- electrical.batteries.house.voltage
- electrical.batteries.house.current

## Units

- Angles: radians
- Speed: m/s
- Depth: m
- Voltage: V
- Current: A

## Example DataPoint

```json
{
  "path": "navigation.headingTrue",
  "value": 1.57,
  "timestamp": "2026-01-24T22:10:00.000Z",
  "source": {
    "label": "simulator",
    "type": "nmea0183"
  },
  "quality": "good"
}
```
