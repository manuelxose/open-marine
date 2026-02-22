# Marine Sensor Gateway

Pasarela para integrar sensores reales y forwarding AIS hacia Signal K.

Estado: 2026-02-19.

## Objetivo

- Exponer una base tipada para adaptadores de hardware.
- Ejecutar gateway AIS con `rtl_ais` y reenvio NMEA.

## Scripts

```powershell
npm install
npm run dev
npm run build
npm run test
npm run lint
```

## Entrada principal

- `src/cli.ts`: arranca `StubSensorGateway` y `AisGateway`.

## Modos funcionales

- Gateway de sensores (stub): `src/gateway.ts`
- Gateway AIS real: `src/ais/rtlAisGateway.ts`

## Variables de entorno AIS

- `AIS_RTL_AIS_PATH` (default `rtl_ais.exe`)
- `AIS_DEVICE_INDEX` (default `1`)
- `AIS_PPM` (default `-8`)
- `AIS_GAIN` (default `49`)
- `AIS_EDGE_TUNING` (default `false`)
- `AIS_FORWARD_MODE` (`udp` o `tcp`, default `udp`)
- `AIS_SIGNAL_K_HOST` (default `127.0.0.1`)
- `AIS_SIGNAL_K_PORT` (default `10110`)
- `AIS_LOG_NMEA` (default `false`)

Ejemplo PowerShell:

```powershell
$env:AIS_FORWARD_MODE="udp"
$env:AIS_SIGNAL_K_HOST="127.0.0.1"
$env:AIS_SIGNAL_K_PORT="10110"
npm run dev
```

## Estado de compilacion actual

Snapshot 2026-02-19:

- `npm run build` en verde.

Ver detalle en `../docs/IMPLEMENTATION_STATUS.md`.

## Proximo objetivo tecnico

- Implementar pruebas para el ciclo de vida de `AisGateway` (arranque, reinicio y parada).

## IMU ICM-20948 (Raspberry Pi)

Integracion validada: Raspberry Pi publica IMU y Signal K expone datos para UI.

Artefactos:

- Adapter contract: `src/adapters/imu.ts`
- Signal K publisher: `src/publishers/signalkPublisher.ts`
- Scripts Raspberry Pi: `rpi/omi-imu/`

### Scripts en Raspberry Pi

En la Raspberry:

```bash
cd ~/omi-imu
bash setup.sh
python3 01_test_sensor.py --rate 2
python3 02_publish_signalk.py --host 192.168.1.37 --port 3000 --rate 10
```

Opciones:

- `--raw-only`: publica solo acelerometro/giroscopio/magnetometro.
- `--no-publish`: solo consola, sin envio a Signal K.

### Publicacion Signal K

El script `02_publish_signalk.py` intenta publicar en este orden:

1. Delta HTTP `POST /signalk/v1/api/`
2. REST `PUT /signalk/v1/api/vessels/self/...`
3. WebSocket `ws://<host>:3000/signalk/v1/stream?subscribe=none`

En la instancia validada (2026-02-22) fue necesario fallback a WebSocket.

### Verificacion desde el PC local

```powershell
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/headingMagnetic
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/attitude
curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/imu
```

## GPS USB G-Mouse (Raspberry Pi)

Integracion validada: Raspberry Pi lee NMEA0183 por USB y publica en Signal K.

Artefactos:

- Adapter contract: `src/adapters/gps.ts`
- Scripts Raspberry Pi: `rpi/omi-imu/01_test_gps.py`, `rpi/omi-imu/02_publish_gps_signalk.py`, `rpi/omi-imu/setup_gps.sh`

### Scripts en Raspberry Pi

```bash
cd ~/omi-imu
bash setup_gps.sh
python3 01_test_gps.py --device auto --baud 9600
python3 02_publish_gps_signalk.py --host 192.168.1.37 --port 3000 --device auto --baud 9600 --rate 1
```

Opciones:

- `--rate`: frecuencia de publicacion (default `1 Hz`).
- `--no-publish`: solo parseo por consola.

### Paths publicados (GPS)

- `navigation.position`
- `navigation.speedOverGround`
- `navigation.courseOverGroundTrue`
- `navigation.magneticVariation`
- `navigation.datetime`
- `sensors.gps.fix`
- `sensors.gps.satellitesInView`
- `sensors.gps.horizontalDilution`

### Verificacion desde el PC local

```powershell
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/position
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/speedOverGround
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/courseOverGroundTrue
curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/gps
```

Nota operativa:

- El GPS no cambia `courseOverGroundTrue` por girar en sitio; solo cambia con desplazamiento real.
