# Open Marine

Plataforma de instrumentacion marina en tiempo real sobre Signal K.

Estado de referencia: 2026-02-19.

## Objetivo

Este repositorio integra cinco bloques:

- `marine-data-contract`: contrato tipado de rutas, unidades y tipos.
- `marine-data-simulator`: generador de escenarios y trafico AIS para pruebas.
- `marine-sensor-gateway`: pasarela para sensores reales (stub + gateway AIS por `rtl_ais`).
- `marine-instrumentation-ui`: frontend Angular con dashboard, carta, alarmas, recursos y styleguide.
- `signalk-runtime`: runtime local de Signal K en Docker.

## Mapa de documentacion vigente

Solo se mantiene esta base documental:

- `docs/AI_PLAYBOOK.md`: reglas operativas para IA (flujo de trabajo + definition of done).
- `docs/architecture.md`: arquitectura, flujo de datos y responsabilidades.
- `docs/SETUP_RUNBOOK.md`: puesta en marcha local paso a paso.
- `docs/IMPLEMENTATION_STATUS.md`: estado real del codigo y bloqueos activos.
- `docs/ROADMAP_NEXT_STEPS.md`: plan de ejecucion por prioridad.

Si necesitas contexto para ejecutar cambios, empieza por `docs/AI_PLAYBOOK.md` y `docs/IMPLEMENTATION_STATUS.md`.

## Arranque rapido

### 1) Levantar Signal K

```powershell
cd signalk-runtime
docker compose up -d
```

UI de Signal K: `http://localhost:3000`

### 2) Construir contrato compartido

```powershell
cd ../marine-data-contract
npm install
npm run build
```

### 3) Levantar simulador

```powershell
cd ../marine-data-simulator
npm install
npm run dev -- --host http://localhost:3000 --scenario basic-cruise --rate 1
```

### 4) Levantar UI Angular

```powershell
cd ../marine-instrumentation-ui
npm install
npm start
```

UI: `http://localhost:4200`

## Rutas activas de la UI

Definidas en `marine-instrumentation-ui/src/app/app.routes.ts`:

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

## Salud tecnica (snapshot 2026-02-19)

Comandos verificados:

- `marine-data-contract`: `npm run test:run` -> OK.
- `marine-instrumentation-ui`: `npm run build` -> OK (con warnings de budget).
- `marine-data-simulator`: `npm run build` -> OK.
- `marine-sensor-gateway`: `npm run build` -> OK.

Detalle completo en `docs/IMPLEMENTATION_STATUS.md`.

## Estructura del repositorio

```text
open-marine/
  marine-data-contract/
  marine-data-simulator/
  marine-instrumentation-ui/
  marine-sensor-gateway/
  signalk-runtime/
  docs/
```

## Reglas de trabajo

- No crear documentacion paralela fuera de este set.
- Cualquier cambio funcional debe actualizar `docs/IMPLEMENTATION_STATUS.md` y `docs/ROADMAP_NEXT_STEPS.md`.
- Cualquier IA debe seguir `docs/AI_PLAYBOOK.md` antes de implementar.

