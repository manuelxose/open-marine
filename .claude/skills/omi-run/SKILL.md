---
name: omi-run
description: Run and verify Open Marine locally or against the Raspberry without rediscovering package commands. Use when starting Signal K, the Angular UI, sensor services, or checking the running app.
---

# OMI Run

Use the narrowest command that proves the requested behavior.

## Local

- Status: `npm run status`
- Signal K: `npm run start:signalk`; logs: `npm run logs:signalk`
- UI LAN dev server: `npm run start:ui`
- UI build check: `cd marine-instrumentation-ui && npm run build`
- Contract build: `npm run build:contract`
- Sensor gateway check: `cd marine-sensor-gateway && npm test && npm run build`

## Raspberry

- SSH hosts: `omi-raspberry-lan` and `omi-raspberry-cable`
- UI: `http://192.168.1.43:4200/` or `http://192.168.137.2:4200/`
- Signal K: `http://192.168.1.43:3000/signalk`
- Services: `omi-ui.service`, `omi-gps.service`, `omi-imu.service`, Docker container `signalk`

Never print or commit the Raspberry password. Use local ignored config and SSH host aliases.
