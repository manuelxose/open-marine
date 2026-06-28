---
name: omi-run
description: Choose the narrowest validation command for Open Marine. Use when starting, stopping, building, or checking any module.
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
- Autopilot check: `cd marine-autopilot-engine && npm test && npm run build`
- Test bench check: `cd marine-test-bench && npm test && npm run build`
- Chart toolkit: `cd marine-chart-toolkit && npm run build`
- Tile server: `cd marine-tile-server && npm run build`

## Raspberry

- SSH hosts: `omi-raspberry-lan` and `omi-raspberry-cable`
- UI: `http://192.168.1.43:4200/` or `http://192.168.137.2:4200/`
- Signal K: `http://192.168.1.43:3000/signalk`
- Services: `omi-ui.service`, `omi-gps.service`, `omi-imu.service`, Docker container `signalk`

Never print or commit the Raspberry password. Use local ignored config and SSH host aliases.

Full validation matrix: `.claude/references/validation.md` (load on demand).
