---
name: omi-test-bench
description: Work with marine-simulation-platform in complete isolation from production. Use for simulation orchestration, scenario runs, data recording, replay, and isolated validation.
---

# OMI Test Bench

Test-bench duties live in `marine-simulation-platform`. For scenario/preset/chart/wind/vessel UI, prefer `omi-simulation-platform`; use this skill for isolation, ports, persistence, replay.

## When to use

- Changes to `marine-simulation-platform/src/` (orchestration, runs, persistence).
- Isolated simulation runs (`bench`/`closed-loop` commands, API port 4100).
- Data recording (SQLite store) and replay scenarios.

## Key files

- `marine-simulation-platform/src/cli/index.ts` — commands (`live`, `bench`, `closed-loop`)
- `marine-simulation-platform/src/api/server.ts` — REST + SSE API, publisherFactory
- `marine-simulation-platform/src/runtime/run-manager.ts` — lifecycle, sampling, persistence
- `marine-simulation-platform/src/persistence/` — SQLite/memory stores

## Rules

1. Ports must not overlap production (API 4100 vs signalk-runtime 3000).
2. Database path local/test-only (e.g. `./data/simulation-platform.sqlite` or in-memory).
3. Never control real hardware from bench. Signal K publishing opt-out: `SIMULATION_PUBLISH_SIGNALK=0`.
4. Retention rules explicit (`BENCH_RETENTION_DAYS`, `BENCH_RETENTION_MAX_BYTES`).

## Validation

- `npm run test:simulation` or `cd marine-simulation-platform && npm test && npm run build`
- Run `npm run start:simulation-bench` and verify binds 4100, not production ports.
