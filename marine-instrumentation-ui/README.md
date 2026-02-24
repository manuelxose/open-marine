# Marine Instrumentation UI

Frontend Angular para visualizacion marina en tiempo real.

Estado: 2026-02-19.

## Objetivo

Mostrar datos de navegacion, entorno, alarmas, recursos y autopiloto consumiendo Signal K.

## Requisitos

- Node.js 20 LTS
- Signal K activo en `http://localhost:3000`

## Scripts

```powershell
npm install
npm start
npm run build
npm run lint
npm test
```

## Configuracion de entorno

Archivo base:

- `src/app/core/config/app-environment.token.ts`

Valores por defecto:

- REST: `http://localhost:3000/signalk/v1/api`
- WS: `ws://localhost:3000/signalk/v1/stream?subscribe=all`

## Rutas activas

- `/dashboard`
- `/chart`
- `/instruments`
- `/alarms`
- `/diagnostics`
- `/settings`
- `/widgets`
- `/styleguide`
- `/resources`
- `/autopilot`

## Flujo de datos

- `SignalKClientService` recibe stream WS.
- `DatapointStoreService` mantiene estado principal.
- `AisStoreService` mantiene targets AIS.
- Features y widgets renderizan a partir de stores.

## Validacion visual obligatoria

Tras cambios de componentes:

- revisar `/styleguide`
- revisar `/widgets`
- confirmar que no hay doble borde/caja solapada

Reglas detalladas en `../docs/AI_PLAYBOOK.md`.

## Estado de compilacion

Snapshot 2026-02-19:

- `npm run build` -> `✅`
- Hay warnings de budget en bundle inicial y SCSS de algunos composites.

Detalle en `../docs/IMPLEMENTATION_STATUS.md`.
