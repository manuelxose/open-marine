---
name: omi-autopilot-safety
description: Implement or review autopilot changes safely. Use for motor control, state machine, PID, watchdog, heartbeat, failsafe, E-stop, drive-test, or steering logic.
---

# OMI Autopilot Safety

## When to use
- Any change to `marine-autopilot-engine/src/`
- Any UI change that affects autopilot controls or status display
- Any simulator change that feeds autopilot data

## Files to inspect
- `marine-autopilot-engine/src/` — state machine, PID, motor controller, command API
- `marine-data-contract/src/paths.ts` — `steering.autopilot.*` paths
- `marine-instrumentation-ui/src/app/features/autopilot/` — UI controls

## Files to avoid
- Real hardware serial/GPIO/CAN drivers unless explicitly requested
- `node_modules/`, `dist/`, `.angular/`

## Workflow
1. Verify current state machine default is STANDBY.
2. Verify motor controller requires explicit backend config (`AP_MOTOR_BACKEND`).
3. Verify watchdog and heartbeat are present and wired to motor disable.
4. Verify E-stop latches and publishes fault to Signal K.
5. Verify drive-test is blocked outside STANDBY.
6. Make change.
7. Validate: `cd marine-autopilot-engine && npm test && npm run build`
8. Run simulator validation: `AP_MOTOR_BACKEND=sim npm run dev`
9. If the change touches the chart, verify autopilot target, own vessel and safety overlays survive
   20 rapid base-style changes. Weather/chart data is advisory and must never drive the actuator.

## Expected output
- State change summary
- Safety impact (none / low / high)
- Validation result

## Safety notes
- Never enable motor at boot.
- Treat HIL as a separate, explicit hardware mode: require simulated sensors,
  physical-motion confirmation, Pico profile `hil-motor`, a 10% PWM cap, a
  30-second session limit, and its own API port/PID/serial lock.
- Never expose HIL through `marine-simulation-platform`.
- Never default to hardware backend.
- Never skip simulator validation before hardware.
