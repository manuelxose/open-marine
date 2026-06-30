---
name: omi-test-bench
description: Work with marine-simulation-platform in complete isolation from production. Use for simulation orchestration, scenario runs, data recording, replay, and isolated validation.
---

# OMI Test Bench

Test-bench duties live in the `marine-simulation-platform` package (there is no separate
`marine-test-bench` package). For scenario/preset/chart/wind/vessel UI work, prefer
`omi-simulation-platform`; use this skill for isolation, ports, persistence and replay.

## When to use
- Changes to `marine-simulation-platform/src/` (orchestration, runs, persistence).
- Isolated simulation runs (`bench` / `closed-loop` commands, API on port 4100).
- Data recording (SQLite store) and replay scenarios.

## Files to inspect
- `marine-simulation-platform/src/cli/index.ts` — entry / commands (`live`, `bench`, `closed-loop`).
- `marine-simulation-platform/src/api/server.ts` — REST + SSE API, `publisherFactory`.
- `marine-simulation-platform/src/runtime/run-manager.ts` — run lifecycle, sampling, persistence.
- `marine-simulation-platform/src/persistence/` — SQLite / memory stores.

## Files to avoid
- Production Signal K runtime (use separate ports; API defaults to 4100).
- Real hardware drivers.
- Production databases.

## Rules
1. Ports must not overlap production (API 4100 vs `signalk-runtime` 3000).
2. Database path must be local/test-only (e.g. `./data/simulation-platform.sqlite` or in-memory).
3. Never control real hardware from the bench. Signal K publishing is opt-out via
   `SIMULATION_PUBLISH_SIGNALK=0`.
4. Retention rules must be explicit (`BENCH_RETENTION_DAYS`, `BENCH_RETENTION_MAX_BYTES`).

## Validation
- `npm run test:simulation` (root) or `cd marine-simulation-platform && npm test && npm run build`.
- Run `npm run start:simulation-bench` and verify it binds 4100, not production ports.

## Expected output
- Isolation confirmation
- Port and DB path check
- Validation result
