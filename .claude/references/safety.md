# Open Marine — Autopilot Safety Reference

On-demand reference for safety-critical autopilot work. Load only when modifying autopilot logic, motor control, or failsafe behavior.

## Hard rules

1. **STANDBY default** — State machine boots into STANDBY. No motor enable at boot.
2. **Simulator first** — `AP_MOTOR_BACKEND=sim` is the default for dev/test. Hardware backends require explicit opt-in.
3. **No actuator without failsafe** — Every motor command path must pass through watchdog + heartbeat check.
4. **E-stop latches** — Once triggered, E-stop stays active until explicit user reset. Fault must be visible in Signal K.
5. **Drive-test restricted** — Drive-test mode only allowed in STANDBY. Blocked in ENGAGED / AUTO.
6. **Watchdog cuts motor** — Missing heartbeat → motor disabled immediately.
7. **Fault visibility** — All faults published to `steering.autopilot.state` and `steering.autopilot.target.*` via contract paths.
8. **Hardware opt-in** — Serial / GPIO / CAN backends are never default. Must be explicitly configured and validated in simulator first.
9. **Test bench isolation** — Test bench must never send motor commands to real hardware. Use simulated motor backend only.

## Signal K state paths (contract)

- `steering.autopilot.state` — current mode (STANDBY, ENGAGED, AUTO, DRIVE_TEST, FAULT)
- `steering.autopilot.target.heading` — target heading
- `steering.autopilot.target.windAngle` — target wind angle
- `steering.autopilot.state.error` — fault code / reason

## Validation

- `cd marine-autopilot-engine && npm test && npm run build`
- Run with `AP_MOTOR_BACKEND=sim npm run dev` before any hardware test.
