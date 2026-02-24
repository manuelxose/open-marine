# Marine Data Contract

Contrato compartido para tipos y rutas Signal K usados en todo el monorepo.

Estado: 2026-02-19.

## Objetivo

Este paquete evita strings sueltos y discrepancias de unidades entre UI, simulator y gateway.

## Scripts

```powershell
npm install
npm run build
npm run test:run
npm run lint
```

## API principal

- `PATHS`: arbol tipado de rutas Signal K.
- `SignalKPath`: union tipada de rutas validas.
- Tipos de dominio compartidos (`DataPoint`, calidad, etc.).

## Rutas destacadas

- `PATHS.navigation.position`
- `PATHS.navigation.speedOverGround`
- `PATHS.navigation.courseOverGroundTrue`
- `PATHS.navigation.headingTrue`
- `PATHS.navigation.headingMagnetic`
- `PATHS.environment.depth.belowTransducer`
- `PATHS.environment.wind.angleApparent`
- `PATHS.environment.wind.speedApparent`
- `PATHS.steering.autopilot.state`
- `PATHS.electrical.batteries.house.voltage`

## Regla de uso

En paquetes consumidores:

- No hardcodear rutas (`"navigation.*"`).
- Importar siempre desde `@omi/marine-data-contract`.

Ejemplo:

```ts
import { PATHS } from '@omi/marine-data-contract';

const path = PATHS.navigation.headingTrue;
```

## Flujo de cambios recomendado

1. Modificar tipos/rutas en `src/`.
2. Ejecutar `npm run build`.
3. Ejecutar `npm run test:run`.
4. Reinstalar/rebuild en paquetes consumidores si hace falta.

## Estado de calidad

- Tests existentes: `src/types.spec.ts`.
- Snapshot 2026-02-19: `3/3` tests en verde.
