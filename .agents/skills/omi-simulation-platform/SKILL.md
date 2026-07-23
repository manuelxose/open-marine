---
name: omi-simulation-platform
description: Build the best simulation platform and its diagnostics UI/UX. Use for scenarios, editable presets, signal charts, true/apparent wind vectors, vessel movement on the map, and motor/autopilot signal visualization.
---

# OMI Simulation Platform

The simulation platform is the test bench for the autopilot and instruments. Backend package is
`marine-simulation-platform` (API on port 4100, commands `live` / `bench` / `closed-loop`); the UI
lives in `marine-instrumentation-ui` under `features/diagnostics`. A scenario is only useful if it
makes the **velero move on the map**, shows **true and apparent wind vectors**, and lets you read the
**motor/autopilot signals** on legible charts.

## When to use
- Scenarios and **editable presets** (any tunable beyond seed/speed/duration).
- Signal charts (uplot) that show what would go to the autopilot and the motor signals.
- Vessel movement on the chart map; true vs apparent wind vectors.
- True/apparent wind physics, position integration, Signal K publishing from a run.

## Key files
Backend (`marine-simulation-platform/src/`):
- `scenarios/presets.ts` — the 13 presets and their `parameters`.
- `scenarios/wind-scenario-generator.ts` — the reference pattern for tunable parameters.
- `core/signal-generator.ts` — signal computation: wind, position, autopilot profiles.
- `core/channel-registry.ts` — channel → contract `PATHS` mapping.
- `core/timeline-engine.ts` — ramp/fault/marker actions.
- `api/server.ts` — REST + SSE; `publisherFactory` wires Signal K publishing.

UI (`marine-instrumentation-ui/src/app/`):
- `features/diagnostics/{diagnostics.page.ts, simulation-facade.service.ts, simulation-api.service.ts}`
- `shared/components/uplot-chart/uplot-chart.component.ts` — the signal charts.
- `features/chart/services/{maplibre-engine,chart-facade}.service.ts` — map, vessel, wind vectors.
- `state/datapoints/datapoint.selectors.ts` — Signal K path selectors (AWS/AWA/TWS/TWD).

Contract: `marine-data-contract/src/paths.ts` — single source of truth for wind/nav paths.

## Golden rules (UI/UX first)
1. **One data bus.** A running scenario must publish to Signal K (or be injected into
   `DatapointStoreService`) on the **same contract `PATHS` the UI reads** — otherwise the map and
   instruments never move. Verify selector path == channel-registry path == contract path.
2. **True ≠ apparent.** Compute apparent wind (AWS/AWA) from true wind (TWS/TWD) + boat SOG/heading by
   vector addition; never publish AWS==TWS. Publish TWD on the canonical path
   `environment.wind.directionTrue`.
3. **Editable presets.** Add real `parameters` to every preset and make `signal-generator`/
   `timeline-engine` consume them; the UI parameter grid renders them automatically.
4. **Vessel always moves.** Every scenario with `nav.position` must integrate lat/lon over time
   (deterministic, seeded), not only `basic-cruise`.
5. **Legible charts.** uplot needs a `ResizeObserver` (`setSize`) to avoid clipping; use per-unit
   scales, crosshair/tooltip, legend, and target-vs-actual limit lines for autopilot signals; render
   booleans (`drive`, `fault`) as step plots.
6. **No hardcoded colors.** Style via Glass Bridge `--gb-*` and `--chart-overlay-*` tokens; the only
   exception is MapLibre WebGL paint (mirror a token value in hex + comment).

## Validation
- Contract paths changed: `cd marine-data-contract && npm run test:run && npm run build`.
- Simulator: `npm run test:simulation`.
- UI: `npm run build:ui`.
- End-to-end: `npm run start:simulation-bench` + `npm run start:ui`, open Diagnostics, pick a preset,
  change its variables, run, and confirm the vessel moves, both wind vectors render, and the
  motor/autopilot charts are readable. Repeat with the backend down to validate the offline fallback.
