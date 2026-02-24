# Copilot Instructions - Open Marine

Estado: 2026-02-19.

## Fuente unica de contexto

Antes de proponer cambios, revisar:

- `docs/AI_PLAYBOOK.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ROADMAP_NEXT_STEPS.md`
- `docs/architecture.md`

## Alcance del repositorio

Monorepo con 5 paquetes:

- `marine-data-contract`
- `marine-data-simulator`
- `marine-sensor-gateway`
- `marine-instrumentation-ui`
- `signalk-runtime`

## Reglas tecnicas

- Usar `PATHS` de `@omi/marine-data-contract` para rutas Signal K.
- No introducir `any` salvo bloqueo justificado.
- En UI, seguir el flujo: `SignalKClientService` -> `DatapointStoreService` -> componentes.
- No crear docs nuevos fuera del set canonico en `docs/`.

## Regla visual critica (evitar cajas solapadas)

Cuando se toque UI:

- No encapsular un componente que ya tiene superficie (`card`, `panel`, `banner`) dentro de otra superficie con borde/radio/sombra.
- Evitar bordes en `:host` si el template ya renderiza contenedor visual.
- Mantener tokens de espaciado/radius y no introducir offsets negativos para alinear.
- Validar en `/styleguide` y `/widgets` antes de cerrar la tarea.

## Entrega minima esperada

- Build del paquete afectado en verde.
- Estado documentado en `docs/IMPLEMENTATION_STATUS.md`.
- Si cambia prioridad, actualizar `docs/ROADMAP_NEXT_STEPS.md`.

