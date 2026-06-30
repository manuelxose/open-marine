---
name: omi-sensor-change
description: Implement sensor, gateway, simulator, or Signal K contract changes. Use for GPS, IMU, AIS, wind, DataPoint, PATHS, publishers, Raspberry scripts, or simulator scenarios.
---

# OMI Sensor Change

1. Start from contract `marine-data-contract/src/`: `paths.ts` (PATHS), `types.ts` (DataPoint), `units.ts`, `quality.ts`. Extend PATHS; never duplicate Signal K path strings.
2. Gateway: follow existing adapter/publisher patterns in `marine-sensor-gateway/src`. Python scripts in `rpi/omi-imu/` — preserve CLI flags, env vars, systemd compatibility.
3. Simulator: keep scenarios deterministic; publish through existing HTTP/WebSocket publishers.
4. Preserve `vessels.self`/`self` context normalization; use contract timestamp helpers.
5. Validate narrowest affected package:
   - Contract: `cd marine-data-contract && npm run test:run && npm run build`
   - Gateway: `cd marine-sensor-gateway && npm test && npm run build`
   - Simulator: `npm run test:simulation`

Full architecture reference: `.claude/references/architecture.md` (load on demand).
