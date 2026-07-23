# Pico 2 ST3000 motor bridge

Detailed Spanish wiring, circuit and test guide:
[Pico 2, MD30C R2 and 12 V motor](../../docs/PICO2_MD30C_MOTOR_GUIDE_ES.md).

The Pico 2 is the real-time PWM/DIR safety bridge between the Raspberry Pi and
the Cytron MD30C R2. The Raspberry remains the high-level heading controller.

## Pinout and profiles

| Signal | GPIO | Physical pin | Purpose |
| --- | ---: | ---: | --- |
| PWM | GP15 | 20 | MD30C PWM, 20 kHz |
| DIR | GP14 | 19 | MD30C direction |
| E-stop sense | GP13 | 17 | NC auxiliary: GND=safe, open/pressed/broken wire=stop |
| Current | GP26/ADC0 | 31 | Conditioned Hall sensor, strictly 0-3.3 V |
| Ground | GND | 18 | Pico/MD30C signal ground |

- `bench-led`: permits LED PWM tests without motor hardware.
- `motor-commissioning`: requires safety inputs, caps PWM at 10% and motion at 1 s.
- `hil-motor`: requires safety inputs, caps PWM at 10% and each armed session at 30 s.
- `production`: required by OMI; ships blocked until actual sensors are calibrated.

Install from Windows:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile bench-led
.\scripts\pico2\led-fade.ps1
.\scripts\pico2\led-steps.ps1
.\scripts\pico2\led-blink.ps1
.\scripts\pico2\led-on.ps1 -Duty 40
```

Motor commissioning, only after installing E-stop/current sensing and with the
belt/load mechanically disconnected:

```powershell
.\scripts\pico2\motor-safety-test.ps1
.\scripts\pico2\motor-current-calibrate.ps1 -VoltsPerAmp <sensor-sensitivity>
.\scripts\pico2-motor.ps1 -Action Deploy -Profile motor-commissioning
.\scripts\pico2\motor-pulse.ps1 -Direction starboard
.\scripts\pico2\motor-pulse.ps1 -Direction port
.\scripts\pico2\motor-ramp.ps1 -Direction starboard
.\scripts\pico2\motor-safety-test.ps1
.\scripts\pico2\motor-current-test.ps1
```

Current zero is sampled automatically with the motor stopped. The Hall sensor's
datasheet sensitivity in volts/amp is mandatory. Calibration and the verified
NC E-stop state are stored on the Raspberry; non-bench profiles refuse to
install until both exist.

HIL is a separate autopilot process, never part of
`marine-simulation-platform`. It starts in Standby on API port 43990:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile hil-motor
.\scripts\pico2\hil-start.ps1 -ConfirmPhysicalMotor
.\scripts\pico2\hil-engage.ps1
.\scripts\pico2\hil-heading-change.ps1 -Degrees 10
.\scripts\pico2\hil-disengage.ps1
.\scripts\pico2\hil-stop.ps1
```

`-Degrees` changes the target heading; it does not command physical motor
degrees. HIL mirrors corrections at no more than 10% PWM and stops/latches
after 30 seconds.

Production startup always runs preflight:

```powershell
.\scripts\pico2\autopilot-hardware-start.ps1
```

The ST3000 motor supply remains a dedicated 12 V circuit protected by a 12 A
fuse/breaker. Its manual belt clutch is the independent mechanical means of
returning to hand steering.
