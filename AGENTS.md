# Open Marine Agent Guide

Keep this file small. Load detailed procedures from `.claude/skills/` or the personal Codex skill only when the task needs them.

Key-file index, sensor→screen data flow and performance rules: `.claude/references/architecture.md` (load on demand, before broad exploration).

## Repository Map

- `marine-instrumentation-ui/`: Angular 21 UI, Signal K data access, MapLibre chart, dashboard and instruments.
- `marine-data-contract/`: shared Signal K paths, units, quality flags and data point types.
- `marine-sensor-gateway/`: TypeScript gateway plus Raspberry Python scripts for GPS, IMU and AIS publishing.
- `marine-autopilot-engine/`: autopilot control service (state machine, PID, safety/watchdog, abstract MotorController: sim/serial/gpio/can). Reads sensors from Signal K, serves the v2 autopilot command API the UI uses, publishes `steering.autopilot.*`.
- `marine-data-simulator/`: simulator scenarios and Signal K HTTP/WebSocket publishers.
- `signalk-runtime/`: Docker Compose and Signal K plugin/settings data.
- `marine-chart-toolkit/` and `marine-tile-server/`: MBTiles tooling and tile serving.
- `scripts/`: cross-platform setup, migration, status and Raspberry helpers.

## Commands

- Root init: `npm run init`
- Signal K: `npm run start:signalk`, `npm run stop:signalk`, `npm run logs:signalk`
- Shared contract: `npm run build:contract`; or `cd marine-data-contract && npm run test:run`
- UI: `cd marine-instrumentation-ui && npm run build`; `npm run start:ui` from root for LAN dev server.
- Sensor gateway: `cd marine-sensor-gateway && npm test && npm run build`
- Autopilot engine: `cd marine-autopilot-engine && npm test && npm run build`; bench: `AP_MOTOR_BACKEND=sim npm run dev` (or `npm run start:autopilot` from root)
- Simulator: `cd marine-data-simulator && npm run build`
- Status: `npm run status`

## Token Discipline

- Search first with `rg` or `rg --files`; read only the files needed for the current change.
- Do not inspect `node_modules`, `dist`, `dist-tmp`, `.angular`, logs, coverage or generated bundles unless the bug is specifically inside generated output.
- Prefer package-level validation over whole-repo sweeps.
- Summarize large files instead of pasting them into the conversation.
- When exploring broadly, delegate to a focused subagent and ask for concise findings.

## Safety

- Never commit credentials. `config/omi.env` and `config/raspberry.env` are local-only.
- Do not change or revert unrelated dirty files. Work around existing edits unless the user asks to reset them.
- Keep Raspberry passwords out of docs, skills, agents and committed configs.
- Treat `.claude/settings.local.json` as local machine state, not shared project policy.

## Project Conventions

- Use TypeScript modules and existing package patterns.
- Keep Signal K paths in `marine-data-contract` before duplicating strings elsewhere.
- For UI work, use existing standalone Angular components, lazy routes and shared design tokens.
- For Raspberry work, verify systemd services and Signal K availability before changing scripts.
