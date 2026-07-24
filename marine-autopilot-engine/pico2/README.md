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
- `bench-motor`: permits only short, confirmed tests with a small unloaded DC
  motor; current sensing is deliberately unavailable.
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

## Prueba de motor DC pequeño sin sensor de corriente

`bench-motor` sirve únicamente para un motor DC pequeño de 12 V, sujeto y sin
carga mecánica. No debe usarse con el ST3000, HIL, Signal K ni el piloto real.
No mide ni simula corriente: el estado informa `current=unavailable`. Use una
fuente limitada o un fusible dimensionado para el motor de banco.

Con la alimentación de 12 V cortada, conecte:

```text
Pico GP15 (pin 20) ---> MD30C PWM
Pico GP14 (pin 19) ---> MD30C DIR
Pico GND  (pin 18) ---> MD30C GND lógico
MD30C A / B         ---> motor DC pequeño sin carga
12 V + con fusible  ---> MD30C PWR+
12 V -              ---> MD30C PWR-
```

Configure el MD30C en `EXT PWM`. No lleve la corriente de potencia por una
protoboard y no conecte nunca 12 V a la Pico. GP26 queda sin usar. GP13 es
opcional: si se habilita al desplegar, debe tener un contacto NC a GND; una
apertura corta PWM. Sin él, el estado y cada prueba advierten
`estop=not-configured`.

Orden recomendado desde PowerShell, en la raíz del repositorio:

```powershell
# 1. Desplegar con el límite predeterminado del 10 %
.\scripts\pico2-motor.ps1 -Action Deploy -Profile bench-motor

# 2. Verificar perfil, comunicación, heartbeat y PWM=0 sin mover el motor
.\scripts\pico2\bench-motor-preflight.ps1

# 3. Aplicar dos pulsos separados, 5 % durante 800 ms
.\scripts\pico2\bench-motor-pulse.ps1 -Direction starboard -Duty 5 -Milliseconds 800 -ConfirmBenchMotor
Start-Sleep -Seconds 3
.\scripts\pico2\bench-motor-pulse.ps1 -Direction port -Duty 5 -Milliseconds 800 -ConfirmBenchMotor

# 4. Parada independiente y verificada
.\scripts\pico2\bench-motor-stop.ps1
```

El máximo configurable se indica solo durante el despliegue y nunca puede
superar el 20 %:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile bench-motor -BenchMotorMaxDuty 15
```

Para habilitar la supervisión opcional de GP13:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile bench-motor -BenchMotorEstopConfigured
```

Pruebas adicionales:

| Script | Función | Estado final |
| --- | --- | --- |
| `bench-motor-direction-test.ps1 -ConfirmBenchMotor` | Parada, 5 %/800 ms en cada sentido, con 3 s de pausa | PWM=0 |
| `bench-motor-ramp.ps1 -Direction starboard -ConfirmBenchMotor` | 2/4/6/8/10 %, 800 ms por escalón y al menos 2 s de pausa | PWM=0 |
| `bench-motor-watchdog-test.ps1 -ConfirmBenchMotor` | Interrumpe el heartbeat y mide el corte en un máximo de 500 ms | PASS/FAIL y PWM=0 |
| `bench-motor-stop.ps1` | Repite `X`, consulta estado y falla si queda salida | PWM=0 |

Antes de conectar el cable `PWM` al MD30C puede medirse GP15 respecto a GND:
en reposo debe indicar aproximadamente 0 V; durante un pulso corto, un
multímetro puede mostrar un promedio pequeño porque la señal es PWM a 20 kHz.
Un osciloscopio o analizador lógico permite comprobar el porcentaje con mayor
precisión.

Estado normal detenido:

```text
profile=bench-motor enabled=0 drive=0.000 pwm_output=0.000
heartbeat=0 estop=not-configured current=unavailable ready=1 fault=
```

Aquí `ready=1` significa solamente «listo para una prueba limitada de banco».
No significa que esté listo para el ST3000 o producción. Si `fault` contiene
un valor, detenga, corrija la causa y repita el preflight. Si el sentido lógico
está invertido, corte primero los 12 V, espere la parada completa, intercambie
los cables `A` y `B` del motor y repita únicamente los pulsos.
