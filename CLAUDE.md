# CLAUDE.md

Guia minima para asistentes IA en `open-marine`.

Estado: 2026-02-19.

## Documentos canonicos

Trabaja solo con esta documentacion:

- `docs/AI_PLAYBOOK.md`
- `docs/architecture.md`
- `docs/SETUP_RUNBOOK.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ROADMAP_NEXT_STEPS.md`

## Orden recomendado de lectura

1. `docs/AI_PLAYBOOK.md`
2. `docs/IMPLEMENTATION_STATUS.md`
3. `docs/ROADMAP_NEXT_STEPS.md`
4. `docs/architecture.md`
5. `docs/SETUP_RUNBOOK.md`

## Reglas operativas

- No asumir estado: verificar build/test antes de afirmar que algo esta completo.
- No introducir rutas Signal K en texto plano si existe `PATHS` en `@omi/marine-data-contract`.
- Mantener la arquitectura de flujo unico en UI: `SignalKClientService` -> `DatapointStoreService` -> features/widgets.
- Evitar duplicar componentes o docs: consolidar en los archivos canonicos.
- Cualquier cambio de estado debe reflejarse en `docs/IMPLEMENTATION_STATUS.md` y, si aplica, en `docs/ROADMAP_NEXT_STEPS.md`.

## Definition of done para tareas de codigo

- Compilacion del paquete afectado en verde.
- Lint/tests del paquete afectado ejecutados cuando existan.
- Sin regresiones visuales obvias en UI (desktop y mobile).
- Documentacion actualizada en los archivos canonicos.

## Punto de entrada del repositorio

El resumen general del proyecto esta en `README.md`.

