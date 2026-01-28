# Project State Analysis

**Date:** 2026-01-28
**Last Updated:** 2026-01-28 (After Milestone 3)
**Purpose:** Comprehensive technical assessment for architectural cleanup and future development planning

---

## 1. Executive Summary

### What the Project Is

Open Marine Instrumentation is an open-source sailboat instrumentation platform built around **Signal K** (a standardized marine data format). It provides real-time visualization of navigation, environmental, and electrical data from marine sensors. The platform consists of five packages in a monorepo structure:

| Package | Purpose | Status |
|---------|---------|--------|
| **marine-data-contract** | Shared TypeScript types and Signal K paths | Stable, minimal |
| **marine-data-simulator** | Node.js data generator for testing | Functional |
| **marine-sensor-gateway** | Stub for real sensor adapters (NMEA0183/2000) | Interface-only stub |
| **marine-instrumentation-ui** | Angular dashboard application | Partially migrated, technical debt |
| **signalk-runtime** | Docker-based Signal K server | Functional |

### What Works Today

- **Dashboard**: Displays navigation (SOG, COG, position), depth, wind, and battery data in real-time
- **Chart**: MapLibre GL JS map with vessel tracking, waypoint management, and route planning
- **Instruments**: Individual instrument displays with sparkline history
- **Simulator**: Generates realistic marine data including gusts, shallow water events, battery cycles
- **Signal K Integration**: WebSocket streaming from Signal K server to UI
- **Settings**: User preferences for units, theme, shallow threshold

### What Is Unstable / Incomplete

1. ~~**Alarms and Diagnostics are broken**~~: ✅ **FIXED in Milestone 1** - Now using DatapointStoreService
2. **True Wind calculation**: Documented but not implemented
3. **Real sensor integration**: Gateway exists as interfaces only
4. **Chart offline support**: Infrastructure ready but no offline tile caching
5. **Quality lifecycle**: Contract defines quality state machine but no implementation enforces it

### Current Technical Health (Honest Assessment)

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Code Quality** | 🟢 Good | Strict TypeScript, ESLint enforced, dead code removed (M2) |
| **Architecture Coherence** | 🟡 Medium | Feature-facade pattern in dashboard/chart, legacy in instruments/alarms/diagnostics |
| **Test Coverage** | 🔴 Poor | Minimal tests, no automated test pipeline |
| **Documentation** | 🟢 Good | CLAUDE.md and PROJECT_STATE.md reflect current reality |
| **Build/Deploy** | 🟢 Good | Clean npm scripts, Docker Compose for Signal K |
| **Maintainability** | 🟡 Medium | Single implementations, consistent patterns emerging |

**Overall Health Score: 7/10** - After Milestones 1-3, the application is functional with consistent architecture. Alarms/diagnostics working, ~4,400 lines of dead code removed, feature-facade pattern applied across all main routes. Remaining work: contract cleanup, testing, and feature hardening.

---

## 2. Current Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐    HTTP POST     ┌────────────────────────────┐  │
│  │ marine-data-simulator │ ───────────────▶│   signalk-runtime          │  │
│  │   (Node.js/TS)        │   Delta messages │   (Docker container)       │  │
│  └──────────────────────┘                  │   Port 3000                │  │
│                                             └────────────┬───────────────┘  │
│                                                          │                  │
│  ┌──────────────────────┐ ◀─── Future ───────────────────┤                  │
│  │ marine-sensor-gateway │                               │                  │
│  │   (Stub interfaces)   │                               │                  │
│  └──────────────────────┘                               │                  │
│                                                          │ WebSocket        │
│                                                          ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    marine-instrumentation-ui                          │  │
│  │                         (Angular 21.1)                                │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                     DATA ACCESS LAYER                            │ │  │
│  │  │  ┌───────────────────┐    ┌─────────────────────────────────┐   │ │  │
│  │  │  │ SignalKClient     │───▶│ DatapointStoreService           │   │ │  │
│  │  │  │ (WebSocket)       │    │ (Central State - SINGLE SOURCE) │   │ │  │
│  │  │  └───────────────────┘    └──────────────┬──────────────────┘   │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                             │                        │  │
│  │                                             ▼                        │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │                    UI COMPONENTS                               │  │  │
│  │  │                                                                │  │  │
│  │  │   /features/dashboard/  ──────▶ DatapointStore  ✅             │  │  │
│  │  │   /features/chart/      ──────▶ DatapointStore  ✅             │  │  │
│  │  │   /pages/instruments/   ──────▶ DatapointStore  ✅             │  │  │
│  │  │   /pages/alarms/        ──────▶ DatapointStore  ✅ (Fixed M1)  │  │  │
│  │  │   /pages/diagnostics/   ──────▶ DatapointStore  ✅ (Fixed M1)  │  │  │
│  │  │   /pages/settings/      ──────▶ PreferencesService ✅          │  │  │
│  │  │                                                                │  │  │
│  │  │   Dead code removed in Milestone 2:                            │  │  │
│  │  │   - /pages/dashboard/, /pages/chart/ (dead routes)             │  │  │
│  │  │   - /services/signalk-client, data-store, waypoint, telemetry  │  │  │
│  │  │   - /ui/components/* (duplicates, except instrument-card)      │  │  │
│  │  │   - /data-access/chart/chart-map.service.ts                    │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    marine-data-contract                               │  │
│  │    Types: DataPoint<T>, Position, SourceRef, QualityFlag             │  │
│  │    Paths: PATHS constant, SignalKPath type                           │  │
│  │    Utils: normalizeTimestamp(), degToRad(), knotsToMetersPerSecond() │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Descriptions

#### marine-data-contract (201 lines)

**Purpose**: Shared TypeScript types and Signal K path constants for type-safe data handling.

**Key Exports**:
- `DataPoint<T>` - Generic wrapper for all marine data
- `PATHS` - Signal K path constants with type inference
- `QualityFlag` - Data quality enum (good/suspect/bad)
- `normalizeTimestamp()` - Clock drift handling
- Unit conversion utilities

**Issues**:
- 10 unused exports (type aliases, utility functions)
- `navigation.headingMagnetic` used in UI but not defined in PATHS
- Quality type mismatch: contract uses `suspect`, UI uses `warn`

#### marine-data-simulator (7 source files, ~700 lines)

**Purpose**: Generates realistic marine telemetry for development and testing.

**Key Features**:
- Basic cruise scenario with position, speed, wind, depth, battery
- Random events: gusts, shallow water, battery charge cycles
- Publishes via WebSocket to Signal K server

**Issues**:
- Unit inconsistency: COG published in degrees, heading in radians
- Local `toDegrees()` function duplicates contract utility
- HttpPublisher implemented but never used (162 lines dead code)
- Only one scenario; no scenario extensibility

#### marine-sensor-gateway (8 source files, ~176 lines)

**Purpose**: Interface definitions for real hardware sensor adapters.

**Status**: **Complete stub** - Interfaces only, zero implementation.

**Defines adapters for**:
- NMEA0183 (serial, sentence parsing)
- NMEA2000 (CAN bus, PGN parsing)
- Custom serial (generic framing)

**Not Used**: No other package imports this module currently.

#### signalk-runtime (7 configuration files)

**Purpose**: Docker container running official Signal K server.

**Configuration**:
- Port 3000 (HTTP + WebSocket)
- Security disabled for development
- Plugins: course-provider, resources-provider, freeboard-sk
- Persistent data via volume mount

**Status**: Stable, works as expected.

#### marine-instrumentation-ui (Angular 21.1)

**Purpose**: Web dashboard for marine data visualization.

**Structure (Detailed)**:

| Directory | Purpose | Status |
|-----------|---------|--------|
| `/core/` | Infrastructure (preferences, theme, layout) | Active |
| `/data-access/signalk/` | SignalKClientService (WebSocket) | Active |
| `/data-access/chart/` | ChartMapService (legacy), chart sources | Partial dead code |
| `/state/datapoints/` | DatapointStoreService (central state) | Active |
| `/state/calculations/` | Navigation calculations | Active |
| `/features/dashboard/` | Dashboard with facade pattern | Active |
| `/features/chart/` | Chart with MapLibre engine | Active |
| `/pages/` | Legacy pages (instruments, alarms, diagnostics, settings) | Mixed |
| `/services/` | Legacy services (old SignalK client, old waypoint service) | Mostly dead |
| `/shared/` | Shared components (sparkline, panel-card) | Active |
| `/ui/` | Legacy UI components | Dead code |

---

## 3. Identified Problems

### 3.1 Critical Functional Issues

#### P1: Alarms and Diagnostics Are Broken (SEVERITY: CRITICAL)

**Problem**: AlarmService and DiagnosticsService inject the old `DataStoreService`, which is no longer fed by the active SignalKClientService.

**Evidence**:
- `/services/alarm.service.ts` injects DataStoreService
- `/services/diagnostics.service.ts` injects DataStoreService
- Active SignalKClientService (in `/data-access/signalk/`) feeds DatapointStoreService
- No code bridges these two stores

**Impact**: Alarms never trigger. Diagnostics show stale/no data.

**Fix Required**: Migrate AlarmService and DiagnosticsService to use DatapointStoreService.

#### P2: Unit Inconsistency in Simulator (SEVERITY: HIGH)

**Problem**: The simulator publishes COG in degrees but heading in radians.

**Evidence** (`/marine-data-simulator/src/scenarios/basicCruise.ts`):
- Line 365: `const reportedCogDegrees = wrapDegrees(toDegrees(reportedCog));`
- Line 397-400: COG published as degrees
- Line 402: Heading published as radians (no conversion)

**Impact**: UI must handle inconsistent units. Risk of navigation display errors.

**Fix Required**: Standardize all angles to radians per CLAUDE.md specification.

#### P3: Missing Signal K Path Definition (SEVERITY: MEDIUM)

**Problem**: `navigation.headingMagnetic` is used in UI but not defined in contract.

**Evidence**:
- `/marine-instrumentation-ui/.../heading-instrument.component.ts:28` uses `'navigation.headingMagnetic'`
- `/marine-data-contract/src/paths.ts` does not define this path

**Impact**: Type safety violation, potential runtime issues.

**Fix Required**: Add path to contract or remove usage from UI.

### 3.2 Dead Code Accumulation

| Location | Lines | Description |
|----------|-------|-------------|
| `/pages/chart/chart.page.ts` | 484 | Complete legacy chart implementation, not routed |
| `/pages/dashboard/dashboard.page.ts` | 40 | Legacy dashboard, not routed |
| `/services/signalk-client.service.ts` | 207 | Old SignalK client, not imported |
| `/services/data-store.service.ts` | ~100 | Legacy store, only used by broken services |
| `/data-access/chart/chart-map.service.ts` | 621 | Old chart service, not used |
| `/services/waypoint.service.ts` | 135 | Legacy waypoint service, superseded |
| `/ui/components/*` | ~600 | Duplicated panel components, not used |
| **Total Dead Code** | **~2,187** | **Lines that should be removed** |

### 3.3 Architectural Inconsistencies

#### Incomplete Feature-Facade Migration

**Current State**:
- `/features/dashboard/` uses DashboardFacadeService (modern pattern) ✅
- `/features/chart/` uses ChartFacadeService (modern pattern) ✅
- `/pages/instruments/` directly injects DatapointStoreService (old pattern) ⚠️
- `/pages/alarms/` uses AlarmService with wrong store (broken) ❌
- `/pages/diagnostics/` uses DiagnosticsService with wrong store (broken) ❌
- `/pages/settings/` directly manages preferences (acceptable) ✅

**Impact**: Inconsistent patterns confuse developers and AI assistants, leading to further drift.

#### Duplicate Component Trees

| Component | Modern Location | Legacy Location | Notes |
|-----------|-----------------|-----------------|-------|
| critical-strip | `/features/dashboard/components/` | `/ui/components/` | Different implementations |
| depth-panel | `/features/dashboard/components/panels/` | `/ui/components/` | Features version is presentational |
| navigation-panel | `/features/dashboard/components/panels/` | `/ui/components/` | Features version is presentational |
| power-panel | `/features/dashboard/components/panels/` | `/ui/components/` | Features version is presentational |
| system-panel | `/features/dashboard/components/panels/` | `/ui/components/` | Features version is presentational |
| wind-panel | `/features/dashboard/components/panels/` | `/ui/components/` | Features version is presentational |
| chart-hud | `/features/chart/components/` | `/ui/components/` | Features version active |
| sparkline | `/shared/components/` | `/ui/components/` | Different implementations |

#### Service Duplication

| Service Type | Modern Location | Legacy Location | Issue |
|--------------|-----------------|-----------------|-------|
| SignalK Client | `/data-access/signalk/` | `/services/` | Both exist, only one used |
| Data Store | `/state/datapoints/` | `/services/` | Both exist, both used by different consumers |
| Waypoint Service | `/features/chart/services/` | `/services/` | Features version has more features |
| Chart Map Service | `/features/chart/services/maplibre-engine.service.ts` | `/data-access/chart/` | Features version active |

### 3.4 Technical Debt from AI Iterations

**Patterns Observed**:

1. **Additive Development**: AI added new implementations without removing old ones
2. **Incomplete Migrations**: Started feature-facade pattern but didn't complete for all pages
3. **Copy-Paste Evolution**: Duplicated components with minor differences instead of refactoring
4. **Broken Dependencies**: AlarmService/DiagnosticsService still reference old store
5. **Mixed Concerns**: `/services/` directory contains both active and dead services
6. **No Cleanup Pass**: No iteration focused on removing obsolete code

### 3.5 Contract-UI Misalignment

| Issue | Contract | UI | Impact |
|-------|----------|-----|--------|
| Quality enum naming | `QualityFlag.Suspect` | `DataQuality = 'warn'` | Semantic mismatch |
| Path usage | `PATHS` constant | Hardcoded strings in some components | Type safety loss |
| Type aliases | `Angle`, `Speed`, `Depth` defined | Not imported anywhere | Unused code |
| Source validity | `isSourceValid()` defined | Never called | Feature not implemented |

### 3.6 Risk Areas

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Alarm failure on real boat | Certain | High (safety) | Fix DataStoreService dependency immediately |
| Navigation calculation errors | Medium | High | Standardize units in simulator |
| Developer confusion | Certain | Medium | Remove dead code, document architecture |
| AI assistants making worse changes | High | Medium | Enforce clear architecture boundaries |
| Performance degradation | Low | Low | Dead code doesn't affect runtime |

---

## 4. Canonical Architecture Proposal (TARGET STATE)

### 4.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                                │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  FEATURES (Lazy-loaded, self-contained)                              │  │
│   │                                                                      │  │
│   │  /features/dashboard/     /features/chart/     /features/alarms/     │  │
│   │       │                        │                      │              │  │
│   │       └──────────┬─────────────┴──────────────────────┘              │  │
│   │                  │                                                   │  │
│   │                  ▼                                                   │  │
│   │            FACADE SERVICE per feature                                │  │
│   │      (orchestrates selectors, formatters, observable streams)        │  │
│   │                  │                                                   │  │
│   │                  ▼                                                   │  │
│   │        PRESENTATIONAL COMPONENTS (dumb, @Input/@Output only)         │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                   │                                        │
│                                   ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                               SHARED LAYER                                  │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  /shared/components/    (sparkline, panel-card, instrument-tile)   │    │
│   │  /shared/pipes/         (unit formatting, time ago)                │    │
│   │  /shared/directives/    (common UI behaviors)                      │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                   │                                        │
│                                   ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                               STATE LAYER                                   │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  /state/datapoints/     DatapointStoreService (SINGLE SOURCE)      │    │
│   │  /state/alarms/         AlarmStoreService (NEW - uses datapoints)  │    │
│   │  /state/preferences/    PreferencesService                          │    │
│   │  /state/selectors/      Pure selector functions                     │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                   │                                        │
│                                   ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                            DATA ACCESS LAYER                                │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  /data-access/signalk/   SignalKClientService (WebSocket + REST)   │    │
│   │  /data-access/storage/   LocalStorageService (waypoints, routes)   │    │
│   │  /data-access/chart/     ChartSourcesService (tile providers)      │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                   │                                        │
│                                   ▼                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                               CORE LAYER                                    │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  /core/config/          Environment configuration, tokens          │    │
│   │  /core/formatting/      Unit formatters (speed, depth, angle)      │    │
│   │  /core/calculations/    Navigation math (haversine, bearing)       │    │
│   │  /core/theme/           Theme service                               │    │
│   │  /core/layout/          Layout service                              │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL: marine-data-contract                       │
│                                                                             │
│   Types: DataPoint<T>, Position, SourceRef, SignalKPath, QualityFlag       │
│   Paths: PATHS constant                                                     │
│   Utils: normalizeTimestamp(), degToRad(), knotsToMetersPerSecond()        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Layer Responsibilities

| Layer | May Import | May NOT Import | Responsibility |
|-------|-----------|----------------|----------------|
| **Features** | Shared, State, Data-Access, Core | Other Features | Route-level page logic, orchestration via Facades |
| **Shared** | Core (sparingly) | State, Data-Access, Features | Reusable presentational components |
| **State** | Data-Access, Core | Features, Shared | Central state management, selectors |
| **Data-Access** | Core | State, Features, Shared | External API communication |
| **Core** | marine-data-contract only | Everything else | Infrastructure, configuration, utilities |

### 4.3 Dependency Rules

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Features │ ──▶ │  Shared  │ ──▶ │   Core   │ ──▶ │ Contract │ ◀── │   All    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │
     │                ▼
     │          ┌──────────┐
     └────────▶ │  State   │
     │          └──────────┘
     │                │
     │                ▼
     │          ┌──────────────┐
     └────────▶ │ Data-Access  │
               └──────────────┘
```

**Rules**:
1. Arrows point in direction of allowed imports
2. No circular dependencies
3. Features never import other Features (communicate via State if needed)
4. Shared components are purely presentational (no service injection)
5. State layer is the single source of truth for runtime data
6. Data-Access handles all external I/O

### 4.4 Feature Structure Template

Each feature follows this structure:

```
/features/{feature-name}/
├── {feature-name}.page.ts          # Route entry component
├── {feature-name}-facade.service.ts # Feature orchestration
├── components/                      # Feature-specific components
│   ├── {component-a}/
│   │   ├── {component-a}.component.ts
│   │   └── {component-a}.component.html
│   └── {component-b}/
│       ├── {component-b}.component.ts
│       └── {component-b}.component.html
├── types/                           # Feature-specific types
│   └── {feature-name}.types.ts
└── index.ts                         # Barrel export
```

### 4.5 Non-Goals (What We Explicitly Do NOT Do)

1. **No NgModules**: Continue using standalone components exclusively
2. **No Global Store Library**: Continue using custom RxJS-based store, not NgRx/Akita
3. **No Server-Side Rendering**: Client-only application
4. **No Internationalization Yet**: English only for MVP
5. **No Feature Flags**: Direct feature implementation, no toggles
6. **No Micro-Frontends**: Monolithic UI application
7. **No Automated Testing Now**: Focus on architecture cleanup first

---

## 5. Migration Strategy (High Level)

### 5.1 Phase 1: Stabilization (Must Do First)

**Objective**: Fix broken functionality, no architectural changes.

| Task | Priority | Risk | Description |
|------|----------|------|-------------|
| Fix AlarmService | P0 | Low | Migrate to DatapointStoreService |
| Fix DiagnosticsService | P0 | Low | Migrate to DatapointStoreService |
| Fix simulator units | P1 | Low | Standardize COG to radians |
| Add missing path | P1 | Low | Add `navigation.headingMagnetic` to contract |

**Estimated Scope**: 4 services, minimal code changes, high confidence.

### 5.2 Phase 2: Dead Code Removal

**Objective**: Remove all unused code to reduce confusion.

| Directory/File | Lines | Action |
|----------------|-------|--------|
| `/pages/chart/` | 484 | Delete entirely |
| `/pages/dashboard/` | 40 | Delete entirely |
| `/services/signalk-client.service.ts` | 207 | Delete |
| `/services/data-store.service.ts` | ~100 | Delete after Phase 1 |
| `/services/waypoint.service.ts` | 135 | Delete |
| `/services/telemetry.ts` | ~50 | Delete |
| `/data-access/chart/chart-map.service.ts` | 621 | Delete |
| `/ui/components/*` | ~600 | Delete entirely |

**Estimated Scope**: ~2,200 lines removed, moderate confidence.

### 5.3 Phase 3: Architectural Alignment

**Objective**: Migrate remaining pages to feature-facade pattern.

| Page | Current State | Target State |
|------|---------------|--------------|
| `/pages/instruments/` | Direct store injection | Feature with facade |
| `/pages/alarms/` | Uses AlarmService | Feature with facade |
| `/pages/diagnostics/` | Uses DiagnosticsService | Feature with facade |
| `/pages/settings/` | Direct preference management | Keep as-is (acceptable) |

**Estimated Scope**: 3 pages refactored, moderate effort.

### 5.4 Phase 4: Contract Cleanup

**Objective**: Remove unused exports, align types with UI.

| Task | Scope |
|------|-------|
| Remove unused type aliases | 5 types |
| Remove unused utility functions | 3 functions |
| Align QualityFlag with UI | 1 enum |
| Enforce PATHS usage in UI | Multiple components |

### 5.5 What Must NOT Be Touched Yet

1. **Chart engine (MapLibre)**: Working correctly, complex to modify
2. **DatapointStoreService**: Central state, stable, don't change
3. **Signal K client**: Working correctly, don't touch
4. **Dashboard/Chart facades**: Recently migrated, stable
5. **Docker/Signal K runtime**: Infrastructure, stable

---

## 6. Milestone Plan

### Milestone 1: Critical Fixes (Stabilization) ✅ COMPLETED

**Goal**: Restore alarm and diagnostics functionality.

**Status**: ✅ **COMPLETED** (2026-01-28)

**Completed Changes**:
- ✅ Fixed AlarmService to use DatapointStoreService
- ✅ Fixed DiagnosticsService to use DatapointStoreService
- ✅ Fixed simulator unit inconsistency (COG now in radians)
- ✅ Added `navigation.headingMagnetic` to contract PATHS
- ✅ Created missing sparkline template/CSS files (build fix)
- ✅ Commented out Google Fonts import (build environment fix)

**Outcome**:
- Alarms now trigger correctly on depth/voltage thresholds
- Diagnostics show real-time data freshness
- All angles use radians consistently

---

### Milestone 2: Dead Code Removal ✅ COMPLETED

**Goal**: Reduce codebase by ~2,200 lines of unused code.

**Status**: ✅ **COMPLETED** (2026-01-28)

**Deleted** (22 files, 4,379 lines):
- ✅ `/pages/chart/` (chart.page.ts/css/html)
- ✅ `/pages/dashboard/` (dashboard.page.ts/css/html)
- ✅ `/services/signalk-client.service.ts`
- ✅ `/services/data-store.service.ts`
- ✅ `/services/waypoint.service.ts`
- ✅ `/services/telemetry.ts`
- ✅ `/data-access/chart/chart-map.service.ts`
- ✅ `/ui/components/` (9 directories: chart-hud, critical-strip, depth-panel, gps-status-card, navigation-panel, power-panel, settings-drawer, system-panel, wind-panel)

**Kept** (still needed by instruments page):
- `/ui/components/instrument-card/`
- `/ui/components/sparkline/`

**Outcome**:
- Single implementation for each concern
- Clearer codebase for future development
- Build verified and working

---

### Milestone 3: Architectural Alignment ✅ COMPLETED

**Goal**: Complete feature-facade migration for all pages.

**Status**: ✅ **COMPLETED** (2026-01-28)

**Completed Changes**:
- ✅ Created `/features/alarms/` with AlarmsFacadeService
  - New alarms page actually displays alarm state from AlarmService
  - Acknowledge button functionality
  - Visual severity indicators (warning/critical)
- ✅ Created `/features/instruments/` (simple container, no facade needed)
- ✅ Created `/features/diagnostics/` with DiagnosticsFacadeService
  - Clean separation of data transformation logic
  - Uses Angular signals and computed values
- ✅ Updated routes to point to new feature locations
- ✅ Deleted old `/pages/instruments/`, `/pages/alarms/`, `/pages/diagnostics/`
- ✅ Settings page kept in `/pages/settings/` (acceptable as-is)

**Outcome**:
- All main features now use feature-facade pattern
- Alarms page now functional (was static placeholder before!)
- Consistent code organization across features
- Build verified and working

---

### Milestone 4: Contract Cleanup

**Goal**: Remove unused code from contract, align types.

**Scope**:
- Remove unused type aliases (Angle, Speed, Depth, Voltage, Current)
- Remove unused functions (isSourceValid, normalizeSourceRef, etc.)
- Align QualityFlag naming with UI (or vice versa)
- Enforce PATHS constant usage in all UI components

**Excluded**:
- No functional changes
- No new path additions

**Expected Outcome**:
- Minimal, focused contract package
- Consistent type usage across packages
- No string literals for Signal K paths

**Risks**:
- Low: Contract is well-isolated
- Breaking changes require rebuild of consuming packages

---

### Milestone 5: Testing Infrastructure

**Goal**: Establish automated testing baseline.

**Scope**:
- Configure Vitest for marine-data-contract
- Add unit tests for navigation calculations
- Add unit tests for timestamp normalization
- Configure test coverage reporting

**Excluded**:
- UI component tests (defer to M6)
- Integration tests
- E2E tests

**Expected Outcome**:
- Core logic has test coverage
- CI can run tests on PR
- Foundation for future test expansion

**Risks**:
- Medium: Requires time investment
- Mitigation: Focus on critical path calculations only

---

### Milestone 6: Dashboard Hardening

**Goal**: Polish dashboard for production use.

**Scope**:
- Add error boundaries to prevent cascade failures
- Add loading states for slow connections
- Add offline indicator
- Improve mobile responsiveness
- Performance optimization (change detection)

**Excluded**:
- New features
- Chart changes
- Alarm changes

**Expected Outcome**:
- Dashboard resilient to connection issues
- Better UX on mobile devices
- Smooth 60fps updates

**Risks**:
- Low: Incremental improvements

---

### Milestone 7: Chart Stabilization

**Goal**: Harden chart for production use.

**Scope**:
- Verify MapLibre memory management
- Add offline tile caching (via service worker)
- Improve waypoint/route UX
- Add chart layer controls

**Excluded**:
- Vector chart support
- S-57/S-63 chart support
- True wind overlay

**Expected Outcome**:
- Chart works reliably offline
- Users can manage waypoints/routes efficiently
- No memory leaks on long sessions

**Risks**:
- Medium: MapLibre complexity
- Mitigation: Focused changes, extensive testing

---

### Milestone 8: True Wind Implementation

**Goal**: Calculate and display true wind from apparent wind + boat motion.

**Scope**:
- Implement TWA/TWS calculation per data-model.md
- Add true wind to simulator output
- Add true wind display to dashboard
- Add true wind overlay to chart

**Excluded**:
- Polars (performance prediction)
- Routing based on wind

**Expected Outcome**:
- Sailors see true wind direction and speed
- Foundation for future sailing features

**Risks**:
- Medium: Math must be correct for safety
- Mitigation: Extensive testing, reference implementations

---

### Milestone Priority Order

| Order | Milestone | Status | Justification |
|-------|-----------|--------|---------------|
| 1 | Critical Fixes | ✅ DONE | Safety issue (alarms), must be first |
| 2 | Dead Code Removal | ✅ DONE | Reduces confusion for all future work |
| 3 | Architectural Alignment | ✅ DONE | Establishes patterns before more features |
| 4 | Contract Cleanup | 🔄 NEXT | Low risk, completes type system cleanup |
| 5 | Testing Infrastructure | ⏳ Pending | Enables confident future changes |
| 6 | Dashboard Hardening | ⏳ Pending | Most-used feature, production polish |
| 7 | Chart Stabilization | ⏳ Pending | Second most-used feature |
| 8 | True Wind | ⏳ Pending | First new sailing feature |

---

## Appendix A: Milestone 2 Deletion Summary ✅ COMPLETED

All files listed below were successfully deleted on 2026-01-28:

```
Deleted (22 files, 4,379 lines):
├── pages/chart/ (3 files)
├── pages/dashboard/ (3 files)
├── services/signalk-client.service.ts
├── services/data-store.service.ts
├── services/waypoint.service.ts
├── services/telemetry.ts
├── data-access/chart/chart-map.service.ts
└── ui/components/ (9 directories, kept instrument-card and sparkline)
```

## Appendix B: Milestone 1 Changes Summary ✅ COMPLETED

**Simulator COG Fix** (basicCruise.ts):
- Removed `toDegrees()` and `wrapDegrees()` functions
- COG now published as radians: `reportedCog` instead of `reportedCogDegrees`

**AlarmService Fix** (alarm.service.ts):
- Changed from `DataStoreService` to `DatapointStoreService`
- Uses `store.observe<number>(path).pipe(filter(...)).subscribe()`

**DiagnosticsService Fix** (diagnostics.service.ts):
- Changed from `DataStoreService` to `DatapointStoreService`
- Updated `DiagnosticEntry` interface to use `lastTimestampMs: number`
- Removed `parseTimestampMs()` function

**Contract Addition** (paths.ts):
- Added `navigation.headingMagnetic` to PATHS

---

**Document Version**: 3.0
**Author**: AI Architecture Analysis
**Last Updated**: 2026-01-28 (After Milestone 3)
**Next Review**: After Milestone 4 completion
