# OMI IMU Publisher (Raspberry Pi)

Scripts para leer ICM-20948 y publicar datos a Signal K.

Fecha de validacion: 2026-02-22.

## 1. Archivos

- `setup.sh`
- `01_test_sensor.py`
- `02_publish_signalk.py`

## 2. Requisitos

- Raspberry Pi con I2C habilitado (`/dev/i2c-1`).
- Sensor ICM-20948 visible en `0x69` o `0x68`.
- Python 3.
- Red entre Raspberry y host Signal K.

## 3. Setup

```bash
cd ~/omi-imu
bash setup.sh
```

`setup.sh` hace:

- Verifica plataforma Raspberry Pi.
- Verifica bus I2C.
- Instala `i2c-tools` si falta.
- Escanea bus y valida IMU (`0x69` o fallback `0x68`).
- Instala dependencias Python:
  - `icm20948`
  - `requests`
  - `websocket-client`
- Ejecuta una lectura de prueba.

## 4. Prueba de sensor (solo lectura)

```bash
python3 01_test_sensor.py --rate 2
```

Valores esperados en reposo horizontal:

- Acelerometro: `X ~ 0g`, `Y ~ 0g`, `Z ~ +1g`
- Giroscopio: cercano a `0 deg/s`
- Magnetometro: tipicamente en rango aproximado `-100..+100 uT`

## 5. Publicacion a Signal K

```bash
python3 02_publish_signalk.py --host 192.168.1.37 --port 3000 --rate 10
```

Opciones:

- `--raw-only` solo paths crudos IMU.
- `--no-publish` solo consola.

Paths publicados:

- `navigation.headingMagnetic`
- `navigation.attitude`
- `sensors.imu.accelerometer`
- `sensors.imu.gyroscope`
- `sensors.imu.magnetometer`

Conversiones:

- Acelerometro: `g -> m/s^2` multiplicando por `9.80665`
- Giroscopio: `deg/s -> rad/s`
- Magnetometro: `uT` sin conversion

## 6. Estrategia de envio

El script intenta publicar en este orden:

1. `POST /signalk/v1/api/` (delta)
2. `PUT /signalk/v1/api/vessels/self/...` (REST)
3. WebSocket `ws://<host>:3000/signalk/v1/stream?subscribe=none`

La instancia validada 2026-02-22 uso fallback WebSocket por bloqueo HTTP write (`404/405`).

## 7. Verificacion desde host local (Windows)

```powershell
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/headingMagnetic
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/attitude
curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/imu
```

## 8. GPS USB (G-Mouse DL28U9U)

Archivos GPS en este mismo directorio:

- `setup_gps.sh`
- `01_test_gps.py`
- `02_publish_gps_signalk.py`

Setup rapido:

```bash
cd ~/omi-imu
bash setup_gps.sh
```

Prueba de lectura:

```bash
python3 01_test_gps.py --device auto --baud 9600
```

Publicacion a Signal K:

```bash
python3 02_publish_gps_signalk.py --host 192.168.1.37 --port 3000 --device auto --baud 9600 --rate 1
```

Solo parseo (sin publicar):

```bash
python3 02_publish_gps_signalk.py --host 192.168.1.37 --rate 1 --no-publish
```

Paths GPS publicados:

- `navigation.position`
- `navigation.speedOverGround`
- `navigation.courseOverGroundTrue`
- `navigation.magneticVariation`
- `navigation.datetime`
- `sensors.gps.fix`
- `sensors.gps.satellitesInView`
- `sensors.gps.horizontalDilution`

## 9. Verificacion GPS desde host local (Windows)

```powershell
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/position
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/speedOverGround
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/courseOverGroundTrue
curl http://localhost:3000/signalk/v1/api/vessels/self/sensors/gps
```

## 10. Ejecutar IMU + GPS a la vez

En dos terminales separadas de la Raspberry:

```bash
python3 ~/omi-imu/02_publish_signalk.py --host 192.168.1.37 --port 3000 --rate 10
python3 ~/omi-imu/02_publish_gps_signalk.py --host 192.168.1.37 --port 3000 --device auto --baud 9600 --rate 1
```

Notas de tiempo real:

- IMU: usar `--rate 10` (o superior) para reflejar giro en tiempo real.
- GPS: publica a tasa fija (`--rate`, normalmente `1 Hz`) usando el ultimo fix disponible.
- GPS `courseOverGroundTrue` y variaciones asociadas solo cambian con desplazamiento real, no por giro en sitio.
