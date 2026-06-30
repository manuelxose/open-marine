---
name: omi-simulation-platform
description: Build simulation platform and diagnostics UI. Use for scenarios, editable presets, signal charts, wind vectors, vessel movement, and motor/autopilot signal visualization.
---

# OMI Simulation Platform

Backend: `marine-simulation-platform` (API port 4100). UI: `marine-instrumentation-ui` → `features/diagnostics`.

## When to use

- Scenarios and editable presets (any tunable beyond seed/speed/duration).
- Signal charts (uplot/oscilloscope) for autopilot/motor signals.
- Vessel movement on chart map; true vs apparent wind vectors.
- Signal K publishing from a run.

## Key files

Backend: `scenarios/presets.ts`, `scenarios/wind-scenario-generator.ts`, `core/signal-generator.ts`, `core/channel-registry.ts`, `core/timeline-engine.ts`, `api/server.ts`.

UI: `features/diagnostics/{diagnostics.page.ts,simulation-facade.service.ts}`, `shared/components/uplot-chart/`, `features/chart/services/{maplibre-engine,chart-facade}.service.ts`.

Contract: `marine-data-contract/src/paths.ts`.

## Golden rules

1. One data bus: scenario publishes to Signal K on contract PATHS the UI reads.
2. True ≠ Apparent: compute AWS/AWA from TWS/TWD + boat SOG/heading. Publish TWD on `environment.wind.directionTrue`.
3. Editable presets: add `parameters` to presets; generator/timeline consume them.
4. Vessel always moves: integrate lat/lon over time (deterministic, seeded).
5. Legible charts: uplot needs `ResizeObserver`; per-unit scales, crosshair, legend, limit lines. Booleans as step plots.
6. No hardcoded colors: Glass Bridge `--gb-*` tokens (MapLibre WebGL paint is the only exception).

## Validation

- Contract: `cd marine-data-contract && npm run test:run && npm run build`
- Simulator: `npm run test:simulation`
- UI: `npm run build:ui`
- E2E: `npm run start:simulation-bench` + `npm run start:ui`, test with backend down for offline fallback.
