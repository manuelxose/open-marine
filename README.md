# Open Marine Instrumentation

Real-time marine instrumentation dashboard for sailboats using Signal K protocol. An open-source platform providing navigation, wind, depth, and electrical data visualization with route planning and weather overlay support.

**Latest Update:** 2026-01-28 | Status: MVP Complete (Dashboard, Chart, Instruments working)

---

## 🚀 Quick Start (5 minutes)

### Prerequisites

- **Node.js 20 LTS** ([download](https://nodejs.org/))
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Git** for cloning the repository

### Quickstart Sequence

```bash
# 1️⃣ Clone and enter project
git clone https://github.com/you/open-marine.git
cd open-marine

# 2️⃣ Start Signal K server (Terminal 1)
cd signalk-runtime
docker compose up -d
echo "Waiting for Signal K..."
sleep 3
curl http://localhost:3000  # Should return HTML

# 3️⃣ Build contract and simulator (Terminal 2)
cd ../marine-data-contract && npm install && npm run build
cd ../marine-data-simulator && npm install && npm run dev

# 4️⃣ Start Angular UI (Terminal 3)
cd ../marine-instrumentation-ui && npm install && npm start
```

**After startup:**
- Open browser to **http://localhost:4200**
- Dashboard loads with simulated data
- Observe real-time updates from Signal K
- Switch between routes: Dashboard → Chart → Instruments → Alarms → Settings

---

## 📡 System Architecture

```
Sensors/Simulator → Signal K Server (Docker) → WebSocket → Angular Dashboard
                                    ↓
                            REST API (data queries)
```

### Data Flow

1. **Simulator** publishes marine data to Signal K (HTTP delta messages)
2. **Signal K Server** aggregates all sources, maintains state
3. **UI WebSocket** connects to Signal K stream (ws://localhost:3000/signalk/v1/stream)
4. **DatapointStoreService** normalizes data and broadcasts to components
5. **Dashboard** displays live position, heading, wind, depth, battery

### Component Breakdown

| Component | Purpose | Status |
|-----------|---------|--------|
| **marine-data-contract** | Type definitions & Signal K paths | ✅ Stable |
| **marine-data-simulator** | Generates realistic cruise data | ✅ Functional |
| **marine-sensor-gateway** | Adapters for NMEA0183/2000 (stub) | ⏳ Future |
| **marine-instrumentation-ui** | Angular dashboard app | ✅ MVP Complete |
| **signalk-runtime** | Docker Signal K server | ✅ Stable |

---

## 📋 What Works

### Features ✅

- **Dashboard** - Real-time display of navigation, wind, depth, electrical data
- **Chart** - MapLibre GL JS vessel tracking with waypoint/route management
- **Instruments** - Dedicated views for speed, heading, depth, wind, battery
- **Alarms** - Threshold-based alerts (depth, battery voltage)
- **Diagnostics** - System health and data source status
- **Settings** - Units preference (metric/imperial), theme (light/dark), shallow-water threshold
- **WebSocket Integration** - Live data streaming from Signal K
- **TypeScript** - Full type safety, strict mode enabled
- **Code Quality** - ESLint + Prettier enforced

### Data Paths Supported 📍

```
navigation.position                      (lat/lon)
navigation.speedOverGround              (m/s)
navigation.courseOverGroundTrue         (radians)
navigation.headingTrue                  (radians)
environment.depth.belowTransducer       (meters)
environment.wind.angleApparent          (radians)
environment.wind.speedApparent          (m/s)
electrical.batteries.house.voltage      (volts)
electrical.batteries.house.current      (amps)
```

---

## 🛠️ Development

### Build & Run Each Package

| Package | Commands | Purpose |
|---------|----------|---------|
| **contract** | `npm run build` `npm run lint` | Compile TypeScript types |
| **simulator** | `npm run dev` `npm run build` | Generate test data |
| **gateway** | `npm run dev` `npm run build` | Sensor adapters (stub) |
| **ui** | `npm start` `npm run build` `npm test` | Dashboard application |
| **Signal K** | `docker compose up -d` `logs -f` | Server container |

### Common Development Tasks

```bash
# Format all code
cd marine-instrumentation-ui && npm run format

# Lint the UI
cd marine-instrumentation-ui && npm run lint

# Run tests
cd marine-instrumentation-ui && npm test

# Full rebuild
npm run clean   # If you added this script
npm install
npm run build
```

### Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Signal K Web UI | http://localhost:3000 | Server admin console |
| Signal K REST API | http://localhost:3000/signalk/v1 | Query data |
| Signal K WebSocket | ws://localhost:3000/signalk/v1/stream | Live stream |
| Angular App | http://localhost:4200 | Dashboard |
| Mock Server | http://localhost:4200 | Optional local dev |

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide (detailed conventions, architecture decisions)
- **[docs/architecture.md](docs/architecture.md)** - System design & responsibilities
- **[docs/data-model.md](docs/data-model.md)** - Data types, unit conversions, Signal K paths
- **[docs/roadmap.md](docs/roadmap.md)** - Development timeline & milestones
- **[docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)** - Current state, known issues, health assessment (⚠️ System Generated)

---

## 🏗️ Architecture Highlights

### Layered Design

```
Presentation (Features: dashboard, chart, instruments, alarms)
    ↓
Shared Components (sparkline, panels, instruments)
    ↓
State Layer (DatapointStoreService - SINGLE SOURCE OF TRUTH)
    ↓
Data Access (SignalK WebSocket client)
    ↓
Core Utils (formatting, calculations)
    ↓
Contract (shared types & paths)
```

### Key Design Patterns

- **Standalone Components** - Angular 21.1 with no NgModules
- **Lazy Loading** - Routes load components on-demand
- **RxJS Observables** - All data flows via Observables
- **Facade Pattern** - Features orchestrate via facade services
- **Custom Store** - RxJS-based state (not NgRx)
- **Type Safety** - TypeScript strict mode, no `any` types

### Single Source of Truth

All marine data flows through **`DatapointStoreService`**:
```typescript
// How components consume data
this.depth$ = this.datapoints.getDatapoint$(PATHS.environment.depth.belowTransducer);
// subscribe and render
```

---

## 🚨 Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Dead code accumulation | Medium | ~2,200 lines in `/services/`, `/ui/`, `/data-access/chart/` |
| Unit inconsistency in simulator | High | COG published in degrees, heading in radians |
| Missing Signal K path | Medium | `navigation.headingMagnetic` not defined in contract |
| Test coverage | Low | Minimal automated tests exist |
| Offline support | Low | Infrastructure ready, no caching implemented |

**See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for detailed health assessment.**

---

## 📦 Technology Stack

### Frontend
- **Angular 21.1** - Framework
- **TypeScript 5.9** - Language
- **MapLibre GL JS 5.16** - Maps
- **RxJS 7.8** - Reactive programming
- **Prettier 3.3** - Code formatting
- **ESLint 8.57** - Linting
- **Vitest 4.0** - Testing

### Backend
- **Node.js 20 LTS** - Runtime
- **TypeScript 5.5** - Language
- **Signal K 4.x** - Data protocol (Docker)
- **Docker** - Containerization

### Development
- **npm 10.9** - Package manager
- **Angular CLI 21.1** - Build tool
- **tsx** - TypeScript execution
- **esbuild** - Bundler

---

## 🤝 Contributing

### Code Standards

1. **Strict TypeScript** - No `any` types, strict mode enabled
2. **ESLint + Prettier** - Run `npm run format && npm run lint` before committing
3. **Type Safety** - Use imports from `@omi/marine-data-contract`
4. **Observable Patterns** - Prefer RxJS over promises
5. **Single Responsibility** - Keep services focused
6. **Documentation** - Update [CLAUDE.md](CLAUDE.md) for architectural changes

### Adding a New Feature

1. Create folder under `/features/{feature-name}`
2. Add page component: `{feature-name}.page.ts`
3. Add facade service: `{feature-name}-facade.service.ts`
4. Create components subfolder for UI
5. Add route in `app.routes.ts` with lazy loading
6. Subscribe to `DatapointStoreService` for data
7. Run linter: `npm run lint`

### Testing

```bash
cd marine-instrumentation-ui
npm test                    # Run Vitest
npm test -- --ui           # Open test UI
npm run coverage            # Code coverage
```

---

## 📸 Screenshots

> Placeholder images - See `docs/screenshots/` folder

- Dashboard overview (real-time gauges)
- Dark mode theme
- Chart with waypoints
- Alarm notifications

---

## 📝 License

(Add your license here - MIT recommended for open source)

---

## 🆘 Troubleshooting

### Signal K Not Starting?

```bash
cd signalk-runtime
docker compose logs signalk
# Check port 3000 is available
# Restart: docker compose down && docker compose up -d
```

### No Data Appearing?

1. Check Signal K is running: `curl http://localhost:3000`
2. Check simulator is sending: Terminal should show HTTP POST messages
3. Check WebSocket connection: Browser DevTools → Network tab → filter "WS"
4. Check console errors: Browser DevTools → Console tab

### Build Errors?

```bash
# Full clean rebuild
rm -rf node_modules package-lock.json dist
npm install
npm run build
npm run lint
```

### Hot Reload Not Working?

Ensure you're running `npm start` (development server), not `npm run build`.

---

## 📧 Support

- **Issues:** Create GitHub issue with error logs and reproduction steps
- **Questions:** Check [CLAUDE.md](CLAUDE.md) for conventions
- **Architecture:** See [docs/architecture.md](docs/architecture.md)

---

**Happy sailing! ⛵**
