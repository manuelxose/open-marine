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

## UI Application Architecture (marine-instrumentation-ui)

The UI follows a strict layered architecture to prevent monolithic growth and ensure maintainability.

### Layered Dependencies
Boundaries are enforced via ESLint rules and path aliases. Dependency flow is **downward** only:
1.  **Features**: High-level page features (e.g., `@features/chart`, `@features/dashboard`).
2.  **UI**: Shared presentational components (`@ui/*`).
3.  **Data Access**: External API/SignalK clients (`@data-access/*`).
4.  **State**: Application state and pure logic (`@state/*`).
5.  **Core**: Infrastructure, preferences, and theme (`@core/*`).

### Pattern: Facade + Presentational
- **Facades**: Orchestrate data from the state and data-access layers. They provide a high-level API for features.
- **Presentational Components**: Receive data via `@Input` and emit events via `@Output`. They have no knowledge of the state management system.

### Public APIs
Each module must expose a `public-api.ts` or `index.ts`. Deep imports into a module's internals are prohibited.
- Correct: `import { AlarmStoreService } from '@state/alarms';`
- Incorrect: `import { AlarmStoreService } from '../../state/alarms/alarm-store.service';`

### CI Pipeline
The codebase is guarded by a CI pipeline:
- `npm run lint`: Enforces type safety and module boundaries.
- `npm run test:ci`: Runs unit tests in headless mode.
- `npm run build`: Verifies the production bundle.

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
