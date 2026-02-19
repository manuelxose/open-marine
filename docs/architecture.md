# Architecture

Arquitectura tecnica consolidada de `open-marine`.

Fecha de referencia: 2026-02-19.

## 1. Vision general

`open-marine` es un monorepo para visualizacion y simulacion de datos marinos basados en Signal K.

Componentes:

- Contrato tipado compartido (`marine-data-contract`).
- Simulador de datos y trafico AIS (`marine-data-simulator`).
- Gateway de sensores reales y forwarding AIS (`marine-sensor-gateway`).
- Frontend Angular para operacion marina (`marine-instrumentation-ui`).
- Runtime local de Signal K en Docker (`signalk-runtime`).

## 2. Diagrama de alto nivel

```text
[Simulador] -------------------+
                               |
[Sensores reales / rtl_ais] ---+--> [Signal K Server] --> [Angular UI]
                                      (REST + WS)
```

Servicios y puertos principales:

- Signal K UI/API: `http://localhost:3000`
- Signal K stream: `ws://localhost:3000/signalk/v1/stream`
- Angular UI: `http://localhost:4200`

## 3. Responsabilidad por paquete

## 3.1 `marine-data-contract`

Responsabilidad:

- Definir rutas Signal K tipadas (`PATHS`).
- Definir tipos base (`DataPoint`, calidad, unidades).
- Exponer utilidades comunes de conversion y normalizacion.

Regla:

- Cualquier nueva ruta o unidad se agrega aqui primero.

## 3.2 `marine-data-simulator`

Responsabilidad:

- Generar escenarios navegables y eventos de fallo.
- Publicar mensajes Delta por WebSocket a Signal K.

Punto de entrada:

- `marine-data-simulator/src/index.ts`

Publisher activo:

- `marine-data-simulator/src/publishers/wsPublisher.ts`

Escenarios actualmente registrados:

- `basic-cruise`
- `harbor-traffic`
- `coastal-run`
- `anchored-stale`
- `busy-shipping-lane`
- `combined-failures`
- `anchor-drift`

## 3.3 `marine-sensor-gateway`

Responsabilidad:

- Ser capa de integracion para sensores reales.
- Incluir gateway AIS basado en `rtl_ais` con reintentos/backoff.

Estado funcional:

- `StubSensorGateway` operativo como estructura base.
- `AisGateway` con proceso hijo, parseo NMEA y forward UDP/TCP.

## 3.4 `marine-instrumentation-ui`

Responsabilidad:

- Renderizar informacion marina en tiempo real.
- Proveer rutas de operacion, widgets y styleguide.

Rutas activas:

- `/dashboard`, `/chart`, `/instruments`, `/alarms`, `/diagnostics`
- `/settings`, `/widgets`, `/styleguide`, `/resources`, `/autopilot`

## 3.5 `signalk-runtime`

Responsabilidad:

- Proveer servidor Signal K local para integracion y desarrollo.

Implementacion:

- `signalk-runtime/docker-compose.yml`

## 4. Flujo de datos en UI

## 4.1 Ingestion

- `SignalKClientService` abre WebSocket con Signal K.
- Mensajes Delta se normalizan en `signalk-mapper`.
- Datos propios (`self`) y AIS se separan.

## 4.2 Estado central

- `DatapointStoreService` mantiene el estado de datapoints propios.
- `AisStoreService` mantiene objetivos AIS.

## 4.3 Consumo

- Features y widgets se suscriben al store.
- Render y calculos se hacen en capa UI sin escribir estado directo.

Regla de oro:

- No bypass del store con lecturas directas de WebSocket en componentes.

## 5. Flujo de build y dependencias

Orden recomendado:

1. `marine-data-contract` (primero)
2. `marine-data-simulator`
3. `marine-sensor-gateway`
4. `marine-instrumentation-ui`
5. `signalk-runtime` (independiente, Docker)

Motivo:

- UI/simulator/gateway consumen `@omi/marine-data-contract` via `file:`.

## 6. Convenciones funcionales

- Angulos internos en radianes salvo UI formateada.
- Rutas Signal K solo desde `PATHS`.
- Timestamp siempre ISO 8601 UTC.
- Calidad de dato conservada en el pipeline.

## 7. Convenciones visuales

- Una unica superficie por widget/patron para evitar solapamientos.
- Tokens compartidos para spacing, radius y color.
- No encapsular un componente ya estilizado en otra card con borde.

Referencia operativa: `docs/AI_PLAYBOOK.md`.

## 8. Estado actual de arquitectura

Completado:

- styleguide y widgets consolidados en UI (`/styleguide`, `/widgets`).
- rutas principales en produccion de desarrollo.
- Signal K runtime dockerizado.

Pendiente:

- dejar build verde en simulator y gateway,
- ampliar cobertura de pruebas,
- reforzar smoke tests de integracion entre paquetes.

Detalle en:

- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ROADMAP_NEXT_STEPS.md`


