---
name: omi-autopilot-safety
description: Implement or review autopilot changes safely. Use for motor control, state machine, PID, watchdog, heartbeat, failsafe, E-stop, drive-test, or steering logic.
---

# OMI Autopilot Safety

## When to use

- Any change to `marine-autopilot-engine/src/`
- UI changes affecting autopilot controls or status display
- Simulator changes feeding autopilot data

## Files to inspect

- `marine-autopilot-engine/src/` — state machine, PID, motor controller, command API
- `marine-data-contract/src/paths.ts` — `steering.autopilot.*` paths
- `marine-instrumentation-ui/src/app/features/autopilot/` — UI controls

## Files to avoid

- Real hardware serial/GPIO/CAN drivers unless explicitly requested
- `node_modules/`, `dist/`, `.angular/`

## Workflow

1. Verify state machine default is STANDBY.
2. Verify motor controller requires explicit backend config (`AP_MOTOR_BACKEND`).
3. Verify watchdog + heartbeat wired to motor disable.
4. Verify E-stop latches and publishes fault to Signal K.
5. Verify drive-test blocked outside STANDBY.
6. Make change.
7. Validate: `cd marine-autopilot-engine && npm test && npm run build`
8. Run simulator validation: `AP_MOTOR_BACKEND=sim npm run dev`

## Safety notes

- Never enable motor at boot. Never default to hardware backend.
- Never skip simulator validation before hardware.
- Test bench must never control real hardware.
