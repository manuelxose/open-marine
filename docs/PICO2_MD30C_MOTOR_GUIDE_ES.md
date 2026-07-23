# Guía de conexión y pruebas: Pico 2, MD30C R2 y motor de 12 V

## 1. Alcance

Esta guía describe el montaje y comisionado del sistema:

```text
Windows ──SSH──> Raspberry Pi ──USB/serie──> Pico 2 ──PWM+DIR──> MD30C R2 ──> motor DC
                                                        │
                                              E-stop + corriente
```

El motor de pruebas y el motor ST3000 son motores DC de dos cables. El MD30C
invierte la polaridad de sus salidas `A/B` para cambiar el sentido.

La Pico:

- genera PWM en GP15 a 20 kHz;
- selecciona dirección con GP14;
- supervisa el contacto auxiliar NC del E-stop con GP13;
- mide corriente analógica mediante GP26/ADC0;
- corta PWM si pierde el heartbeat durante más de 500 ms.

El E-stop debe cortar físicamente los 12 V del motor. La Pico únicamente
supervisa un contacto auxiliar; el firmware nunca sustituye el corte físico.

## 2. Seguridad obligatoria

Antes de conectar 12 V:

- desconectar la correa, embrague o carga mecánica;
- fijar firmemente el motor de pruebas;
- instalar un fusible próximo al positivo de la fuente o batería;
- instalar un seccionador y un E-stop físico;
- comprobar que GP15 está a 0 V;
- comprobar que no hay procesos HIL o producción activos;
- poner el selector del MD30C en PWM externo;
- no usar una protoboard para batería, motor ni corriente de potencia.

Para el ST3000 se ha previsto un fusible/disyuntor de 12 A. Para un motor de
pruebas debe usarse un fusible apropiado a su corriente nominal y de bloqueo;
no instalar automáticamente 12 A si el cableado o el motor admiten menos.

No conectar nunca los 12 V a `VBUS`, `VSYS`, `3V3`, GPIO o ADC de la Pico.
Ninguna entrada de la Pico puede superar 3,3 V.

El MD30C admite lógica de 3,3 V, PWM externo hasta 20 kHz y motores brushed de
dos cables. El fabricante indica que `PWM=LOW` frena el motor.

## 3. Orientación y numeración de la Pico 2

Los números GP no son números de patilla física. En el firmware se usan:

| Función | GPIO | Patilla física Pico 2 | Conexión |
| --- | ---: | ---: | --- |
| PWM | GP15 | 20 | Entrada `PWM` del MD30C |
| Dirección | GP14 | 19 | Entrada `DIR` del MD30C |
| Masa digital | GND | 18 | `GND` lógico del MD30C |
| E-stop auxiliar | GP13 | 17 | Contacto NC hacia GND |
| Corriente | GP26/ADC0 | 31 | Salida analógica 0–3,3 V del sensor |
| Masa analógica | AGND | 33 | GND del sensor de corriente |

Con el USB en la parte superior y mirando la cara de componentes:

```text
                  USB
                   │
       lado izquierdo      lado derecho

 GP13 / pin 17  o               o  pin 24 / GP18
 GND  / pin 18  o               o  pin 23 / GND
 GP14 / pin 19  o               o  pin 22 / GP17
 GP15 / pin 20  o               o  pin 21 / GP16

 GP26 / pin 31                  pin 31 / GP26  o
 AGND / pin 33                  pin 33 / AGND  o
```

Usar siempre las etiquetas `GP13`, `GP14`, `GP15` y `GP26` de la placa de
breakout. No contar orificios visualmente.

## 4. Conector lógico del MD30C R2

El conector lógico del MD30C tiene tres señales:

| MD30C | Conectar a | Función |
| --- | --- | --- |
| `GND` | Pico GND, pin físico 18 | Referencia común de lógica |
| `PWM` | Pico GP15, pin físico 20 | Velocidad/intensidad |
| `DIR` | Pico GP14, pin físico 19 | Sentido |

No conectar 3V3 ni 5V de la Pico al conector lógico del MD30C. El cableado es
solo `GND`, `PWM` y `DIR`.

Configurar el selector del MD30C para PWM externo:

```text
JP6 = EXT PWM
JP4 = indiferente para PWM externo
```

Confirmar las etiquetas impresas en la placa antes de apretar los tornillos.
No deducir la función por la posición de la placa o por una fotografía girada.

## 5. Circuito de potencia de 12 V

### 5.1 Esquema recomendado

```text
 BATERÍA/FUENTE 12 V

 (+) ── fusible ── seccionador ── contacto principal E-STOP ── sensor Hall ──> MD30C PWR+
 (-) ────────────────────────────────────────────────────────────────────────> MD30C PWR-

 MD30C A ────────────────────────────────────────────────────────────────────> motor cable 1
 MD30C B ────────────────────────────────────────────────────────────────────> motor cable 2

 Pico GND ───────────────────────────────────────────────────────────────────> MD30C GND lógico
```

El sensor Hall puede instalarse en el positivo o negativo según su manual.
Respetar la flecha o sentido de medida del fabricante. Su salida hacia GP26
debe estar acondicionada estrictamente a 0–3,3 V.

Usar cable de sección adecuada para la corriente de bloqueo del motor. Mantener
los cables de potencia cortos y separados de GP26. Es recomendable trenzar los
dos cables del motor.

### 5.2 E-stop con dos funciones

El E-stop necesita dos circuitos independientes:

```text
Circuito de potencia:
12 V positivo ── contacto/contactor NC de potencia ── MD30C

Circuito de supervisión:
Pico GP13 ── contacto auxiliar NC ── Pico GND
```

Estados esperados:

| Estado físico | GP13 | `estop_raw` | Resultado |
| --- | ---: | ---: | --- |
| E-stop liberado y cable correcto | 0 V | `0` | Seguro |
| E-stop pulsado | 3,3 V por pull-up | `1` | Parada |
| Cable auxiliar roto/desconectado | 3,3 V por pull-up | `1` | Parada |

Si el pulsador no está certificado para la corriente del motor, debe gobernar
un contactor de potencia adecuado; no hacer pasar la corriente del motor por
contactos pequeños.

## 6. Sensor analógico de corriente

Conexión genérica:

| Sensor Hall | Pico |
| --- | --- |
| `OUT` acondicionado 0–3,3 V | GP26/ADC0, pin 31 |
| `GND` | AGND, pin 33 |
| Alimentación | La indicada por el fabricante del sensor |

No asumir que el sensor se alimenta a 3,3 V. Algunos sensores requieren 5 V,
pero su salida no puede llegar a 5 V en GP26. Si puede superar 3,3 V debe
incorporarse acondicionamiento, divisor o amplificador apropiado.

Para calibrarlo se necesita la sensibilidad real en voltios por amperio
(`VoltsPerAmp`). El cero se mide automáticamente con el motor detenido.

La calibración se guarda en la Raspberry:

```text
~/.config/omi/pico2-current.json
```

Los perfiles de motor no se instalan si faltan:

- verificación del E-stop NC;
- tensión de cero válida;
- sensibilidad mayor que cero;
- límite inicial de corriente entre 0 y 10 A.

## 7. Prueba LED antes del MD30C

El circuito de banco es:

```text
GP15 ── resistencia 220–1000 Ω ── ánodo LED
                                      cátodo ── GND
```

La pata larga suele ser el ánodo y el lado plano del encapsulado suele marcar
el cátodo, pero debe verificarse en el componente.

Las pruebas LED solo se ejecutan con el cable `PWM` del MD30C desconectado o con
los 12 V del driver físicamente cortados. Un script LED puede aplicar hasta
100 % en GP15 y movería un motor si el MD30C estuviera habilitado.

## 8. Perfiles del firmware

| Perfil | Uso | Límite PWM | Tiempo máximo |
| --- | --- | ---: | ---: |
| `bench-led` | LED y diagnóstico sin driver | 100 % | Sin movimiento de motor autorizado |
| `motor-commissioning` | Pulsos y rampas manuales | 10 % | 1 s por movimiento |
| `hil-motor` | Simulación que refleja órdenes en motor real | 10 % | 30 s por sesión armada |
| `production` | Piloto real con Signal K | Configuración del piloto | Watchdog 500 ms |

Todos arrancan con `PWM=0` y `DIR=0`. Cambiar de perfil requiere una acción
explícita; el despliegue general copia los perfiles pero no activa uno.

## 9. Conexión desde Windows

Abrir PowerShell en la raíz del repositorio:

```powershell
cd C:\Users\Admin\Documents\workspace\open-marine-instrumentation
```

La conexión normal usa:

```powershell
ssh omi-raspberry-lan
```

Si no responde:

```powershell
ssh omi-raspberry-cable
```

Los scripts aceptan `-SshHost omi-raspberry-cable` cuando sea necesario.

## 10. Secuencia completa para probar el motor

### Fase A: sin 12 V en el MD30C

1. Dejar motor y alimentación de potencia desconectados.
2. Conectar Pico por USB a la Raspberry.
3. Consultar estado:

```powershell
.\scripts\pico2-motor.ps1 -Action Status
```

Debe mostrar:

```text
enabled=0
drive=0.000
heartbeat=0
fault=
```

4. Si se desea, repetir las pruebas LED.
5. Conectar el contacto auxiliar NC del E-stop entre GP13 y GND.
6. Ejecutar la prueba del E-stop:

```powershell
.\scripts\pico2\motor-safety-test.ps1 -Seconds 15
```

El script exige inicialmente `estop_raw=0`. Después hay que pulsar el E-stop
dentro del tiempo indicado y debe detectar `estop_raw=1`.

7. Conectar el sensor de corriente, dejar el motor detenido y calibrar:

```powershell
.\scripts\pico2\motor-current-calibrate.ps1 -VoltsPerAmp 0.040 -LimitAmps 10
```

`0.040` es solo un ejemplo. Sustituirlo por el valor real de la ficha técnica.

### Fase B: conectar MD30C sin carga mecánica

1. Cortar 12 V y desconectar USB antes de cambiar cables.
2. Conectar `GND`, `PWM` y `DIR`.
3. Conectar potencia y motor según el esquema.
4. Confirmar `JP6=EXT PWM`.
5. Liberar el E-stop y mantener correa/carga desacoplada.
6. Activar el perfil de comisionado:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile motor-commissioning
```

7. Verificar preflight:

```powershell
.\scripts\pico2\motor-preflight.ps1 -Profile motor-commissioning
```

8. Probar un pulso de un segundo al 10 %:

```powershell
.\scripts\pico2\motor-pulse.ps1 -Direction starboard
```

9. Esperar a parada completa y probar el otro sentido:

```powershell
.\scripts\pico2\motor-pulse.ps1 -Direction port
```

10. Si ambos sentidos son correctos, probar la rampa:

```powershell
.\scripts\pico2\motor-ramp.ps1 -Direction starboard
.\scripts\pico2\motor-ramp.ps1 -Direction port
```

11. Comprobar telemetría de corriente durante un pulso:

```powershell
.\scripts\pico2\motor-current-test.ps1
```

12. Finalizar siempre con:

```powershell
.\scripts\pico2\led-off.ps1
```

Comprobar con multímetro que GP15 queda a 0 V.

### Si el sentido está invertido

`port` y `starboard` son nombres lógicos. Si el motor gira al revés:

1. cortar 12 V;
2. esperar a que el motor se detenga;
3. intercambiar los cables `A` y `B` del motor;
4. repetir únicamente los pulsos de 10 %.

No intercambiar cables con el circuito energizado.

## 11. Qué hace cada script

### 11.1 Scripts LED y diagnóstico

| Script | Acción | Final seguro |
| --- | --- | --- |
| `led-off.ps1` | Envía parada inmediata `X` y consulta estado | PWM=0 |
| `led-on.ps1 -Duty N` | Mantiene GP15 a `N` % hasta `Ctrl+C` | Envía `X` al salir |
| `led-fade.ps1 -Seconds N` | Tres ciclos suaves 0→100→0 | PWM=0 |
| `led-steps.ps1 -Seconds N` | Escalones 0/10/25/50/75/100 % | PWM=0 |
| `led-blink.ps1` | Diez parpadeos de 500 ms | PWM=0 |
| `watchdog-test.ps1` | Deja de enviar heartbeat y verifica corte en 500 ms | Fallo enclavado/PWM=0 |

No ejecutar estos scripts con el MD30C conectado a un motor energizado.

### 11.2 Comisionado y seguridad

| Script | Acción |
| --- | --- |
| `motor-safety-test.ps1` | Comprueba NC seguro y después apertura al pulsar E-stop; guarda la verificación |
| `motor-current-calibrate.ps1` | Promedia ADC con motor parado y guarda cero, sensibilidad y límite |
| `motor-preflight.ps1 -Profile ...` | Exige perfil exacto y `ready=1`; no mueve el motor |
| `motor-pulse.ps1 -Direction ...` | 10 % durante 1 s y parada |
| `motor-ramp.ps1 -Direction ...` | 2/4/6/8/10 %, 0,8 s por escalón, con pausas |
| `motor-current-test.ps1` | Gira al 10 % durante 1 s y captura corriente mientras gira |

Los scripts de movimiento requieren confirmación interna
`--confirm-motor-safe`, bloqueo exclusivo del puerto y parada en error o
`Ctrl+C`.

### 11.3 Gestión del firmware

El orquestador común es:

```powershell
.\scripts\pico2-motor.ps1 -Action ACCION
```

Acciones principales:

| Acción | Resultado |
| --- | --- |
| `Status` | Estado completo de Pico, perfil, E-stop, corriente y fallo |
| `Stop` | Detención inmediata |
| `Deploy -Profile bench-led` | Copia e instala perfil LED |
| `Deploy -Profile motor-commissioning` | Instala perfil limitado, solo con calibración válida |
| `Deploy -Profile hil-motor` | Instala perfil HIL limitado |
| `Deploy -Profile production` | Instala perfil final |
| `AutopilotStart -ConfirmMotorSafe` | Preflight y piloto real en Standby |

El despliegue completo del proyecto copia todo el software Pico y lo indica en
consola, pero no cambia automáticamente el perfil activo.

### 11.4 HIL: simulación con motor físico

HIL utiliza sensores y barco virtuales, pero refleja la corrección en el motor
real. No pertenece a `marine-simulation-platform`.

| Script | Acción |
| --- | --- |
| `hil-start.ps1 -ConfirmPhysicalMotor` | Preflight `hil-motor`, bloqueo USB y arranque en Standby |
| `hil-engage.ps1` | Engancha el piloto en modo compass e inicia la sesión física |
| `hil-heading-change.ps1 -Degrees N` | Modifica el rumbo objetivo ±N grados |
| `hil-disengage.ps1` | Vuelve a Standby y para el motor |
| `hil-stop.ps1` | Termina proceso HIL y fuerza PWM=0 |
| `hil-control.ps1 -Action status` | Consulta si el proceso está activo |

`Degrees` son grados de rumbo objetivo, no grados mecánicos del motor.

HIL:

- limita el motor real al 10 %;
- corta y enclava fallo al cumplir 30 s;
- usa API local `127.0.0.1:43990`;
- tiene PID y bloqueo serie propios;
- nunca comparte puerto con producción ni con una prueba manual.

Secuencia:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile hil-motor
.\scripts\pico2\motor-preflight.ps1 -Profile hil-motor
.\scripts\pico2\hil-start.ps1 -ConfirmPhysicalMotor
.\scripts\pico2\hil-engage.ps1
.\scripts\pico2\hil-heading-change.ps1 -Degrees 10
.\scripts\pico2\hil-disengage.ps1
.\scripts\pico2\hil-stop.ps1
```

### 11.5 Piloto real

| Script | Acción |
| --- | --- |
| `autopilot-hardware-start.ps1 -ConfirmMotorSafe` | Exige perfil `production`, sensores reales y arranca en Standby |
| `autopilot-hardware-stop.ps1` | Detiene el piloto y fuerza PWM=0 |

Antes del arranque final:

```powershell
.\scripts\pico2-motor.ps1 -Action Deploy -Profile production
.\scripts\pico2\motor-preflight.ps1 -Profile production
.\scripts\pico2\autopilot-hardware-start.ps1 -ConfirmMotorSafe
```

El arranque no engancha automáticamente el piloto. La orden AUTO o el cambio
de rumbo se realiza después desde la interfaz del piloto.

## 12. Comandos equivalentes en la Raspberry

Entrar por SSH:

```bash
ssh omi-raspberry-lan
cd ~/open-marine
```

Estado y parada:

```bash
~/.venvs/pico-tools/bin/python marine-autopilot-engine/pico2/pico_motor_cli.py status
~/.venvs/pico-tools/bin/python marine-autopilot-engine/pico2/pico_motor_cli.py stop
```

Preflight:

```bash
~/.venvs/pico-tools/bin/python marine-autopilot-engine/pico2/pico_motor_cli.py \
  preflight --profile motor-commissioning
```

HIL:

```bash
bash scripts/pico2/hil-control.sh status
bash scripts/pico2/hil-control.sh start --confirm-physical-motor
bash scripts/pico2/hil-control.sh engage
bash scripts/pico2/hil-control.sh heading-change 10
bash scripts/pico2/hil-control.sh disengage
bash scripts/pico2/hil-control.sh stop
```

Producción:

```bash
bash scripts/pico2/production-control.sh start --confirm-physical-motor
bash scripts/pico2/production-control.sh status
bash scripts/pico2/production-control.sh stop
```

## 13. Interpretación del estado

Ejemplo:

```text
R,pico2,profile=bench-led,pwm=15,dir=14,enabled=0,drive=0.000,
heartbeat=0,estop=0,estop_raw=1,current=,current_v=0.5536,ready=1,fault=
```

| Campo | Significado |
| --- | --- |
| `profile` | Perfil instalado |
| `enabled` | Salida armada por software |
| `drive` | Demanda firmada, -1 a +1 |
| `heartbeat` | Heartbeat recibido en los últimos 500 ms |
| `estop` | E-stop activo según configuración |
| `estop_raw` | Estado eléctrico real de GP13 |
| `current` | Corriente calculada en amperios |
| `current_v` | Tensión ADC cruda |
| `ready` | Preflight local disponible |
| `fault` | Causa de bloqueo enclavada |

En `bench-led`, `ready=1` no significa que el sistema de motor esté preparado.
Solo los perfiles de motor con E-stop y corriente calibrados son válidos para
comisionado, HIL o producción.

## 14. Diagnóstico de fallos

### El motor no gira

1. comprobar 12 V entre `PWR+` y `PWR-`;
2. comprobar fusible, seccionador y E-stop;
3. confirmar `JP6=EXT PWM`;
4. consultar `profile`, `ready` y `fault`;
5. comprobar GP15 con multímetro durante un pulso;
6. comprobar masa común Pico–MD30C;
7. comprobar que el motor está en `A/B`, no en la entrada de alimentación.

### Se bloquea con `safety-not-configured`

Falta verificar el E-stop, calibrar corriente o instalar de nuevo el perfil:

```powershell
.\scripts\pico2\motor-safety-test.ps1
.\scripts\pico2\motor-current-calibrate.ps1 -VoltsPerAmp VALOR_REAL
.\scripts\pico2-motor.ps1 -Action Deploy -Profile motor-commissioning
```

### `estop_raw=1` con E-stop liberado

El contacto auxiliar está abierto, mal cableado o no llega a GND. No puentear
la seguridad para continuar una prueba.

### `overcurrent`

1. cortar potencia;
2. comprobar atasco o carga mecánica;
3. comprobar sensibilidad y cero del sensor;
4. comprobar corriente de bloqueo del motor;
5. no aumentar el límite sin una nueva fase de comisionado.

### `heartbeat-timeout`

La Raspberry dejó de enviar heartbeat, se perdió USB o el proceso terminó. Es
un corte correcto. Resolver la conexión, dejar PWM=0 y rearmar explícitamente.

### El sentido no coincide

Cortar 12 V e intercambiar `A/B`. Repetir pulsos al 10 %. No validar el sentido
con la correa del ST3000 enganchada.

## 15. Lista de comprobación antes del ST3000

- [ ] GP15/PWM y GP14/DIR comprobados con motor de pruebas.
- [ ] GP13 seguro a GND y cable abierto detectado como E-stop.
- [ ] Corte físico de 12 V comprobado.
- [ ] GP26 nunca supera 3,3 V.
- [ ] Cero y sensibilidad de corriente calibrados.
- [ ] Sobrecorriente enclava fallo y PWM=0.
- [ ] Pérdida USB/heartbeat corta en menos de 500 ms.
- [ ] Pulsos port/starboard identificados.
- [ ] HIL se detiene a los 30 s.
- [ ] Producción arranca en Standby.
- [ ] Fusible, cableado y seccionador dimensionados.
- [ ] Correa/embrague manual permite volver a gobierno manual.

## 16. Referencias técnicas

- [Raspberry Pi: Pico-series y pinout oficial](https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html)
- [Raspberry Pi Pico 2 datasheet](https://datasheets.raspberrypi.com/pico/pico-2-datasheet.pdf)
- [Cytron MD30C R2: página oficial](https://www.cytron.io/p-30amp-5v-30v-dc-motor-driver)
- [Cytron: control PWM+DIR y masa común](https://www.cytron.io/tutorial/md10c-arduino)
- [Protocolo de motor OMI](../marine-autopilot-engine/docs/MOTOR_PROTOCOL.md)
- [Firmware y perfiles Pico 2](../marine-autopilot-engine/pico2/README.md)
