# Motor protocol — Raspberry ↔ microcontroller (UART)

The autopilot engine runs the high-level logic (state machine, PID, safety) on
the Raspberry. A microcontroller does the **real-time** motor work and provides
a **hardware failsafe**. This contract is transport-agnostic on purpose, so the
same engine drives *any* power stage that implements it (Autohelm/Nautech 3000
converted drive, a generic 12 V H-bridge, a CAN actuator, etc.).

The Raspberry **never** powers the motor directly. It only sends a desired
rudder demand + enable flag and a periodic heartbeat. The microcontroller maps
that to PWM / direction / driver-enable and **cuts the motor if the heartbeat
stops**.

## Link

- Default device: `/dev/ttyAMA0`, `115200 8N1`, raw mode.
- Configure once on the Pi: `stty -F /dev/ttyAMA0 115200 raw -echo`.
- ASCII line framing (`\n` terminated) for debuggability.

## Pi → microcontroller

| Frame                 | Meaning                                                        |
| --------------------- | -------------------------------------------------------------- |
| `C,<rudderDeg>,<en>`  | Command: target rudder angle in degrees (signed, + = stbd) and enable flag `0/1`. |
| `H`                   | Heartbeat. Sent every control tick (≈10 Hz).                   |

Examples: `C,12.5,1` (steer 12.5° to starboard, drive enabled), `C,0,0`
(centre, drive disabled), `H`.

## microcontroller → Pi (telemetry, parsed in phase 2)

| Frame                          | Meaning                                       |
| ------------------------------ | --------------------------------------------- |
| `T,<rudderDeg>,<currentA>`     | Measured rudder angle and motor current.      |
| `F,<reason>`                   | Microcontroller-side fault (e.g. `estop`, `overcurrent`). |

Until telemetry parsing is wired, the engine reads rudder angle and motor
current from the Signal K sensors (`steering.rudderAngle`,
`steering.autopilot.drive.motorCurrent`).

## Microcontroller responsibilities (failsafe — mandatory)

1. **Heartbeat timeout:** if no `H` arrives within **500 ms**, cut the motor
   (PWM 0, driver disable, open the power relay) regardless of the last `C`.
2. **Enable flag:** never drive the motor unless the most recent `C` had
   `en = 1`.
3. **Hardware e-stop:** a physical emergency button must cut motor power in
   hardware, independent of the firmware, and (optionally) assert the e-stop
   line the IO board publishes as `steering.autopilot.emergencyStop`.
4. **Local current/limit guard:** enforce a hard over-current cutoff and rudder
   end-stop limits locally, as a second line of defence below the engine limits.
5. **Boot safe:** power up with the motor disabled and the relay open.

## Engine-side safety (independent of the above)

- Boots in STANDBY; motor enabled only while engaged and fault-free.
- Software watchdog cuts the drive if the control loop stalls
  (`AP_WATCHDOG_TIMEOUT_MS`).
- Mandatory faults: heading-sensor loss → motor off; wind loss in WIND →
  demote; GPS loss in TRACK → demote; over-current / low-battery / e-stop /
  watchdog → FAULT + motor off.
