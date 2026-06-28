---
name: omi-test-bench
description: Work with marine-test-bench in complete isolation from production. Use for simulation orchestration, data recording, replay, and isolated validation.
---

# OMI Test Bench

## When to use
- Changes to `marine-test-bench/src/`
- Isolated simulation runs
- Data recording and replay scenarios

## Files to inspect
- `marine-test-bench/src/index.ts` — entry
- `marine-test-bench/src/` — orchestration, DB, publishers

## Files to avoid
- Production Signal K runtime (use separate Docker Compose or ports)
- Real hardware drivers
- Production databases

## Rules
1. Ports must not overlap production (check `marine-test-bench` config vs `signalk-runtime`).
2. Database path must be local/test-only (e.g., `./test-bench.db` or in-memory).
3. Never control real hardware from test bench.
4. Retention rules must be explicit (time or size limit).

## Validation
- `cd marine-test-bench && npm test && npm run build`
- Run `npm run dev` and verify it does not bind to production ports.

## Expected output
- Isolation confirmation
- Port and DB path check
- Validation result
