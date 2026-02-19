# Setup Runbook

Procedimiento operativo para levantar el entorno local completo.

Fecha de referencia: 2026-02-19.

## 1. Requisitos

- Node.js 20 LTS
- npm 10+
- Docker Desktop (o Docker Engine + Compose)
- PowerShell (Windows) o shell equivalente

## 2. Preparacion inicial

Desde la raiz del repo:

```powershell
cd c:\Users\mgonzalezv.INDRA\Documents\private-workspace\open-marine
```

## 3. Arranque recomendado (4 terminales)

## Terminal 1: Signal K

```powershell
cd signalk-runtime
docker compose up -d
docker logs -f signalk
```

Validacion:

- Abrir `http://localhost:3000`
- Debe responder la UI de Signal K

## Terminal 2: Contrato compartido

```powershell
cd marine-data-contract
npm install
npm run build
npm run test:run
```

Validacion:

- Build y tests en verde.

## Terminal 3: Simulador

```powershell
cd marine-data-simulator
npm install
npm run dev -- --host http://localhost:3000 --scenario basic-cruise --rate 1
```

Escenarios disponibles:

- `basic-cruise`
- `harbor-traffic`
- `coastal-run`
- `anchored-stale`
- `busy-shipping-lane`
- `combined-failures`
- `anchor-drift`

Variable opcional de autenticacion:

```powershell
$env:SIGNALK_TOKEN="<token>"
```

## Terminal 4: UI Angular

```powershell
cd marine-instrumentation-ui
npm install
npm start
```

Validacion:

- Abrir `http://localhost:4200`
- Confirmar actualizacion de datos en `/dashboard`
- Revisar `/styleguide` y `/widgets`

## 4. Arranque del gateway AIS (opcional)

```powershell
cd marine-sensor-gateway
npm install
npm run dev
```

Variables de entorno relevantes:

- `AIS_RTL_AIS_PATH` (default `rtl_ais.exe`)
- `AIS_DEVICE_INDEX` (default `1`)
- `AIS_PPM` (default `-8`)
- `AIS_GAIN` (default `49`)
- `AIS_EDGE_TUNING` (default `false`)
- `AIS_FORWARD_MODE` (`udp` o `tcp`, default `udp`)
- `AIS_SIGNAL_K_HOST` (default `127.0.0.1`)
- `AIS_SIGNAL_K_PORT` (default `10110`)
- `AIS_LOG_NMEA` (default `false`)

## 5. Verificacion rapida de integracion

Checklist:

- Signal K responde en `:3000`.
- UI responde en `:4200`.
- Datos de posicion/curso/profundidad cambian en `dashboard`.
- Objetivos AIS aparecen en vistas correspondientes cuando aplica.
- No hay errores fatales en consola de navegador por WS.

## 6. Comandos de build por paquete

## `marine-data-contract`

```powershell
npm run build
npm run test:run
npm run lint
```

## `marine-data-simulator`

```powershell
npm run build
npm run lint
```

## `marine-sensor-gateway`

```powershell
npm run build
npm run lint
```

## `marine-instrumentation-ui`

```powershell
npm run build
npm run lint
npm test
```

## 7. Troubleshooting

## Error: `ws` desconectado en UI

- Confirmar Signal K activo.
- Revisar URL en `marine-instrumentation-ui/src/app/core/config/app-environment.token.ts`.
- Confirmar que no haya proxy/firewall bloqueando `ws://localhost:3000`.

## Error de build en simulator/gateway

- Revisar estado actual en `docs/IMPLEMENTATION_STATUS.md`.
- Priorizar correccion de tipos en archivos marcados como bloqueados.

## Puerto 3000 ocupado

- Detener proceso conflictivo.
- O cambiar mapeo en `signalk-runtime/docker-compose.yml`.

## 8. Apagado limpio

```powershell
# Terminal Signal K
cd signalk-runtime
docker compose down
```

Detener procesos Node activos con `Ctrl + C` en cada terminal.


