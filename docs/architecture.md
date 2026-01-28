# Architecture

**Last Updated:** 2026-01-28

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL DATA SOURCES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌──────────────────────────┐  │
│  │ Sensor Adapters     │         │ marine-data-simulator    │  │
│  │ (NMEA0183/2000)     │ HTTP    │ (Development only)       │  │
│  │ [Future]            │ POST    │                          │  │
│  └─────────┬───────────┘ ──────▶ │ Publishes deltas every  │  │
│            │                     │ 1 Hz to Signal K         │  │
│            │                     └──────────┬───────────────┘  │
│            │                                │                  │
└────────────┼────────────────────────────────┼──────────────────┘
             │                                │
             │                                │ HTTP POST
             │                                │ (Delta updates)
             │                                ▼
             │                      ┌──────────────────────────┐
             │                      │  Signal K Server         │
             │                      │  (Docker, Port 3000)     │
             │                      │                          │
             │                      │ - Aggregates all sources │
             │                      │ - Maintains vessel state │
             │                      │ - REST API + WebSocket   │
             │                      └──────────┬───────────────┘
             │                                │
             │    WebSocket (bidirectional)   │ REST API
             │    Delta stream updates        │ (queries)
             │                                │
             └────────────────┬───────────────┘
                              │
                              ▼
             ┌────────────────────────────────────────┐
             │   marine-instrumentation-ui            │
             │   (Angular 21.1 Dashboard)             │
             │                                        │
             │   ┌────────────────────────────────┐   │
             │   │  SignalKClientService          │   │
             │   │  (WebSocket connection)        │   │
             │   └────────────┬───────────────────┘   │
             │                │                       │
             │                ▼                       │
             │   ┌────────────────────────────────┐   │
             │   │  DatapointStoreService         │   │
             │   │  (SINGLE SOURCE OF TRUTH)      │   │
             │   │  Normalized data + history    │   │
             │   └────────────┬───────────────────┘   │
             │                │                       │
             │      ┌─────────┼─────────┬─────────┐   │
             │      ▼         ▼         ▼         ▼   │
             │    Dashboard  Chart   Instruments Alarms│
             │    (Real-time gauges, MapLibre, etc)   │
             │                                        │
             └────────────────────────────────────────┘
```

---

## Responsibilities by Component

### signal K Runtime (Docker Container)

**What it does:**
- Provides Signal K API on port 3000 (HTTP/REST + WebSocket)
- Aggregates data from multiple sources (simulator, future sensors)
- Maintains vessel state (full data model)
- Broadcasts delta updates to all connected clients
- Persists data to internal storage

**Key Endpoints:**
- `GET /signalk/v1/api/` - Full vessel state (tree structure)
- `WS /signalk/v1/stream` - Live delta updates (event stream)
- `POST /signalk/v1/messages/hello` - Connection heartbeat

**Configuration:** `signalk-runtime/docker-compose.yml`
- Image: `signalk/signalk-server:latest` (v4.x)
- Port: 3000 (HTTP + WebSocket)
- Volume: `./data/` (persistent)
- Security: Disabled (development mode)

---

### marine-data-contract (TS Package, v0.1.0)

**What it does:**
- Defines all TypeScript types for marine data
- Provides `PATHS` constant for type-safe Signal K paths
- Exports unit conversion utilities
- Defines quality state machine
- Validates timestamp normalization rules

**Key Exports:**
```typescript
export { DataPoint<T>, Position, SourceRef, QualityFlag }  // Types
export { PATHS }                                            // Paths
export { degToRad, radToDeg, knotsToMetersPerSecond }      // Utils
export { normalizeTimestamp }                               // Timestamp handling
```

**Usage in other packages:**
```typescript
import { PATHS, DataPoint, QualityFlag } from '@omi/marine-data-contract';
```

**No External Dependencies** - Compiles to pure JS, zero runtime dependencies.

---

### marine-data-simulator (Node.js, v0.1.0)

**What it does:**
- Generates realistic sailboat cruise data
- Publishes delta messages to Signal K HTTP endpoint
- Runs one scenario loop (basicCruise) at 1 Hz
- Simulates environmental events: gusts, shallow water, battery cycles

**Data Published:**
- `navigation.position` - Realistic lat/lon track
- `navigation.speedOverGround` - 0-5 m/s with acceleration
- `navigation.courseOverGroundTrue` - Heading vector
- `environment.wind` - Apparent wind with gusts
- `environment.depth` - Varying depth with shoals
- `electrical.batteries.house` - Voltage, current

**How to run:**
```bash
cd marine-data-simulator
npm install
npm run dev    # Starts at 1 Hz, publishes to localhost:3000
```

**Note:** This is development-only. Production uses real NMEA0183/2000 adapters.

---

### marine-sensor-gateway (Node.js Stub, v0.1.0)

**What it does:**
- Defines interfaces for real hardware adapters
- Placeholder for future sensor integrations
- **Currently: Interface-only, no implementation**

**Planned Adapters:**
- NMEA0183 - Serial sentence parser
- NMEA2000 - CAN bus PGN parser
- Custom Serial - Generic framing handler

**Future:** Adapters will publish to Signal K like the simulator.

---

### marine-instrumentation-ui (Angular 21.1)

**What it does:**
- Connects to Signal K WebSocket
- Normalizes and stores data in central state
- Renders dashboard, chart, instruments, alarms, diagnostics, settings
- Provides user interaction (waypoints, preferences, themes)

**Layer Breakdown:**

#### `/core/` - Infrastructure
```
config/        - Environment tokens (API URLs, thresholds)
formatting/    - Unit formatters (speed, depth, angle, voltage)
calculations/  - Math utilities (haversine, bearing, trend)
services/      - Layout, theme, preferences services
theme/         - Theme definitions (light/dark)
```

#### `/data-access/` - External APIs
```
signalk/       - WebSocket client, delta parser, REST queries
chart/         - Map tile providers, chart data sources
```

#### `/state/` - Central State (SINGLE SOURCE OF TRUTH)
```
datapoints/    - DatapointStoreService
  ├── Stores all marine data (DataPoint<T> map)
  ├── Maintains history (sparkline data)
  ├── Tracks vessel position (for map)
  └── Broadcasts via Observable streams

calculations/  - Selectors, computed values (not implemented yet)
```

#### `/features/` - Lazy-Loaded Feature Modules
```
dashboard/     - Main display (facade orchestrates)
chart/         - MapLibre GL vessel tracker (facade orchestrates)
instruments/   - Individual instrument pages (direct store access)
alarms/        - Alarm list and history (facade orchestrates)
diagnostics/   - System health and source status
```

Each feature has:
- `{feature}.page.ts` - Route component
- `{feature}-facade.service.ts` - Orchestrates state + data access
- `components/` - Feature-specific presentational components
- `types/` - Feature-specific type definitions

#### `/pages/` - Legacy Pages
```
settings/      - User preferences (theme, units, thresholds)
```

#### `/shared/` - Reusable Components
```
components/    - Sparkline, panel-card, instrument-tile (shared UI)
```

---

## Data Flow Architecture

### Inbound (External Data → UI)

```
Signal K WebSocket
    ↓ (Delta message: { context, updates: [{ source, timestamp, values: [{path, value}] }] })
SignalKClientService
    ↓ (Parses delta, validates against contract)
DatapointStoreService.updateDatapoint()
    ↓ (Stores as DataPoint<T>, computes history, broadcasts via BehaviorSubject)
state$ Observable stream
    ↓ (RxJS observable)
Components subscribe
    ↓ (Components read data, never write)
Templates render ({{ depth$ | async }})
```

### Outbound (User Interaction → Settings)

```
User changes preference (theme, units)
    ↓ (Component emits event)
PreferencesService.updatePreference()
    ↓ (Writes to localStorage)
PreferencesService emits via BehaviorSubject
    ↓ (All subscribers notified)
Components re-render with new units/theme
```

---

## Dependency Rules (Critical)

### Allowed Imports

```
Features can import from:
  ✅ Shared components
  ✅ State (DatapointStoreService)
  ✅ Data-Access (SignalK client, etc.)
  ✅ Core (formatting, calculations)
  ✅ Contract (types, paths)
  ❌ Other Features (leads to circular deps)

Shared components can import from:
  ✅ Core (formatting, calculations)
  ✅ Contract (types, paths)
  ❌ State (breaks reusability)
  ❌ Data-Access
  ❌ Features

State layer can import from:
  ✅ Data-Access (to fetch data)
  ✅ Core
  ✅ Contract
  ❌ Features
  ❌ Shared

Data-Access can import from:
  ✅ Core
  ✅ Contract
  ❌ State
  ❌ Features
  ❌ Shared

Core can only import from:
  ✅ Contract
  ✅ Other core modules
  ❌ Everything else
```

### Why These Rules Matter

1. **Prevents Circular Dependencies** - Core imports only contract, contract imports nothing
2. **Ensures Reusability** - Shared components never depend on state
3. **Enables Lazy Loading** - Features don't know about each other
4. **Clarifies Responsibility** - Each layer has one job
5. **Aids AI Understanding** - Unambiguous architecture for code generation

---

## Map Engine: MapLibre GL JS (v5.16)

The chart page uses **MapLibre GL JS** for vessel tracking and route planning.

### Architecture

```
ChartMapService (facade)
    ↓
MapLibreEngineService (map engine + interactions)
    ├── Base map tile source (OSM raster by default)
    ├── Vessel GeoJSON source (position marker)
    ├── Track GeoJSON source (breadcrumb trail)
    ├── Route/Waypoint GeoJSON sources
    └── Interaction handlers (click, drag, etc.)

DatapointStoreService (position stream)
    ↓
Chart component subscribes to position$
    ↓
Updates map sources in-place (smooth, no re-render)
```

### Tile Sources

Currently configured:
- **Raster XYZ:** OpenStreetMap (development)
- **Future:** MBTiles (offline), vector MVT (production)

### Performance

- GPU rendering via WebGL
- In-place source updates (no full redraw)
- Track limit: 1000 points (with 30-minute window)
- Minimum track point distance: 10 meters

---

## Alarm Philosophy

### State Machine

```
         good ──────────────▶ warn ──────────────▶ bad
         ▲                     │                      │
         │                     │                      │
         └─────────────────────┴──────────────────────┘
                        explicit reset
```

### Behavior

1. **Latching with Hysteresis**
   - Alarms don't trigger on momentary events
   - Example: Shallow water alarm triggers at 2m, clears at 3m (1m hysteresis)

2. **Acknowledgement**
   - User can acknowledge alarm to reduce visual intensity
   - Does NOT clear the alarm
   - Alarm remains in "acknowledged" state until signal returns to safe band

3. **Clear Condition**
   - Alarm clears only when signal exceeds hysteresis threshold
   - Example: Battery voltage alarm (9V trigger, 10V clear)

4. **Visual Priority**
   - Active alarms: High contrast, flashing, sound (future)
   - Acknowledged alarms: Subdued, visible but not prominent
   - Cleared alarms: Normal status indicators

---

## Electrical Assumptions

### NMEA0183 (Serial)

- **Signaling:** Differential RS-422 (4-wire, balanced)
- **Baudrate:** 4800 (slow) or 38400 (fast)
- **Isolation:** Recommended (galvanic isolation prevents ground loops)
- **Cable:** Twisted pair, ~20m max
- **Level Shifting:** TTL/CMOS ↔ RS-422 requires line drivers
- **Termination:** Optional 120Ω resistors at each end (long cables)

### NMEA2000 (CAN)

- **Protocol:** CAN 2.0B at 250 kbps
- **Bus Voltage:** 9-16 VDC (typically 12-24V)
- **Termination:** 120Ω resistor at each end (CRITICAL)
- **Cable:** Twisted pair shielded (DeviceNet style)
- **Isolation:** Highly recommended (3kV isolation minimum)
- **Daisy-Chain:** All devices in parallel to backbone
- **Length:** ~100m per segment

### Custom Serial

- **Protocol:** User-defined framing
- **Level Shifting:** Must match compute host (TTL/RS-232/RS-422)
- **Baudrate:** 9600 typical, anything is possible
- **Isolation:** Strongly recommended for galvanic decoupling
- **Grounding:** Single point ground to avoid loops

---

## Timing Assumptions

### Clock Discipline

1. **Timestamp Source**
   - **Preferred:** GPS receiver (GPS time, ±100ms accuracy)
   - **Fallback:** NTP disciplined host clock
   - **Least Preferred:** Host system clock (can drift)

2. **Clock Drift Handling**
   - All timestamps normalized to ISO 8601 UTC
   - If timestamp differs from host clock by > 2000ms, clamp to local time
   - Prevents display issues when sensors have bad clocks

3. **Typical Update Rates**
   - Navigation (SOG, COG, position): 1 Hz
   - Environmental (wind, depth): 1-5 Hz
   - Electrical (battery): 0.2-1 Hz
   - Sensors must declare actual rates in SourceRef

4. **Validity Timeouts**
   - Each source defines `validityTimeoutMs` (default: 10 seconds)
   - If no update received, source marked stale
   - Consumers should suppress display/alarms for stale sources

---

## Summary: How It All Works Together

```
1. Real (or simulated) sensor data → Signal K HTTP/REST POST
2. Signal K aggregates, broadcasts via WebSocket (delta updates)
3. UI WebSocket client receives deltas, parses them
4. DatapointStoreService stores normalized DataPoint<T> objects
5. Components subscribe to Observable streams from store
6. Templates render values in real-time (async pipe)
7. Map updates vessel position, draws track
8. Alarms evaluate thresholds against current values
9. User changes settings → PreferencesService → localStorage → re-render
```

The architecture prioritizes:
- **Type Safety** - TypeScript strict, contract validation
- **Single Source of Truth** - DatapointStoreService
- **Unidirectional Data Flow** - Easy to debug, trace data
- **Modularity** - Features are independent, lazy-loadable
- **Performance** - Observables only update what changed
- **Extensibility** - New adapters, new features, new paths



