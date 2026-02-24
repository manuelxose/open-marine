# Data Model

Modelo de datos operativo para `open-marine`.

Fecha de referencia: 2026-02-22.

## 1. Tipos base

Los tipos fuente viven en `marine-data-contract/src/types.ts`.

### `DataPoint<T>`

```ts
export interface DataPoint<T> {
  context?: string;
  path: SignalKPath;
  value: T;
  timestamp: Timestamp;
  source?: SourceRef;
  quality?: QualityFlag;
}
```

### `SourceRef`

```ts
export interface SourceRef {
  label?: string;
  type?: string;
  priority?: number;
  fallback?: string;
  validityTimeoutMs?: number;
}
```

### IMU types

```ts
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Attitude {
  roll: number;
  pitch: number;
  yaw: number;
}
```

### GPS types

```ts
export type GpsFixType = "none" | "2d" | "3d" | "dgps";

export interface GpsSatelliteInfo {
  inView: number;
  used: number;
  hdop?: number;
  pdop?: number;
  vdop?: number;
}
```

## 2. PATHS Signal K (IMU + GPS)

Paths definidos en `marine-data-contract/src/paths.ts`.

| Path | Tipo | Unidad | Fuente |
| --- | --- | --- | --- |
| `navigation.headingMagnetic` | `number` | `rad` | IMU fusion |
| `navigation.attitude` | `Attitude` | `rad` | IMU fusion |
| `sensors.imu.accelerometer` | `Vector3` | `m/s^2` | IMU raw |
| `sensors.imu.gyroscope` | `Vector3` | `rad/s` | IMU raw |
| `sensors.imu.magnetometer` | `Vector3` | `uT` | IMU raw |
| `navigation.position` | `Position` | `deg,m` | GPS NMEA |
| `navigation.speedOverGround` | `number` | `m/s` | GPS RMC/VTG |
| `navigation.courseOverGroundTrue` | `number` | `rad` | GPS RMC/VTG |
| `navigation.magneticVariation` | `number` | `rad` | GPS RMC |
| `navigation.datetime` | `string` | `ISO 8601 UTC` | GPS RMC |
| `sensors.gps.fix` | `GpsFixType` | `-` | GPS GGA/GSA/RMC |
| `sensors.gps.satellitesInView` | `number` | `count` | GPS GGA/GSV |
| `sensors.gps.horizontalDilution` | `number` | `hdop` | GPS GGA/GSA |

## 3. Convenciones de unidades

- Angulos en radianes.
- Velocidad angular en `rad/s`.
- Aceleracion en `m/s^2`.
- Campo magnetico en `uT`.
- Velocidad SOG en `m/s`.
- Posicion en grados decimales WGS84.
- Timestamps en ISO 8601 UTC.

## 4. Delta message examples

### IMU delta

```json
{
  "context": "vessels.self",
  "updates": [
    {
      "timestamp": "2026-02-22T12:00:00.000Z",
      "source": {
        "label": "MacArthur HAT ICM-20948",
        "src": "icm20948",
        "type": "I2C"
      },
      "values": [
        { "path": "navigation.headingMagnetic", "value": 1.57 },
        {
          "path": "navigation.attitude",
          "value": { "roll": 0.05, "pitch": -0.02, "yaw": 1.57 }
        }
      ]
    }
  ]
}
```

### GPS delta

```json
{
  "context": "vessels.self",
  "updates": [
    {
      "timestamp": "2026-02-22T12:00:00.000Z",
      "source": {
        "label": "G-Mouse DL28U9U GPS",
        "src": "gps-usb",
        "type": "NMEA0183"
      },
      "values": [
        {
          "path": "navigation.position",
          "value": { "latitude": 41.3874, "longitude": 2.1686, "altitude": 29.8 }
        },
        { "path": "navigation.speedOverGround", "value": 0.152 },
        { "path": "navigation.courseOverGroundTrue", "value": 0.955 },
        { "path": "sensors.gps.fix", "value": "3d" }
      ]
    }
  ]
}
```

## 5. Lectura API en Signal K

En la instancia validada (2026-02-22), usar rutas con `vessels/self`:

- `GET /signalk/v1/api/vessels/self/navigation/headingMagnetic`
- `GET /signalk/v1/api/vessels/self/navigation/attitude`
- `GET /signalk/v1/api/vessels/self/navigation/position`
- `GET /signalk/v1/api/vessels/self/navigation/speedOverGround`
- `GET /signalk/v1/api/vessels/self/sensors/imu`
- `GET /signalk/v1/api/vessels/self/sensors/gps`

Nota: `GET /signalk/v1/api/navigation/...` puede devolver `404` segun configuracion.

## 6. Publicacion desde Raspberry Pi

Scripts de referencia en `marine-sensor-gateway/rpi/omi-imu/`:

- `setup.sh`, `01_test_sensor.py`, `02_publish_signalk.py` (IMU)
- `setup_gps.sh`, `01_test_gps.py`, `02_publish_gps_signalk.py` (GPS)

Estrategia de publicacion en scripts:

1. Intento delta HTTP `POST /signalk/v1/api/`.
2. Fallback REST `PUT /signalk/v1/api/vessels/self/...`.
3. Fallback WebSocket `ws://<host>:3000/signalk/v1/stream?subscribe=none`.

Motivo: en la instancia validada, HTTP write no estaba habilitado (`404/405`) y WebSocket funciono.
