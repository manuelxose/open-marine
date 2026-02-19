# Roadmap Next Steps

Plan de ejecucion pendiente con prioridad tecnica real.

Fecha base: 2026-02-19.

## 1. Prioridad global

Orden de trabajo obligatorio:

1. Dejar todos los builds en verde.
2. Garantizar smoke test funcional extremo a extremo.
3. Subir cobertura minima de pruebas en paquetes criticos.
4. Optimizar peso inicial de UI.

## 2. Fase P0 - Build Verde en Todo el Monorepo

Estado: `✅` completada.

Resultados:

- `✅` `marine-data-simulator` compila en verde.
- `✅` `marine-sensor-gateway` compila en verde.

Cambios aplicados:

- Simulator:
- `src/index.ts`: guardas de indices en parseo posicional CLI.
- `src/scenarios/busyShippingLane.ts`: fallback para tipo de buque.

- Gateway:
- `src/ais/rtlAisGateway.ts`: tipo de proceso hijo corregido para `spawn` con `stdin: ignore`.
- `src/ais/rtlAisGateway.ts`: manejo de `pid` con `delete` para cumplir `exactOptionalPropertyTypes`.

## 3. Fase P1 - Smoke E2E reproducible

Estado: `[PENDING]`.

Objetivo:

- Validar flujo completo con Signal K + simulator + UI (+ gateway opcional).

Tareas:

- Ejecutar runbook completo (`docs/SETUP_RUNBOOK.md`).
- Registrar checklist de verificacion funcional.
- Dejar procedimiento de smoke test en un bloque reutilizable de comandos.

Criterio de aceptacion:

- Checklist funcional completado sin bloqueos criticos.

## 4. Fase P2 - Calidad de codigo

Estado: `[PENDING]`.

Objetivos:

- Aumentar confianza en cambios.

Tareas:

- Anadir tests unitarios en simulator para escenarios criticos.
- Anadir tests unitarios en gateway para parseo/restart logic de AIS.
- Anadir tests minimos en UI para rutas y store integration.

Criterio de aceptacion:

- Cada paquete critico con al menos una bateria minima de tests automatizados ejecutables en CI local.

## 5. Fase P3 - Performance y deuda UI

Estado: `[PENDING]`.

Objetivos:

- Reducir warnings de budgets en build UI.

Tareas:

- Revisar SCSS de componentes que exceden budget.
- Reducir tamano de `styleguide-page` donde sea viable.
- Evaluar split adicional de chunks pesados.

Criterio de aceptacion:

- Warning de presupuesto inicial reducido o justificado documentalmente.

## 6. Fase P4 - Mantenimiento documental

Estado: `[IN_PROGRESS]`.

Objetivo:

- Sostener solo el set canonico de documentos.

Tareas:

- Mantener sincronizados: `README.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/ROADMAP_NEXT_STEPS.md`.
- No reintroducir `*_PROMPT.md` como fuente de estado operativo.

Criterio de aceptacion:

- Sin duplicidades documentales en revisiones futuras.

## 7. Backlog secundario

Estado: `[PENDING]`.

- Script unico para levantar stack completo en desarrollo.
- Plantilla de reporte de regresiones visuales para `/styleguide` y `/widgets`.
- Definir baseline de metricas (build time, bundle size, memoria en chart).

## 8. Cierre de cada iteracion

Para cerrar una iteracion como completada:

- Actualizar `docs/IMPLEMENTATION_STATUS.md` con resultados reales.
- Marcar cada bloque con `✅`, `[IN_PROGRESS]`, `[BLOCKED]` o `[PENDING]`.
- Registrar comandos de verificacion ejecutados.
