# CLAUDE.md - AI Assistant Guide for Open Marine Instrumentation

**Last Updated:** 2026-01-28

This document provides context for AI assistants working with the Open Marine Instrumentation codebase.

---

## Quick Facts About This Project

| Aspect | Details |
|--------|---------|
| **Purpose** | Real-time marine instrumentation dashboard for sailboats |
| **Status** | MVP with working dashboard, chart, and instrument displays |
| **Tech Stack** | Angular 21.1 + MapLibre GL JS + Node.js 20 + TypeScript 5.5 |
| **Data Source** | Signal K (WebSocket/REST) or simulated data |
| **Critical State** | DatapointStoreService (single source of truth) |
| **Active Routes** | /dashboard, /chart, /instruments, /alarms, /diagnostics, /settings |

---

## Project Overview

Open Marine Instrumentation is an open-source sailboat instrumentation platform built around **Signal K** (a standardized marine data format). It provides real-time visualization of navigation, environmental, and electrical data from marine sensors.

**Tech Stack:**
- **Frontend:** Angular 21.1 (standalone components, Signal K client via WebSocket)
- **Backend:** Node.js 20 LTS (TypeScript 5.5.4)
- **Maps:** MapLibre GL JS 5.16.0 (WebGL vessel tracking, route planning)
- **State Management:** Custom RxJS-based store (`DatapointStoreService`)
- **Testing:** Vitest 4.0.8 with Angular utilities
- **Container Runtime:** Docker (Signal K server v4.x)
- **Build Tools:** Angular CLI 21.1.1, esbuild, tsx

---

## Repository Structure

```
open-marine/
├── marine-data-contract/          # TS types, Signal K paths, units (v0.1.0)
│   ├── src/
│   │   ├── index.ts               # Exports all types and paths
│   │   ├── types.ts               # DataPoint<T>, Position, SourceRef, QualityFlag
│   │   ├── paths.ts               # PATHS constant (type-safe Signal K paths)
│   │   ├── units.ts               # Unit conversion (deg↔rad, knots↔m/s)
│   │   └── quality.ts             # Quality state machine
│   └── dist/ (compiled)
│
├── marine-data-simulator/         # Data generator for testing (v0.1.0)
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── engine/
│   │   │   └── simulatorEngine.ts # Main event loop (1 Hz)
│   │   ├── publishers/
│   │   │   ├── publisher.ts       # Interface
│   │   │   ├── httpPublisher.ts   # HTTP POST (dead code)
│   │   │   └── wsPublisher.ts     # WebSocket (unused)
│   │   └── scenarios/
│   │       ├── scenario.ts        # Interface
│   │       └── basicCruise.ts     # Default scenario
│   └── dist/ (compiled)
│
├── marine-sensor-gateway/         # Sensor adapter stubs (v0.1.0)
│   ├── src/
│   │   ├── cli.ts                 # Entry point
│   │   ├── gateway.ts             # Main class
│   │   ├── adapters/
│   │   │   ├── base.ts            # Adapter interface
│   │   │   ├── nmea0183.ts        # NMEA0183 parser (stub)
│   │   │   ├── nmea2000.ts        # NMEA2000/CAN (stub)
│   │   │   └── custom-serial.ts   # Generic serial (stub)
│   │   └── index.ts
│   └── dist/ (compiled)
│
├── marine-instrumentation-ui/     # Angular dashboard app (v0.0.0)
│   ├── src/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── styles.scss            # Global styles
│   │   └── app/
│   │       ├── app.ts             # Root component
│   │       ├── app.routes.ts       # Lazy-loaded routes
│   │       ├── app.config.ts       # Providers, interceptors
│   │       ├── core/               # Infrastructure layer
│   │       │   ├── config/         # Environment tokens
│   │       │   ├── formatting/     # Unit formatters
│   │       │   ├── calculations/   # Math utilities
│   │       │   ├── services/       # Layout, theme, preferences
│   │       │   └── theme/          # Theme service
│   │       ├── data-access/        # External API layer
│   │       │   ├── signalk/        # Signal K WebSocket client
│   │       │   └── chart/          # Chart data sources
│   │       ├── state/              # Central state (SINGLE SOURCE OF TRUTH)
│   │       │   ├── datapoints/     # DatapointStoreService
│   │       │   └── calculations/   # Selectors, computed values
│   │       ├── features/           # Lazy-loaded feature modules
│   │       │   ├── dashboard/      # Main display
│   │       │   ├── chart/          # MapLibre vessel tracker
│   │       │   ├── instruments/    # Instrument panel display
│   │       │   ├── alarms/         # Alarm list
│   │       │   └── diagnostics/    # System diagnostics
│   │       ├── pages/              # Legacy page components
│   │       │   └── settings/       # Settings page
│   │       ├── shared/             # Reusable components
│   │       │   └── components/     # Sparkline, panel-card, etc.
│   │       ├── services/           # ⚠️ LEGACY (mix of active/dead)
│   │       ├── ui/                 # ⚠️ LEGACY (mostly dead)
│   │       └── environments/       # Runtime config
│   ├── public/                    # Static assets
│   ├── angular.json               # Angular build config
│   ├── tsconfig.*.json            # TS compiler configs
│   ├── package.json               # Dependencies
│   └── mock-server.js             # Local dev server stub
│
├── signalk-runtime/               # Docker container
│   ├── docker-compose.yml         # Service definition
│   ├── data/
│   │   ├── package.json
│   │   └── plugin-config-data/    # Plugin configs (course-provider, etc.)
│   └── README.md
│
├── docs/
│   ├── PROJECT_STATE.md           # ⚠️ DO NOT MODIFY (system state)
│   ├── architecture.md            # System design
│   ├── data-model.md              # Data types and Signal K paths
│   ├── roadmap.md                 # Development roadmap
│   └── screenshots/
│
├── README.md                      # Quick start guide
└── CLAUDE.md                      # THIS FILE
```

### Package Dependencies & Build Order

This is an npm monorepo with `file:` protocol dependencies:

```
marine-data-contract (v0.1.0)
    ↑ (zero external dependencies)
    ├── marine-data-simulator
    ├── marine-sensor-gateway
    └── marine-instrumentation-ui
            ↑
            ├── Angular 21.1
            ├── MapLibre GL JS 5.16
            ├── RxJS 7.8
            └── TypeScript 5.9

Signal K Runtime (Docker, independent)
    ↑ (depends on nothing)
```

**IMPORTANT: Build order matters**
1. `marine-data-contract` must build first (other packages import from it)
2. All others can build in parallel after contract is ready

---

## Development Commands

### Quick Start (5 minutes)

```bash
# 1. Start Signal K server (one terminal)
cd signalk-runtime
docker compose up -d
# Verify: http://localhost:3000

# 2. Build contract + simulator (another terminal)
cd ../marine-data-contract && npm install && npm run build
cd ../marine-data-simulator && npm install && npm run dev

# 3. Start UI (third terminal)
cd ../marine-instrumentation-ui && npm install && npm start
# Navigate to http://localhost:4200
```

### Common Development Commands

| Project | Command | Purpose | Output |
|---------|---------|---------|--------|
| **Contract** | `npm run build` | Compile TS → JS | `dist/` folder |
| **Contract** | `npm run lint` | Check code quality | ESLint report |
| **Simulator** | `npm run dev` | Run with hot reload | Publishes to Signal K HTTP |
| **Simulator** | `npm run build` | Compile to `dist/` | Distribution package |
| **Gateway** | `npm run dev` | Run CLI | Adapter interfaces (stub) |
| **UI** | `npm start` | Dev server with HMR | http://localhost:4200 |
| **UI** | `npm run build` | Production build | `dist/` folder |
| **UI** | `npm run lint` | Check Angular + TS | ESLint report |
| **UI** | `npm test` | Run Vitest suite | Test results |
| **UI** | `npm run format` | Format code | Prettier auto-fix |
| **Signal K** | `docker compose up -d` | Start container | Port 3000 (HTTP+WS) |
| **Signal K** | `docker compose logs -f` | View logs | Container output |

### Development URLs (after `npm start` in UI)

- **Signal K Dashboard:** http://localhost:3000
- **Signal K REST API:** http://localhost:3000/signalk/v1
- **Signal K WebSocket:** ws://localhost:3000/signalk/v1/stream
- **Angular App:** http://localhost:4200
  - Dashboard: http://localhost:4200/dashboard
  - Chart: http://localhost:4200/chart
  - Instruments: http://localhost:4200/instruments
  - Alarms: http://localhost:4200/alarms
  - Diagnostics: http://localhost:4200/diagnostics
  - Settings: http://localhost:4200/settings

---

## Code Conventions & Standards

### TypeScript

- **Strict mode enabled** in all `tsconfig.json` files
- **No `any` types** - ESLint enforces `@typescript-eslint/no-explicit-any: error`
- **Type-safe imports** - Use `import type { Foo }` for types
- **Target:** ES2022 for Node projects, ES2022 with preserve for Angular
- **Module:** NodeNext for Node projects, ES2022 for Angular
- **All files must compile without warnings**

### Code Style (Prettier)

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

Run `npm run format` before committing code.

### Angular Patterns

- **Standalone Components Only** - No NgModules
- **Lazy Loading** - Features loaded via `loadComponent` in routes
- **RxJS Observables** - Data flows via Observables, not promises
- **Services in `/state/` layer** - Central state via `DatapointStoreService`
- **Facade Pattern** - Feature services aggregate state + data access
- **No Global Store Library** - Custom RxJS implementation, not NgRx
- **Type-safe routing** - Routed components defined in `app.routes.ts`

### Folder Structure for Features

Each feature in `/features/` follows this pattern:

```
/features/{feature-name}/
├── {feature-name}.page.ts          # Route-level component
├── {feature-name}-facade.service.ts # Orchestrates state + data
├── components/                      # Feature-specific UI
│   └── {component-name}/
│       ├── {component-name}.component.ts
│       └── {component-name}.component.html
├── types/                           # Feature types
│   └── {feature-name}.types.ts
└── index.ts                         # Barrel export (optional)
```

---

## Critical Architecture Decisions

### Single Source of Truth: DatapointStoreService

The `DatapointStoreService` in `/state/datapoints/` is the **ONLY** place where marine data is stored at runtime.

- **How data flows in:**
  1. Signal K WebSocket connects in `SignalKClientService` (`/data-access/signalk/`)
  2. Delta messages parsed and normalized
  3. Written to `DatapointStoreService.updateDatapoint()`
  4. Broadcast via `state$` Observable to all consumers

- **How to consume data:**
  ```typescript
  constructor(private datapoints: DatapointStoreService) {}
  
  ngOnInit() {
    this.depth$ = this.datapoints.getDatapoint$(PATHS.environment.depth.belowTransducer);
    this.heading$ = this.datapoints.getDatapoint$(PATHS.navigation.headingTrue);
  }
  ```

- **Never** use old services like `DataStoreService` or legacy Signal K client
- **Always** go through `DatapointStoreService` for any marine data access

### Unidirectional Data Flow

```
External Data (Signal K WS) 
        ↓ (SignalKClientService)
  DatapointStoreService (state)
        ↓ (Observable streams)
  Components / Facades
        ↓ (read-only)
  Templates
```

**Rules:**
- Components read from state, never write directly
- Facade services orchestrate state changes
- State service is the only writer to the store
- No circular dependencies between layers

---

## What Works Today ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ✅ Working | Real-time data display via WebSocket |
| Chart (MapLibre) | ✅ Working | Vessel tracking, route display, waypoint management |
| Instruments | ✅ Working | Sparkline history, instrument tiles |
| Alarms | ✅ Working | Fixed in recent iteration, uses DatapointStoreService |
| Diagnostics | ✅ Working | Fixed in recent iteration, uses DatapointStoreService |
| Settings | ✅ Working | Theme, units, preferences persist to localStorage |
| Simulator | ✅ Working | Generates realistic cruise scenarios, publishes via HTTP |
| Signal K Integration | ✅ Working | WebSocket + REST, delta message parsing |
| TypeScript Compilation | ✅ Working | Strict mode, no errors |
| ESLint + Prettier | ✅ Working | Code quality enforced |

---

## What Needs Attention ⚠️

### Known Issues

| Issue | Severity | Details | Affected |
|-------|----------|---------|----------|
| Dead code accumulation | Medium | ~2,200 lines of unused code in UI | `/services/`, `/ui/`, `/data-access/chart/` |
| Simulator unit inconsistency | High | COG in degrees, heading in radians | Marine data accuracy |
| Missing path definition | Medium | `navigation.headingMagnetic` not in contract | Type safety |
| Test coverage | Low | Minimal automated tests | Code confidence |
| Offline support | Low | Chart infrastructure ready, no caching yet | Future feature |

### Dead Code Locations

These should be removed or refactored:

```
/marine-instrumentation-ui/src/app/
├── /services/
│   ├── signalk-client.service.ts  (207 lines, unused)
│   ├── data-store.service.ts      (~100 lines, legacy)
│   ├── waypoint.service.ts        (135 lines, replaced)
│   └── telemetry.ts               (~50 lines)
├── /ui/components/                (~600 lines, duplicates)
├── /data-access/chart/
│   └── chart-map.service.ts       (621 lines, legacy)
├── /pages/chart/
│   └── chart.page.ts              (484 lines, not routed)
└── /pages/dashboard/
    └── dashboard.page.ts          (40 lines, not routed)
```

---

## How AI Assistants Should Work Here

### ✅ DO:

1. **Check state management first** - Is the data in `DatapointStoreService`?
2. **Use typed paths** - Import from `@omi/marine-data-contract` paths
3. **Follow layer rules** - Features can't import other features
4. **Use observables** - RxJS for async data flows
5. **Check Signal K paths** - Ensure paths exist in contract before using
6. **Run linter before committing** - `npm run lint` and fix warnings
7. **Create feature-level services** - One facade per feature
8. **Use barrel exports** - `index.ts` files for cleaner imports
9. **Test imports** - Verify contract types are exported
10. **Document architectural changes** - Update this file and PROJECT_STATE.md

### ❌ DON'T:

1. **Don't add global state** - Use DatapointStoreService only
2. **Don't bypass the contract** - Hardcode paths or types
3. **Don't create circular imports** - Test with import analysis
4. **Don't duplicate components** - Refactor to shared/ instead
5. **Don't use `any` types** - Violates ESLint rules
6. **Don't ignore lint errors** - Fix before committing
7. **Don't add NgModules** - Use standalone components only
8. **Don't create service-to-service chains** - Keep dependency graph shallow
9. **Don't duplicate calculations** - Centralize in `/core/calculations/`
10. **Don't modify PROJECT_STATE.md** - It tracks system health separately

---

## Debugging Tips

### WebSocket Not Connecting?

Check Signal K server is running:
```bash
docker compose logs -f signalk  # In signalk-runtime/
curl http://localhost:3000/signalk/v1/api/
```

### Data Not Appearing in Dashboard?

1. Check SignalKClientService is connected: Browser DevTools → Network → WS
2. Check DatapointStoreService has data: Console → `ng.probe(el).injector.get(...)`
3. Check paths exist in contract: `PATHS.navigation.speedOverGround`
4. Check component subscribes to correct path

### Build Fails?

```bash
# Full rebuild (nuclear option)
npm run clean        # Delete node_modules and dist
npm install
npm run build
npm run lint
```

### Hot Reload Not Working?

Ensure you're running `npm start` (not `npm run build`), dev server includes HMR.

---

## Version Information

**As of 2026-01-28:**

| Package | Version | Status |
|---------|---------|--------|
| Angular | 21.1.0 | Latest LTS |
| TypeScript | 5.5.4 (contract), 5.9.2 (UI) | Latest stable |
| Node.js | 20 LTS | Recommended |
| MapLibre GL JS | 5.16.0 | Latest stable |
| RxJS | 7.8.0 | Latest stable |
| Vitest | 4.0.8 | Latest stable |
| Signal K | 4.x (Docker) | Standard |

All packages use `^` (caret) versioning. Update with `npm update` in each project.

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
  quality?: 'good' | 'warn' | 'bad';
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
