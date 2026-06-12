---
name: omi-sensor-change
description: Implement Open Marine sensor, gateway, simulator, or Signal K contract changes. Use for GPS, IMU, AIS, DataPoint, PATHS, publishers, Raspberry scripts, or simulator scenarios.
---

# OMI Sensor Change

1. Start from `marine-data-contract` for shared paths, units, quality and `DataPoint` types.
2. For gateway changes, follow existing adapter and publisher patterns in `marine-sensor-gateway/src`.
3. For simulator changes, keep scenarios deterministic and publish through existing HTTP/WebSocket publishers.
4. For Raspberry scripts, preserve CLI flags, env vars and systemd compatibility.
5. Validate the narrowest affected packages:
   - Contract: `cd marine-data-contract && npm run test:run && npm run build`
   - Gateway: `cd marine-sensor-gateway && npm test && npm run build`
   - Simulator: `cd marine-data-simulator && npm run build`

Do not duplicate Signal K path strings when `PATHS` can be extended.
