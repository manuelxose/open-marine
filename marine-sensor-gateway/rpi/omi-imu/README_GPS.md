# OMI GPS Publisher (Raspberry Pi)

Scripts para leer un GPS USB G-Mouse DL28U9U y publicar en Signal K.

Fecha de validacion: 2026-02-22.

## 1. Archivos

- `setup_gps.sh`
- `01_test_gps.py`
- `02_publish_gps_signalk.py`

## 2. Requisitos

- Raspberry Pi con Python 3.
- GPS USB conectado (normalmente `/dev/ttyACM0` o `/dev/ttyUSB0`).
- Red entre Raspberry y host con Signal K.

## 3. Setup

```bash
cd ~/omi-imu
bash setup_gps.sh
```

`setup_gps.sh`:

- Detecta dispositivo serial GPS.
- Advierte si `gpsd` esta activo.
- Instala dependencias:
  - `pyserial`
  - `pynmea2`
  - `requests`
  - `websocket-client`
- Lee 5 segundos de NMEA crudo para validar flujo.

## 4. Prueba de lectura (sin publicar)

```bash
python3 01_test_gps.py --device auto --baud 9600
```

Salida esperada:

- Sentencias crudas NMEA (`$GNRMC`, `$GNGGA`, etc.).
- Datos parseados: lat/lon, sog, cog, satelites, hdop, fix.

## 5. Publicacion a Signal K

```bash
python3 02_publish_gps_signalk.py --host 192.168.1.37 --port 3000 --device auto --baud 9600 --rate 1
```

Opcional:

- `--rate <hz>` para fijar frecuencia de publicacion (default `1`).
- `--no-publish` para validar parseo sin enviar.

## 6. Paths publicados

- `navigation.position`
- `navigation.speedOverGround`
- `navigation.courseOverGroundTrue`
- `navigation.magneticVariation`
- `navigation.datetime`
- `sensors.gps.fix`
- `sensors.gps.satellitesInView`
- `sensors.gps.horizontalDilution`

## 7. Conversiones aplicadas

- SOG: `knots * 0.514444` -> `m/s`
- COG true: `degrees -> radians`
- Magnetic variation: `degrees -> radians` (`E` positivo, `W` negativo)

## 8. Verificacion desde host local

```powershell
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/position
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/speedOverGround
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/courseOverGroundTrue
curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/gps
```

## 9. Notas operativas

- Sin fix GPS, el script publica `sensors.gps.fix = "none"` y no publica `navigation.position`.
- Si HTTP write esta bloqueado en Signal K, el script hace fallback a WebSocket.
- `navigation.courseOverGroundTrue` y `navigation.magneticVariation` dependen de movimiento real del receptor.
- Girar la Raspberry en sitio no genera rumbo GPS fiable; para eso se usa IMU (`navigation.headingMagnetic`).
