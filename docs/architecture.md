# Architecture

## System diagram

```
+----------------------+        +-----------------------+
| marine-data-simulator|  HTTP  |  Signal K Server      |
| (Node/TS)            +------->|  signalk-runtime      |
+----------+-----------+        +----------+------------+
           ^                               |
           | Contract Types/Paths          | WebSocket/REST
+----------+-----------+        +----------+------------+
| marine-data-contract |        | marine-instrumentation|
| (TS package)         |        | -ui (Angular)         |
+----------+-----------+        +-----------------------+
           ^
           | DataPoint/paths
+----------+-----------+
| marine-sensor-gateway|
| (stub adapters)      |
+----------+-----------+
           ^
           | NMEA0183 / NMEA2000 / Serial
     Physical sensors
```

## Responsibilities

- signalk-runtime: Dockerized Signal K server, persistent data, and networking.
- marine-data-contract: Shared type-safe paths, units, and quality flags.
- marine-data-simulator: Generates simulated navigation, wind, depth, and electrical data and publishes to Signal K.
- marine-instrumentation-ui: Reads from Signal K REST + WebSocket and renders a dashboard.
- marine-sensor-gateway: Stub module for real sensor adapters that will publish to Signal K using the contract.

## Chart engine: MapLibre

- The /chart page uses MapLibre GL JS (WebGL) for pan/zoom/rotate and GPU-accelerated rendering.
- Chart sources are registered in `marine-instrumentation-ui/src/app/data-access/chart/chart-sources.ts` with OSM raster as the default development base map.
- Vessel, track, and vector overlays are GeoJSON sources/layers updated in place for smooth performance.
- The chart service is structured to swap in raster XYZ tiles, vector MVT styles, or locally served MBTiles later.

## Reproducibility

- Node 20 LTS recommended for all Node/TS modules.
- Docker Desktop (Windows) or Docker Engine (Ubuntu) for Signal K.

## Alarm philosophy

- Alarms are latched with hysteresis to prevent chattering in borderline conditions.
- Acknowledgement reduces visual intensity but does not clear the alarm.
- Alarms clear only when the signal returns to a safe band beyond the hysteresis threshold.
- Visual priority: active alarms override normal status cues; acknowledged alarms remain visible but subdued.

## Electrical assumptions

- NMEA0183 uses differential RS-422 signaling (typical 4800 or 38400 baud). Use proper line drivers and isolation.
- NMEA2000 uses CAN at 250 kbps on a 9-16 V bus with 120 ohm termination at each end.
- Custom serial sensors must declare electrical levels (TTL, RS-232, RS-422) and use appropriate level shifting.
- Grounding and isolation should prevent ground loops between sensor networks and the compute host.

## Timing assumptions

- Timestamp as close to sensor ingress as possible; prefer GPS or NTP disciplined host clocks.
- Clock drift beyond 2 seconds is clamped to local time per the contract normalization rules.
- Typical update rates: 1 Hz navigation, 1-5 Hz environmental, 0.2-1 Hz electrical; adapters must expose actual rates.
- Gateway validity timeouts use `SourceRef.validityTimeoutMs` to mark stale data before consumers react.
