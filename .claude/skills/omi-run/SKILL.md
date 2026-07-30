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
- UI tests: `cd marine-instrumentation-ui && npm run test:ci`
- UI lint: `cd marine-instrumentation-ui && npm run lint`
- Targeted chart E2E: `cd marine-instrumentation-ui && npx playwright test e2e/chart-environment.spec.ts`
- Contract build: `npm run build:contract`
- Sensor gateway check: `cd marine-sensor-gateway && npm test && npm run build`
- Autopilot check: `cd marine-autopilot-engine && npm test && npm run build`
- Simulation/bench check: `npm run test:simulation` (bench server: `npm run start:simulation-bench`)
- Chart toolkit: `cd marine-chart-toolkit && npm run build`
- Chart engine: `cd marine-chart-engine && npm test`
- Chart engine local server: `cd marine-chart-engine && npm run build && npm start` (default `:8088`)
- Tile server: `cd marine-tile-server && npm run build`

## Raspberry

- SSH hosts: `omi-raspberry-lan` and `omi-raspberry-cable`
- UI: `http://192.168.1.43:4200/` or `http://192.168.137.2:4200/`
- Signal K: `http://192.168.1.43:3000/signalk`
- Services: `omi-ui.service`, `omi-charts.service`, `omi-gps.service`, `omi-imu.service`, Docker container `signalk`

Never print or commit the Raspberry password. Use local ignored config and SSH host aliases.

Full validation matrix: `.claude/references/validation.md` (load on demand).
