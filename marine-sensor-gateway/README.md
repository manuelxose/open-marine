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
