# Setup & Development Guide

**Last Updated:** 2026-01-28

Complete step-by-step guide for setting up the Open Marine Instrumentation project locally and understanding the development workflow.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 20 LTS** ([download](https://nodejs.org/))
  - Verify: `node --version` (should be v20.x.x)
  - Verify npm: `npm --version` (should be ~10.x)

- **Docker Desktop** ([Windows/Mac](https://www.docker.com/products/docker-desktop)) or **Docker Engine** ([Linux](https://docs.docker.com/engine/install/))
  - Verify: `docker --version` and `docker compose --version`

- **Git** ([download](https://git-scm.com/))
  - Verify: `git --version`

- **Text Editor** - VS Code recommended with:
  - [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

## Complete Setup (First Time)

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/open-marine.git
cd open-marine
```

### Step 2: Verify Directory Structure

```bash
# Should show these folders:
ls -la
# ├── marine-data-contract/
# ├── marine-data-simulator/
# ├── marine-sensor-gateway/
# ├── marine-instrumentation-ui/
# ├── signalk-runtime/
# ├── docs/
# └── README.md
```

### Step 3: Start Docker Services

Open your first terminal and start Signal K server:

```bash
cd signalk-runtime
docker compose up -d

# Verify it started
docker compose logs -f signalk
# Should show: "SignalK Server running on port 3000"
# Ctrl+C to exit logs

# Test connectivity
curl http://localhost:3000
# Should return HTML page
```

### Step 4: Build Contract Package

Open second terminal and build the contract (foundational package):

```bash
cd marine-data-contract
npm install
npm run build

# Should output:
# > tsc -p tsconfig.json
# (no errors)

# Verify output
ls dist/
# Should show: index.d.ts, index.js, etc.
```

### Step 5: Run Simulator

In the second terminal, start the data simulator:

```bash
cd ../marine-data-simulator
npm install
npm run dev

# Should output:
# Simulator started, publishing to http://localhost:3000/signalk/v1/messages
# Publishing deltas every 1000ms...
# [1000ms] Position: 60.17, 24.94 | SOG: 3.2 m/s | Depth: 2.5 m | ...
# [2000ms] Position: 60.17, 24.94 | SOG: 3.3 m/s | Depth: 2.4 m | ...
```

**Leave this running** - it continuously publishes test data to Signal K.

### Step 6: Start Angular UI

Open third terminal and run the Angular development server:

```bash
cd marine-instrumentation-ui
npm install
npm start

# Should output:
# ✔ Compiled successfully
# ⠋ Building...
# ⠙ Building...
# Application bundle generated successfully in 3.24 seconds.
# 
# ✔ Application bundle generated successfully
# Watch mode enabled. Watching for file changes in the workspace...
```

### Step 7: Open in Browser

Navigate to **http://localhost:4200** in your browser.

You should see:
1. **Dashboard** with real-time gauges (speed, heading, depth, wind, battery)
2. **Live data** updating every second from the simulator
3. **Navigation controls** to switch between pages

**Success!** ✅ All systems operational.

---

## What Happens After Setup

### Data Flow (What You're Seeing)

```
1. marine-data-simulator (Terminal 2)
   └─ Publishes HTTP POST delta messages to Signal K every 1 Hz
   └─ Example: { position: 60.17°N, speedOverGround: 3.2 m/s, ... }

2. signalk-runtime (Docker, Terminal 1)
   └─ Receives simulator data via HTTP
   └─ Aggregates all sources
   └─ Broadcasts via WebSocket to all connected clients

3. marine-instrumentation-ui (Terminal 3)
   └─ Connects to Signal K via WebSocket
   └─ Receives delta updates
   └─ Stores in DatapointStoreService
   └─ Dashboard components display live data
```

### Terminals You'll Need

Keep these running during development:

| Terminal | Command | Purpose | Can Stop? |
|----------|---------|---------|-----------|
| 1 | `cd signalk-runtime && docker compose up -d` | Signal K server | No - needed by everything |
| 2 | `cd marine-data-simulator && npm run dev` | Test data | Optional - can use real sensors later |
| 3 | `cd marine-instrumentation-ui && npm start` | Angular dev server | No - for local development |

---

## Common Development Tasks

### Running Tests

```bash
# Unit tests (Vitest)
cd marine-instrumentation-ui
npm test

# Run specific test file
npm test -- datapoint-store.service.spec.ts

# Watch mode (re-run on file change)
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Linting & Formatting

```bash
# Check all files for style issues
npm run lint

# Auto-fix formatting issues
npm run format

# Fix specific file
npm run format -- src/app/features/dashboard/dashboard.page.ts
```

### Building for Production

```bash
# Build Angular app
cd marine-instrumentation-ui
npm run build

# Output in dist/marine-instrumentation-ui/browser/
# Ready to deploy to web server
```

### Building Contract

```bash
# If you modify marine-data-contract
cd marine-data-contract
npm run build

# Then rebuild dependent packages
cd ../marine-instrumentation-ui && npm install && npm run build
cd ../marine-data-simulator && npm install && npm run build
```

---

## Troubleshooting Setup Issues

### Signal K Won't Start

```bash
# Check Docker is running
docker ps

# Check logs
docker compose -f signalk-runtime/docker-compose.yml logs

# Restart
docker compose -f signalk-runtime/docker-compose.yml down
docker compose -f signalk-runtime/docker-compose.yml up -d

# Check port 3000 is free
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

### Simulator Won't Connect

```bash
# Verify Signal K is running
curl http://localhost:3000
# Should return HTML

# Check simulator logs
# You should see: "Publishing to http://localhost:3000/signalk/v1/messages"

# If error: "Cannot POST /signalk/v1/messages"
# → Signal K server not ready, wait 5 seconds and restart simulator
```

### UI Won't Load

```bash
# Check Angular dev server is running
# You should see: "Application bundle generated successfully"

# Clear cache
cd marine-instrumentation-ui
rm -rf node_modules
npm install
npm start

# Check http://localhost:4200 opens
# Check browser console (DevTools → Console) for errors
```

### No Data in Dashboard

1. Check WebSocket connection:
   - Browser DevTools → Network tab
   - Filter by "WS"
   - Should see `ws://localhost:3000/signalk/v1/stream` connected

2. Check simulator is sending:
   - Terminal 2 should show: `[1000ms] Publishing...`

3. Check data store:
   - Browser Console: `ng.probe(document.querySelector('app-root')).injector.get(DatapointStoreService).state$.value`
   - Should show a Map with data points

---

## Development Workflow

### Making Code Changes

1. **Edit code** in your editor
2. **File saved** → Hot reload triggers automatically
3. **Browser refreshes** with new code (Angular dev server)
4. **See changes immediately** at http://localhost:4200

### Adding a New Feature

Example: Adding a new data path

1. **Add path to contract:**
   ```typescript
   // marine-data-contract/src/paths.ts
   navigation: {
     speedOverGround: 'navigation.speedOverGround',
     courseOverGroundTrue: 'navigation.courseOverGroundTrue',
     headingMagnetic: 'navigation.headingMagnetic',  // NEW
   }
   ```

2. **Build contract:**
   ```bash
   cd marine-data-contract
   npm run build
   ```

3. **Update simulator:**
   ```typescript
   // marine-data-simulator/src/scenarios/basicCruise.ts
   values: [
     { path: PATHS.navigation.headingMagnetic, value: 0.5 },  // NEW
   ]
   ```

4. **Use in UI:**
   ```typescript
   // Component
   this.heading$ = this.datapoints.getDatapoint$(PATHS.navigation.headingMagnetic);
   ```

5. **Test:**
   ```bash
   npm run lint     # Check TypeScript
   npm test         # Run tests
   npm start        # View in browser
   ```

### Debugging

#### Browser DevTools

```javascript
// In Console tab, get current data
const store = ng.probe(document.querySelector('app-root'))
  .injector.get(DatapointStoreService);

// Get specific datapoint
store.getDatapoint$(PATHS.navigation.speedOverGround)
  .subscribe(dp => console.log(dp));

// Get all data
console.log(store.state$.value);
```

#### Network Inspection

1. DevTools → Network tab
2. Filter by "WS" to see WebSocket
3. Click on `stream` connection
4. Messages tab shows delta updates in real-time

#### Console Errors

- Check browser Console tab for JavaScript errors
- Check `npm start` terminal for Angular compiler errors
- Check simulator terminal for data publishing errors

---

## Project Structure After Setup

```
open-marine/
├── node_modules/              (created after npm install)
│
├── marine-data-contract/
│   ├── src/                   (Source code)
│   ├── dist/                  (Compiled output)
│   └── node_modules/
│
├── marine-data-simulator/
│   ├── src/
│   ├── dist/
│   └── node_modules/
│
├── marine-instrumentation-ui/
│   ├── src/                   (Angular app code)
│   ├── dist/                  (Build output)
│   ├── node_modules/
│   └── angular.json
│
├── marine-sensor-gateway/
│   ├── src/
│   ├── dist/
│   └── node_modules/
│
├── signalk-runtime/
│   ├── docker-compose.yml
│   └── data/                  (Persistent volume)
│
└── docs/
    ├── architecture.md
    ├── data-model.md
    ├── roadmap.md
    └── PROJECT_STATE.md
```

---

## IDE Configuration (VS Code)

### Recommended Extensions

```json
// In VS Code, search Extensions for:
"Angular Language Service"           // template editing
"ESLint"                             // linting
"Prettier"                           // formatting
"TypeScript Vue Plugin (Volar)"      // if using Vue (optional)
"Docker"                             // Docker support
```

### VS Code Settings

Create or update `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": ["typescript", "html"],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Launch Configurations

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost:4200",
      "url": "http://localhost:4200",
      "webRoot": "${workspaceFolder}/marine-instrumentation-ui/src",
      "sourceMapPathOverride": {
        "webpack:///*": "${webspaceFolder}/marine-instrumentation-ui/*"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Simulator",
      "program": "${workspaceFolder}/marine-data-simulator/src/index.ts",
      "outFiles": ["${workspaceFolder}/marine-data-simulator/dist/**/*.js"],
      "runtimeArgs": ["--loader=tsx"]
    }
  ]
}
```

---

## Cleaning Up

### Clear Development Artifacts

```bash
# Remove node_modules (clears disk space)
rm -rf node_modules
find . -type d -name node_modules -exec rm -rf {} +

# Remove build outputs
find . -type d -name dist -exec rm -rf {} +

# Remove package locks (will reinstall on next npm install)
find . -name package-lock.json -delete
```

### Stop Services

```bash
# Stop Docker
docker compose -f signalk-runtime/docker-compose.yml down

# Kill Node processes
# Terminal: Ctrl+C in both simulator and Angular terminal
```

### Wipe Everything and Start Fresh

```bash
# Full clean rebuild
cd open-marine

# Remove all generated files
rm -rf node_modules */node_modules */dist dist package-lock.json

# Reinstall everything
npm install
cd marine-data-contract && npm install && npm run build
cd ../marine-data-simulator && npm install
cd ../marine-instrumentation-ui && npm install

# Restart services
cd ../..
docker compose -f signalk-runtime/docker-compose.yml up -d
```

---

## Next Steps

After completing setup:

1. **Read [CLAUDE.md](../CLAUDE.md)** - Understand conventions and patterns
2. **Read [docs/architecture.md](./architecture.md)** - Learn system design
3. **Read [docs/data-model.md](./data-model.md)** - Understand data types
4. **Explore the code** - Start with `src/app/features/dashboard/`
5. **Make a small change** - Edit a component, see hot reload
6. **Run tests** - `npm test` to verify everything works
7. **Check [docs/roadmap.md](./roadmap.md)** - See what's planned

---

## Common Commands Reference

```bash
# Build
npm run build                          # Production build
npm run watch                          # Watch mode

# Development
npm start                              # Dev server with HMR
npm run dev                            # Run with tsx (simulator)

# Quality
npm run lint                           # ESLint check
npm run format                         # Prettier auto-fix
npm test                               # Vitest run
npm test -- --watch                    # Vitest watch

# Docker
docker compose up -d                   # Start Signal K background
docker compose down                    # Stop Signal K
docker compose logs -f                 # View logs

# Git
git status                             # Current changes
git add .                              # Stage changes
git commit -m "message"                # Commit
git push origin main                   # Push to remote
```

---

## Getting Help

- **Architecture questions?** → See [CLAUDE.md](../CLAUDE.md)
- **Data types?** → See [docs/data-model.md](./data-model.md)
- **System design?** → See [docs/architecture.md](./architecture.md)
- **Feature planning?** → See [docs/roadmap.md](./roadmap.md)
- **System health?** → See [docs/PROJECT_STATE.md](./PROJECT_STATE.md) (read-only)

---

**Ready to develop!** 🚀
