# Open Marine — Validation Matrix

On-demand reference for CI and local validation commands. Load only when validation strategy is unclear.

## Per-package commands

| Package | Test | Build | Notes |
|---|---|---|---|
| `marine-data-contract` | `npm run test:run` | `npm run build` | Must pass before any downstream change |
| `marine-sensor-gateway` | `npm test` | `npm run build` | Contract must be built first |
| `marine-data-simulator` | `npm test` (if present) | `npm run build` | Deterministic output check |
| `marine-instrumentation-ui` | `npm run test:ci` | `npm run build` | CSS budget warnings are pre-existing |
| `marine-autopilot-engine` | `npm test` | `npm run build` | Simulator backend: `AP_MOTOR_BACKEND=sim` |
| `marine-test-bench` | `npm test` | `npm run build` | Isolated DB, isolated ports |
| `marine-chart-toolkit` | — | `npm run build` | CLI tool; validate with `node dist/index.js --help` |
| `marine-tile-server` | — | `npm run build` | Validate with `node dist/index.js` (starts server) |
| `signalk-runtime` | — | — | `docker ps --filter name=signalk` |

## Root orchestration

- `npm run init` — cross-platform setup
- `npm run status` — runtime status check
- `npm run build:contract` — shorthand
- `npm run build:ui` — shorthand
- `npm run start:signalk` — Docker runtime
- `npm run start:ui` — LAN dev server

## CI coverage check

CI must include:
1. `marine-data-contract` — test + build
2. `marine-sensor-gateway` — test + build
3. `marine-data-simulator` — build
4. `marine-instrumentation-ui` — lint + test:ci + build
5. `marine-autopilot-engine` — test + build
6. `marine-test-bench` — test + build
7. `marine-chart-toolkit` — build
8. `marine-tile-server` — build

Missing any of the above = CI gap.
