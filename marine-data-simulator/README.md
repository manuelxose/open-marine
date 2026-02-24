# Marine Data Simulator

Generador de datos marinos y trafico AIS para pruebas de la plataforma.

Estado: 2026-02-19.

## Objetivo

Publicar mensajes Delta de Signal K sobre WebSocket para probar la UI sin hardware real.

## Scripts

```powershell
npm install
npm run dev
npm run build
npm run lint
```

## Uso basico

```powershell
npm run dev -- --host http://localhost:3000 --scenario basic-cruise --rate 1
```

Argumentos:

- `--host`: URL base de Signal K (`http://localhost:3000` por defecto).
- `--scenario`: nombre del escenario.
- `--rate`: frecuencia de actualizacion en Hz.

Token opcional:

```powershell
$env:SIGNALK_TOKEN="<token>"
```

## Escenarios disponibles

- `basic-cruise`
- `harbor-traffic`
- `coastal-run`
- `anchored-stale`
- `busy-shipping-lane`
- `combined-failures`
- `anchor-drift`

## Arquitectura interna

- Entrada CLI: `src/index.ts`
- Motor de simulacion: `src/engine/simulatorEngine.ts`
- Publicacion WS: `src/publishers/wsPublisher.ts`
- Escenarios: `src/scenarios/*.ts`

## Estado de compilacion actual

Snapshot 2026-02-19:

- `npm run build` en verde.

Ver detalle en `../docs/IMPLEMENTATION_STATUS.md`.

## Buenas practicas para nuevos escenarios

- Reusar rutas desde `@omi/marine-data-contract`.
- Mantener unidades consistentes (angulos en radianes internamente).
- Evitar valores `undefined` en campos tipados obligatorios.
