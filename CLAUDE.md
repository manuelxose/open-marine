# CLAUDE.md - AI Assistant Guide for Open Marine Instrumentation

This document provides context for AI assistants working with the Open Marine Instrumentation codebase.

## Project Overview

Open Marine Instrumentation is an open-source sailboat instrumentation platform built around **Signal K** (a standardized marine data format). It provides real-time visualization of navigation, environmental, and electrical data from marine sensors.

**Tech Stack:**
- **Frontend:** Angular 21.1 (standalone components)
- **Backend:** Node.js 20 LTS (TypeScript)
- **Maps:** MapLibre GL JS (WebGL-accelerated charts)
- **State:** Custom RxJS-based store (`DatapointStoreService`)
- **Testing:** Vitest with Angular testing utilities
- **Container:** Docker (Signal K server)

## Repository Structure

```
open-marine/
├── marine-data-contract/     # Shared TypeScript types and paths (npm package)
├── marine-data-simulator/    # Node.js data generator for testing
├── marine-sensor-gateway/    # Stub for real sensor adapters (NMEA0183/2000)
├── marine-instrumentation-ui/ # Angular dashboard application
├── signalk-runtime/          # Docker-based Signal K server
└── docs/                     # Architecture, data model, roadmap
```

### Package Dependencies

This is an npm monorepo with `file:` protocol dependencies:

```
marine-data-contract (zero dependencies, must build first)
    ↑
    ├── marine-data-simulator
    ├── marine-sensor-gateway
    └── marine-instrumentation-ui
```

**Build order matters:** Always build `marine-data-contract` before other packages.

## Development Commands

### Quick Start

```bash
# 1. Start Signal K server
cd signalk-runtime && docker compose up -d

# 2. Build the shared contract
cd ../marine-data-contract && npm install && npm run build

# 3. Run simulator (generates test data)
cd ../marine-data-simulator && npm install && npm run dev

# 4. Run Angular UI
cd ../marine-instrumentation-ui && npm install && npm start
```

### Common Commands

| Project | Command | Purpose |
|---------|---------|---------|
| **UI** | `npm start` | Dev server at http://localhost:4200 |
| **UI** | `npm run build` | Production build |
| **UI** | `npm run lint` | Run ESLint |
| **UI** | `npm test` | Run Vitest tests |
| **UI** | `npm run format` | Format with Prettier |
| **Simulator** | `npm run dev` | Run with tsx (hot reload) |
| **Contract** | `npm run build` | Compile TypeScript to dist/ |
| **Signal K** | `docker compose up -d` | Start server (port 3000) |

### Development URLs

- Signal K API/UI: `http://localhost:3000`
- Signal K WebSocket: `ws://localhost:3000/signalk/v1/stream`
- Angular app: `http://localhost:4200`
- Routes: `/dashboard`, `/chart`, `/instruments`, `/alarms`, `/diagnostics`, `/settings`

## Code Conventions

### TypeScript

- **Strict mode enabled** across all projects
- **No `any` types** - ESLint rule `@typescript-eslint/no-explicit-any: error`
- Target ES2022, module NodeNext (Node projects) or preserve (Angular)
- Use type imports: `import type { Foo } from './foo'`

### Formatting (Prettier)

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

### Angular Patterns

- **Standalone components** (no NgModules)
- **Lazy-loaded routes** via `loadComponent()`
- **inject() function** preferred over constructor injection
- **RxJS observables** with `$` suffix: `state$`, `track$`
- **Services** use `providedIn: 'root'` for singletons

### File Naming

- Components: `*.component.ts` or `*.page.ts` (routed pages)
- Services: `*.service.ts`
- Models/Types: `*.models.ts`, `*.types.ts`
- Tests: `*.spec.ts`

## Key Architecture Decisions

### Data Flow

```
Sensors → Gateway → Signal K Server → WebSocket → UI Store → Components
              ↑
         Simulator (for development)
```

### DataPoint Structure

All marine data uses the shared `DataPoint<T>` interface:

```typescript
interface DataPoint<T> {
  path: SignalKPath;          // e.g., "navigation.speedOverGround"
  value: T;                   // The measurement value
  timestamp: string;          // ISO 8601 UTC
  source?: SourceRef;         // Origin metadata
  quality?: 'good' | 'suspect' | 'bad';
}
```

### Unit Conventions (Internal)

- Angles: **radians**
- Speed: **m/s** (meters per second)
- Depth: **meters**
- Voltage/Current: **V/A**

Use `units.ts` helpers for conversions: `degToRad()`, `knotsToMetersPerSecond()`, etc.

### Signal K Paths (MVP)

```typescript
PATHS.navigation.position              // { latitude, longitude }
PATHS.navigation.speedOverGround       // m/s
PATHS.navigation.courseOverGroundTrue  // radians
PATHS.navigation.headingTrue           // radians
PATHS.environment.depth.belowTransducer // meters
PATHS.environment.wind.angleApparent   // radians
PATHS.environment.wind.speedApparent   // m/s
PATHS.electrical.batteries.house.voltage // V
PATHS.electrical.batteries.house.current // A
```

### State Management

The `DatapointStoreService` (`state/datapoints/datapoint-store.service.ts`) is the central state container:

```typescript
// Observe a specific path
store.observe<number>('navigation.speedOverGround').subscribe(...)

// Get current snapshot
const speed = store.get<number>('navigation.speedOverGround');

// Update with new data points
store.update(dataPoints);

// Track history for sparklines
store.observeHistory('navigation.speedOverGround').subscribe(...)
```

### Alarms Philosophy

- Alarms are **latched with hysteresis** to prevent chattering
- Acknowledgement subdues but does not clear
- Alarms clear only when signal returns to safe band beyond hysteresis threshold
- Example: depth alarm triggers < 3.0m, clears > 3.5m

## Important Files

### Configuration

| File | Purpose |
|------|---------|
| `marine-instrumentation-ui/angular.json` | Angular CLI configuration |
| `marine-instrumentation-ui/.eslintrc.cjs` | ESLint rules |
| `marine-instrumentation-ui/.prettierrc.json` | Prettier formatting |
| `*/tsconfig.json` | TypeScript compiler options |
| `signalk-runtime/docker-compose.yml` | Signal K container config |

### Core UI Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Angular bootstrap |
| `src/app/app.ts` | Root component |
| `src/app/app.routes.ts` | Route definitions |
| `src/app/app.config.ts` | Angular providers config |
| `src/app/state/datapoints/datapoint-store.service.ts` | Central state store |
| `src/app/data-access/signalk/signalk-client.service.ts` | WebSocket client |
| `src/app/data-access/chart/chart-map.service.ts` | MapLibre integration |

### Shared Contract

| File | Purpose |
|------|---------|
| `marine-data-contract/src/paths.ts` | Signal K path constants |
| `marine-data-contract/src/types.ts` | DataPoint, SourceRef interfaces |
| `marine-data-contract/src/units.ts` | Unit conversion utilities |
| `marine-data-contract/src/quality.ts` | Quality flag definitions |

## Testing

- **Framework:** Vitest with jsdom
- **Test files:** `*.spec.ts` alongside source files
- **Run tests:** `npm test` in UI project
- **Coverage:** Currently minimal, focus on navigation calculations

Test patterns:
```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

## Common Tasks

### Adding a New Signal K Path

1. Add path constant to `marine-data-contract/src/paths.ts`
2. Rebuild contract: `cd marine-data-contract && npm run build`
3. Add to simulator scenario if needed (`marine-data-simulator/src/scenarios/`)
4. Create UI component to display the value

### Adding a New Page/Route

1. Create page component in `src/app/pages/` or `src/app/features/`
2. Export as named export (e.g., `export class MyPage`)
3. Add lazy-loaded route in `src/app/app.routes.ts`
4. Add navigation link in app shell

### Creating a Shared Component

1. Create in `src/app/shared/components/`
2. Use standalone component pattern
3. Export from component file
4. Import directly where needed

### Modifying State

1. All state changes go through `DatapointStoreService.update()`
2. Components subscribe via `store.observe<T>(path)`
3. Use `distinctUntilChanged()` to prevent unnecessary renders

## Gotchas and Tips

1. **Contract build required:** After modifying `marine-data-contract`, run `npm run build` before other packages will see changes.

2. **Docker required for Signal K:** The simulator publishes to `http://localhost:3000`. Start the container first.

3. **WebSocket reconnection:** The Signal K client auto-reconnects with 3s delay. Check `signalk-client.service.ts` for connection status.

4. **Clock drift:** Timestamps are clamped if drift exceeds 2000ms. See `normalizeTimestamp()` in contract.

5. **MapLibre performance:** Map updates are throttled (200ms). Vessel track uses a ring buffer (max 1000 points).

6. **Angular signals:** The codebase uses RxJS observables, not Angular signals. Follow existing patterns.

7. **No NgModules:** All components are standalone. Import dependencies directly in component decorators.

## Documentation

- `/docs/architecture.md` - System diagram and responsibilities
- `/docs/data-model.md` - Units, data flow, Signal K payloads
- `/docs/roadmap.md` - Feature milestones
- `/README.md` - Quickstart guide
- Individual package READMEs for specific details

## Environment Requirements

- Node.js 20 LTS
- npm 10.9.2+
- Docker Desktop (Windows) or Docker Engine (Linux)
