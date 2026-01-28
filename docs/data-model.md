# Data Model

**Last Updated:** 2026-01-28

This document defines the data types, unit conventions, and Signal K paths used throughout the Open Marine Instrumentation project.

---

## Unit Conventions (CRITICAL)

**All internal calculations must follow these standards:**

| Quantity | Unit | Symbol | Notes |
|----------|------|--------|-------|
| **Angles** | Radians | rad | Clockwise from true north (0 = north, π/2 = east) |
| **Speed** | Meters per second | m/s | Positive direction of motion |
| **Distance** | Meters | m | Horizontal, vertical, or path-specific |
| **Voltage** | Volts | V | DC, signed (positive = charging, negative = discharging) |
| **Current** | Amps | A | Positive = charging, negative = discharging |
| **Time** | ISO 8601 UTC | string | Format: `"2026-01-28T22:10:00.000Z"` |
| **Position** | Decimal degrees | number | WGS84 lat/lon |
| **Pressure** | Pascals | Pa | Atmospheric, water pressure |
| **Temperature** | Kelvin | K | Absolute temperature |

### Angle Conventions in Detail

```
                 North (0 rad)
                      ↑
                  0.5π rad
                      │
West (π rad) ←────────┼────────→ East (-0.5π rad)
                      │
                  1.5π rad
                      ↓
                South (π rad)

Positive rotation: Clockwise (nautical convention)
Example: Heading = 0.5π rad means East
Example: COG = 1.5π rad means South
```

**When displaying to users:** Convert to degrees (0-360°) with `radToDeg()` utility.

---

## Core Type Definitions

### DataPoint<T>

The generic wrapper for all marine data:

```typescript
export interface DataPoint<T> {
  path: SignalKPath;           // Signal K path (type-safe)
  value: T;                     // The actual value
  timestamp: string;            // ISO 8601 UTC ("2026-01-28T...")
  source: SourceRef;            // Where this came from
  quality: QualityFlag;         // good | warn | bad
}
```

**Example:**
```typescript
const depth: DataPoint<number> = {
  path: PATHS.environment.depth.belowTransducer,
  value: 2.5,  // meters
  timestamp: "2026-01-28T22:10:00.000Z",
  source: { label: "simulator", type: "nmea0183", priority: 0 },
  quality: "good"
};
```

### SourceRef

Identifies where a data point originated:

```typescript
export interface SourceRef {
  label: string;                // Human-readable source name ("simulator", "nmea2000-gps", etc.)
  type?: string;                // NMEA0183 | NMEA2000 | custom | http (optional)
  priority?: number;            // 0-100, higher = preferred (default: 0)
  fallback?: string;            // Label of preferred fallback source
  validityTimeoutMs?: number;   // Time until source considered stale (default: 10000 ms)
}
```

**Usage:**
- Multiple sources can provide the same path
- Highest priority source is "active"
- Lower priority sources become active if primary becomes stale
- `validityTimeoutMs` defines how long data remains valid after last update

### Position

Exact geographic position:

```typescript
export interface Position {
  latitude: number;             // WGS84, decimal degrees (-90 to +90)
  longitude: number;            // WGS84, decimal degrees (-180 to +180)
  altitude?: number;            // Meters above WGS84 ellipsoid (optional)
}
```

**Example:**
```typescript
const position: DataPoint<Position> = {
  path: PATHS.navigation.position,
  value: { latitude: 60.1699, longitude: 24.9384 },  // Helsinki
  timestamp: "2026-01-28T22:10:00.000Z",
  source: { label: "gps", priority: 100 },
  quality: "good"
};
```

### QualityFlag

State machine for data quality:

```typescript
export enum QualityFlag {
  Good = "good",       // Data is valid, trusted
  Warn = "warn", // Data may be invalid (edge case, sensor fault suspected)
  Bad = "bad"          // Data is definitely invalid, ignore it
}
```

**State Transitions:**
```
       good ──────────────▶ warn ──────────────▶ bad
       ▲                     │                      │
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                  explicit reset
```

**Rules:**
- Degradation must follow sequence: `good → warn → bad`
- Recovery to `good` is explicit (source reset or manual override)
- Cannot skip states (cannot jump from `warn` to `good`)
- Consumers should suppress display/alarms for `bad` data

---

## Signal K Paths (MVP)

All paths are **type-safe** via `PATHS` constant in contract. Use it, don't hardcode strings:

```typescript
// ✅ CORRECT
const depth = datapoints.getDatapoint$(PATHS.environment.depth.belowTransducer);

// ❌ WRONG (type safety lost)
const depth = datapoints.getDatapoint$('environment.depth.belowTransducer');
```

### Navigation Paths

| Path | Type | Unit | Example | Notes |
|------|------|------|---------|-------|
| `navigation.position` | Position | lat/lon | `{lat:60.17, lon:24.94}` | WGS84 decimal degrees |
| `navigation.speedOverGround` | number | m/s | 3.2 | Always ≥ 0 |
| `navigation.courseOverGroundTrue` | number | radians | 1.57 | 0=North, π/2=East |
| `navigation.headingTrue` | number | radians | 1.55 | 0=North, π/2=East |
| ~~`navigation.headingMagnetic`~~ | ❌ NOT DEFINED | radians | - | **BUG:** Used in UI but missing from contract |

### Environmental Paths

| Path | Type | Unit | Example | Notes |
|------|------|------|---------|-------|
| `environment.depth.belowTransducer` | number | meters | 2.5 | Depth from transducer to seafloor |
| `environment.wind.angleApparent` | number | radians | 0.78 | Relative to bow (0=ahead) |
| `environment.wind.speedApparent` | number | m/s | 4.2 | Apparent wind speed |
| ~~`environment.wind.angleTrueWaterReferenced`~~ | ❌ FUTURE | radians | - | True wind (not yet implemented) |
| ~~`environment.wind.speedTrue`~~ | ❌ FUTURE | m/s | - | True wind (not yet implemented) |

### Electrical Paths

| Path | Type | Unit | Example | Notes |
|------|------|------|---------|-------|
| `electrical.batteries.house.voltage` | number | volts | 12.8 | House battery voltage |
| `electrical.batteries.house.current` | number | amps | -5.2 | Positive=charging, negative=discharging |
| `electrical.batteries.starter.voltage` | number | volts | 13.1 | Engine starter battery (future) |
| `electrical.batteries.starter.current` | number | amps | -2.0 | Engine starter battery current (future) |

### Missing/Future Paths

These are planned but not yet defined in the contract:

- `navigation.headingMagnetic` - Compass heading (with deviation)
- `environment.wind.angleTrueWaterReferenced` - True wind angle
- `environment.wind.speedTrue` - True wind speed
- `engine.rpm` - Engine revolutions per minute
- `engine.load` - Engine load percentage
- `tanks.fuel.level` - Fuel tank level

---

## Data Flow Sequence

### Example: Dashboard Receives Depth Update

```
1. Signal K Server (external)
   └─ Publishes WebSocket delta:
      {
        "context": "vessels.self",
        "updates": [{
          "source": { "label": "simulator" },
          "timestamp": "2026-01-28T22:10:00.000Z",
          "values": [
            { "path": "environment.depth.belowTransducer", "value": 2.5 }
          ]
        }]
      }

2. SignalKClientService (in UI)
   └─ Receives WebSocket message
      └─ Parses delta into typed updates
      └─ Validates against contract
      └─ Calls DatapointStoreService.updateDatapoint()

3. DatapointStoreService (state layer)
   └─ Normalizes timestamp (handles clock drift)
   └─ Validates quality (default: "good")
   └─ Stores as: DataPoint<number>
   └─ Updates history buffer (120 samples)
   └─ Broadcasts via BehaviorSubject<DataPointMap>

4. Component (features/dashboard)
   └─ Subscribed to: datapoints.getDatapoint$(PATHS.environment.depth.belowTransducer)
   └─ Receives: Observable<DataPoint<number>>
   └─ Renders in template: {{ depth$ | async | formatDepth }}

5. Template Output
   └─ Displays: "2.5 m" (or "8.2 ft" depending on units preference)
```

---

## Signal K Delta Message Format

Standard Signal K delta updates use this format:

```json
{
  "context": "vessels.self",
  "updates": [
    {
      "source": {
        "label": "simulator",
        "type": "nmea0183",
        "instance": 0
      },
      "timestamp": "2026-01-28T22:10:00.000Z",
      "values": [
        { "path": "navigation.speedOverGround", "value": 3.2 },
        { "path": "navigation.courseOverGroundTrue", "value": 1.57 },
        { "path": "environment.depth.belowTransducer", "value": 2.5 },
        { "path": "electrical.batteries.house.voltage", "value": 12.8 }
      ]
    }
  ]
}
```

**Parsing Rules:**
1. Extract `context` (should be `vessels.self` for our vessel)
2. For each `update` in `updates[]`:
   - Get `source` (label, type, instance)
   - Get `timestamp` (apply clock drift check)
   - For each `value` in `values[]`:
     - Create `DataPoint<T>` with path, value, source, timestamp, quality="good"
     - Store in `DatapointStoreService`

---

## Quality Lifecycle Example

### Scenario: Depth Sensor Loses Signal

```
t=0s   | Depth = 2.5m, quality = "good"   (Normal operation)
       |

t=5s   | No update received
       |

t=10s  | Sensor becomes warn (timeout elapsed)
       | Depth = 2.5m, quality = "warn" (Data may be stale)
       | (UI: Show data but with warning indicator)
       |

t=15s  | Still no update, data marked bad
       | Depth = 2.5m, quality = "bad"    (DO NOT DISPLAY)
       | (UI: Show "---" or "Data unavailable")
       |

t=20s  | Sensor comes back online
       | Depth = 2.4m, quality = "good"   (Fresh data)
       | (UI: Resume normal display)
```

**Implementation:**
```typescript
// DatapointStoreService monitors validityTimeoutMs
// Automatically degrades quality if no update received
// Resets quality to "good" on fresh update
```

---

## Unit Conversion Utilities

All utilities exported from `marine-data-contract`:

```typescript
// Angle conversions
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

// Speed conversions
export function knotsToMetersPerSecond(knots: number): number {
  return knots * 0.514444;  // 1 knot = 0.514444 m/s
}

export function metersPerSecondToKnots(mps: number): number {
  return mps / 0.514444;
}

// Temperature conversions (future)
export function celsiusToKelvin(celsius: number): number {
  return celsius + 273.15;
}

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}
```

**Usage:**
```typescript
const courseRadians = PATHS.navigation.courseOverGroundTrue;  // 1.57 rad
const displayDegrees = radToDeg(courseRadians);               // 90°

const speedMetersPerSecond = PATHS.navigation.speedOverGround; // 5 m/s
const speedKnots = metersPerSecondToKnots(speedMetersPerSecond); // 9.7 knots
```

---

## True Wind Calculation (Documented, Not Yet Implemented)

True wind combines apparent wind + vessel motion. **Currently stubbed, formulas documented here.**

### Coordinate System

```
Boat-relative frame:
  Forward (x-axis): Along boat heading
  Starboard (y-axis): 90° clockwise from forward

Wind vectors:
  Apparent wind: Observed from boat (AWA, AWS)
  True wind: Actual wind relative to water/earth (TWA, TWS)
  Boat velocity: Over ground (SOG, COG) or through water (STW, heading)
```

### Transformation Formula

```
Step 1: Convert apparent wind to boat frame
  V_aw_forward = AWS * cos(AWA)
  V_aw_starboard = AWS * sin(AWA)

Step 2: Rotate to earth frame
  V_aw_north = V_aw_forward * cos(Heading) - V_aw_starboard * sin(Heading)
  V_aw_east  = V_aw_forward * sin(Heading) + V_aw_starboard * cos(Heading)

Step 3: Add boat velocity (earth frame)
  V_boat_north = SOG * cos(COG)
  V_boat_east  = SOG * sin(COG)

Step 4: Compute true wind
  V_true_north = V_aw_north + V_boat_north
  V_true_east  = V_aw_east + V_boat_east
  TWS = sqrt(V_true_north² + V_true_east²)
  TWD = atan2(V_true_east, V_true_north)  // True wind direction (bearing)
  TWA = normalize_angle(TWD - Heading)    // True wind angle (relative to boat)
```

### Validation Rules

- If AWA or AWS invalid: TWA/TWS not computed
- If SOG < 0.3 m/s: TWA/TWS suppressed (avoid noise at low speeds)
- If Heading invalid: Fall back to COG
- If both Heading and COG invalid: TWA/TWS not computed

---

## Timestamp Normalization

All timestamps must be ISO 8601 UTC strings.

### Rules

1. **Clock Drift Check**
   ```
   received_timestamp = "2026-01-28T22:10:00.000Z"
   host_time_now = "2026-01-28T22:10:02.500Z"
   drift_ms = |received - host| = 2500 ms
   
   if drift > 2000 ms (DEFAULT_MAX_CLOCK_DRIFT_MS):
     # Sensor clock is unreliable, use host time instead
     normalized = host_time_now
   else:
     normalized = received_timestamp
   ```

2. **Invalid Timestamp Handling**
   - If timestamp unparseable: Use host time
   - If timestamp is null/undefined: Use host time
   - If timestamp is in future (>5s ahead): Use host time (sensor clock way off)

3. **Example**
   ```typescript
   const raw = "2026-01-28T22:10:30.000Z";  // Sensor says 30s
   const host = new Date();                  // Host says 22:10:00
   const drift = 30000 ms;                   // > 2000 ms threshold
   const normalized = host.toISOString();    // Use host time (22:10:00)
   ```

---

## Type Safety Checklist

When adding new data types or paths:

- [ ] Add interface to `marine-data-contract/src/types.ts`
- [ ] Export from `marine-data-contract/src/index.ts`
- [ ] Add path to `PATHS` constant if Signal K path
- [ ] Document unit convention
- [ ] Add example DataPoint in this file
- [ ] Update UI components to import type from contract
- [ ] Test: `import { YourType } from '@omi/marine-data-contract'`
- [ ] Run: `npm run lint` in contract folder
- [ ] Run: `npm run build` in contract folder
- [ ] Verify: `npm install` in dependent packages picks up new types

---

## Summary Table

| Aspect | Standard | Example | Reference |
|--------|----------|---------|-----------|
| **Angles** | Radians | π/2 = East | Trigonometric |
| **Speed** | m/s | 5.0 | SI unit |
| **Distance** | Meters | 1000 | SI unit |
| **Time** | ISO 8601 UTC | "2026-01-28T22:10:00Z" | RFC 3339 |
| **Position** | WGS84 decimal | 60.17°N, 24.94°E | GPS standard |
| **Quality** | Enum | "good" \| "warn" \| "bad" | State machine |
| **Source** | SourceRef | `{label:"gps", priority:100}` | Multiple sources |




