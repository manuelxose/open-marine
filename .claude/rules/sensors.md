---
paths:
  - "marine-sensor-gateway/**/*"
  - "scripts/start-{ais,gps,imu}*"
---

# Sensor Rules

- Keep shared TypeScript data shapes aligned with `marine-data-contract`.
- GPS, IMU and AIS publishers should publish to Signal K through existing publisher/adaptor patterns.
- Raspberry Python scripts under `marine-sensor-gateway/rpi/omi-imu/` are operational scripts; preserve CLI flags and env compatibility.
- Validate TypeScript gateway changes with `cd marine-sensor-gateway && npm test && npm run build`.
- Do not put Raspberry credentials in tracked scripts or docs.
