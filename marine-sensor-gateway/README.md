# Marine Sensor Gateway (Stub)

This module defines adapter interfaces for real marine sensors and provides a stub gateway shell. The intent is to normalize raw sensor data into the shared contract and publish to Signal K without changing the UI.

## Requirements

- Node.js 20 LTS

## Quickstart

```bash
npm install
npm run build
npm run dev
```

## Adapter interfaces

- NMEA0183: `Nmea0183Adapter`, `Nmea0183Sentence`.
- NMEA2000: `Nmea2000Adapter`, `Nmea2000Frame`.
- Custom serial sensors: `CustomSerialAdapter`, `CustomSerialFrame`.

## Integration expectations

- Adapters produce raw frames or sentences; the gateway maps them to `DataPoint<T>`.
- Signal K paths are taken from `@omi/marine-data-contract` to keep downstream consumers stable.

## Status

This is a stub only. Hardware I/O and Signal K publishing will be implemented in a later iteration.
