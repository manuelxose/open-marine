---
name: omi-sensor-change
description: Implement Open Marine sensor, gateway, simulator, or Signal K contract changes. Use for GPS, IMU, AIS, wind, DataPoint, PATHS, publishers, Raspberry scripts, or simulator scenarios.
---

# OMI Sensor Change

1. Start from the contract `marine-data-contract/src/`: `paths.ts` (`PATHS`), `types.ts` (`DataPoint`),
   `units.ts`, `quality.ts`. Extend `PATHS`; never duplicate Signal K path strings.
2. Gateway: follow existing adapter/publisher patterns in `marine-sensor-gateway/src`. Python
   operational scripts live in `rpi/omi-imu/` — preserve CLI flags, env vars and systemd compatibility.
3. Simulator: keep scenarios deterministic; publish through the existing HTTP/WebSocket publishers in `marine-simulation-platform`.
4. Preserve `vessels.self`/`self` context normalization and use the contract timestamp helpers in publishers.
5. Distinguish onboard wind sensors (`PATHS.environment.wind.*`) from remote forecast fields.
   Open-Meteo/OpenWeatherMap/Copernicus data belongs to `marine-chart-engine` and map overlays;
   do not republish forecast grids as live vessel sensor values.
6. Validate the narrowest affected package:
   - Contract: `cd marine-data-contract && npm run test:run && npm run build`
   - Gateway: `cd marine-sensor-gateway && npm test && npm run build`
   - Simulator: `npm run test:simulation` (or `cd marine-simulation-platform && npm run build`)

Full map, data flow and key files: `.claude/references/architecture.md` (load on demand).
