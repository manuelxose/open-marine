# GitHub Copilot Instructions for Open Marine Instrumentation

## Project Context

**Open Marine Instrumentation** is a real-time sailboat dashboard platform built on Signal K (marine data standard). It streams live navigation, environmental, and electrical data from sensors via Signal K to an Angular dashboard with MapLibre charts.

**Monorepo structure (build order matters):**
- `marine-data-contract` → types, paths, utilities (npm package)
- `marine-data-simulator` → Node.js test data generator
- `marine-instrumentation-ui` → Angular 21.1 dashboard (depends on contract)
- `marine-sensor-gateway` → stub interfaces for real adapters (NMEA0183/2000)
- `signalk-runtime` → Docker Signal K server

## Critical Architecture Patterns

### State Management: DatapointStoreService (Active Pattern)

The **central source of truth** for all live marine data in the UI:
- Located: [marine-instrumentation-ui/src/app/state/datapoints/datapoint-store.service.ts](../marine-instrumentation-ui/src/app/state/datapoints/datapoint-store.service.ts)
- BehaviorSubject-based store with `state$` observable
- Stores `DataPoint<T>` (value + timestamp + quality) in a Map
- Auto-tracks history (ringbuffer) for selected paths: SOG, apparent wind speed, depth, battery voltage
- Tracks vessel position for chart overlay

**Usage pattern:**
```typescript
// In any component/service:
constructor(private store: DatapointStoreService) {}
this.store.state$.pipe(
  map(state => state.get(PATHS.navigation.speedOverGround)?.value)
).subscribe(sog => { /* update UI */ })
```

**⚠️ Known Issue**: Alarms and Diagnostics pages still inject old `DataStoreService` (dead code) instead of DatapointStoreService. This is **critical and broken**. See _Priority Fixes_ below.

### WebSocket Integration: SignalKClientService

- Located: [marine-instrumentation-ui/src/app/data-access/signalk/signalk-client.service.ts](../marine-instrumentation-ui/src/app/data-access/signalk/signalk-client.service.ts)
- Connects via `webSocket()` to `ws://localhost:3000/signalk/v1/stream`
- Receives Delta messages (path-value pairs with timestamps)
- Uses `signalk-mapper.ts` to normalize and inject into DatapointStoreService

**Type safety enforced**: Path strings are validated against `PATHS` constant from contract.

## Code Patterns & Conventions

### TypeScript Rules (Strict Mode Enforced)
- ✅ **Type imports**: `import type { Foo } from './foo'`
- ❌ **No `any` types** (ESLint: `@typescript-eslint/no-explicit-any: error`)
- ✅ **ES2022 target** (modern syntax, Nullish coalescing, Optional chaining)
- ✅ **Readonly properties** where data is immutable

### Formatting (Prettier)
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```
Run `npm run format` to auto-fix.

### Angular Patterns (Standalone Components)
- Standalone components (no NgModules)
- Dependency injection via `constructor(private service: MyService)`
- Routes in [app.routes.ts](../marine-instrumentation-ui/src/app/app.routes.ts):
  - `/dashboard` → dashboard feature module
  - `/chart` → MapLibre chart viewer
  - `/instruments` → individual instrument displays
  - `/alarms` (BROKEN - do not use)
  - `/diagnostics` (BROKEN - do not use)
  - `/settings` → user preferences

### Data Model: DataPoint<T>
```typescript
interface DataPoint<T> {
  path: string;        // e.g., 'navigation.speedOverGround'
  value: T;            // strongly typed (number, Position, etc.)
  timestamp: number;   // milliseconds
  quality: QualityFlag; // 'good', 'suspect', 'bad'
  sourceRef: SourceRef; // device/method + validity timeout
}
```

Signal K paths are type-safe via `PATHS` constant. **Do not use raw strings**—always import from contract.

## Common Development Workflows

### Setup (First Time)
```bash
# 1. Start Signal K server (Docker)
cd signalk-runtime && docker compose up -d

# 2. Build contract (must be first!)
cd ../marine-data-contract && npm install && npm run build

# 3. Install UI dependencies and start dev server
cd ../marine-instrumentation-ui && npm install && npm start
# Runs on http://localhost:4200

# 4. (Optional) In another terminal, run simulator
cd ../marine-data-simulator && npm install && npm run dev
```

### Building & Testing
| Task | Command | Location |
|------|---------|----------|
| Lint all | `npm run lint` | any package dir |
| Format | `npm run format` | any package dir |
| Build (production) | `npm run build` | UI only |
| Run tests | `npm run test` | UI only (Vitest) |
| Watch build | `npm run watch` | UI only |

### After Modifying Contract
The contract changes must be **rebuilt and reinstalled** before other packages:
```bash
cd marine-data-contract && npm run build
cd ../marine-instrumentation-ui && npm install  # re-links file: dependency
```

## Data Flow Examples

### Example: Display Wind Speed in a Component
```typescript
// Import path (type-safe)
import { PATHS } from '@omi/marine-data-contract';

export class WindInstrumentComponent {
  windSpeed$ = this.store.state$.pipe(
    map(state => state.get(PATHS.environment.wind.speedApparent)?.value),
    distinctUntilChanged()
  );

  constructor(private store: DatapointStoreService) {}
}
```

### Example: Subscribe to Track Points
```typescript
// For chart rendering, vessel track comes from store
trackPoints$ = this.store.track$; // ObservableArray<TrackPoint>
```

## Known Issues & Priorities

### 🔴 CRITICAL: Alarms & Diagnostics Broken
- **Files**: [alarms/](../marine-instrumentation-ui/src/app/pages/alarms), [diagnostics/](../marine-instrumentation-ui/src/app/pages/diagnostics)
- **Root Cause**: These pages inject `DataStoreService` (old, unmaintained) instead of `DatapointStoreService` (active)
- **Impact**: Alarms never trigger, diagnostics show no data
- **Fix**: Migrate both to inject and subscribe from `DatapointStoreService`

### 🟡 Unit Inconsistency in Simulator
- **File**: [marine-data-simulator/src/scenarios/basicCruise.ts](../marine-data-simulator/src/scenarios/basicCruise.ts)
- **Issue**: COG published in degrees, heading in radians
- **Expected**: All angles in radians per contract specification
- **Fix**: Add `toDegrees()` conversion before publishing heading, OR vice versa

### 🟡 Dead Code Accumulation (~800 lines)
- `/services/signalk-client.service.ts` (207 lines, old client—use [data-access/signalk/signalk-client.service.ts](../marine-instrumentation-ui/src/app/data-access/signalk/signalk-client.service.ts) instead)
- `/services/data-store.service.ts` (~100 lines, legacy store)
- `/data-access/chart/chart-map.service.ts` (621 lines, old chart engine)
- `/pages/dashboard/` and `/pages/chart/` legacy implementations
- `/ui/components/` duplicated components

**These should be removed once Alarms/Diagnostics are migrated.**

### 🟢 Missing PATHS Definition
- Signal K path `navigation.headingMagnetic` used in UI but not defined in contract
- Should add to [marine-data-contract/src/paths.ts](../marine-data-contract/src/paths.ts) or remove usage

## External Systems & Integration Points

### Signal K Server
- **URL**: `http://localhost:3000` (API), `ws://localhost:3000/signalk/v1/stream` (WebSocket)
- **Startup**: `docker compose up -d` from signalk-runtime/
- **Provides**: Live marine data delta messages, REST API, chart base maps
- **Used by**: SignalKClientService for WebSocket stream

### MapLibre GL JS
- **Version**: 5.16.0
- **File**: [marine-instrumentation-ui/src/app/data-access/chart/chart-sources.ts](../marine-instrumentation-ui/src/app/data-access/chart/chart-sources.ts)
- **Configuration**: OSM raster tiles (development), structure ready for MBTiles/MVT later
- **Overlays**: Vessel position, track (GeoJSON), waypoints updated in-place for performance

### RxJS Observables
- **Pattern**: Heavy use of `map`, `filter`, `distinctUntilChanged`, `bufferTime` for efficient data flow
- **No unsubscribe patterns**: Use `takeUntilDestroyed()` or AsyncPipe (preferred)

## When to Modify Each Package

| Package | When | Examples |
|---------|------|----------|
| `marine-data-contract` | Adding new Signal K paths, units, or quality enums | Add depth path, battery voltage formula |
| `marine-data-simulator` | Testing new data patterns, scenarios, or edge cases | Shallow water event, battery discharge curve |
| `marine-instrumentation-ui` | UI features, components, dashboards, visualizations | New instrument display, settings page |
| `marine-sensor-gateway` | Planning real hardware adapters (not yet implemented) | NMEA0183 parser, CAN reader |
| `signalk-runtime` | Docker configuration, server plugins, security | Port changes, new data providers |

---

**Last Updated**: 2026-01-28 | See [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md) for detailed technical analysis.
