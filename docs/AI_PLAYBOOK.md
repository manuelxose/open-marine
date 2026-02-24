# AI Playbook

Guia operativa para cualquier IA que implemente cambios en `open-marine`.

Estado de esta guia: 2026-02-19.

## 1. Objetivo

Reducir retrabajo y errores repetidos (especialmente en UI), garantizando que cada cambio termine con:

- codigo consistente con la arquitectura,
- estado tecnico verificado,
- documentacion actualizada.

## 2. Documentos obligatorios

Antes de tocar codigo, leer como minimo:

- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ROADMAP_NEXT_STEPS.md`
- `docs/architecture.md`

Para ejecutar el entorno: `docs/SETUP_RUNBOOK.md`.

## 3. Flujo obligatorio por tarea

### Paso A: Entender alcance

- Identificar paquete(s) afectados.
- Confirmar si la tarea es funcional, visual o de infraestructura.
- Revisar si existe incidencia abierta en `docs/IMPLEMENTATION_STATUS.md`.

### Paso B: Levantar evidencia local

- Ejecutar build/test/lint del paquete afectado.
- Si hay errores preexistentes, registrarlos antes de empezar cambios.
- No declarar "completado" sin evidencia de comandos.

### Paso C: Implementar cambios

- Cambios pequenos y coherentes por capa.
- Evitar mezclar refactor grande con fix funcional en un unico bloque.
- Mantener tipado estricto.

### Paso D: Validar

- Re-ejecutar build del paquete tocado.
- Re-ejecutar pruebas disponibles del paquete tocado.
- Si hay UI: validar visualmente en desktop y mobile.

### Paso E: Actualizar documentacion

Actualizar si aplica:

- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ROADMAP_NEXT_STEPS.md`
- README del paquete modificado

## 4. Reglas de arquitectura que no se rompen

- En UI, el flujo de datos es: `SignalKClientService` -> `DatapointStoreService` -> vistas/features.
- Las rutas Signal K se consumen desde `@omi/marine-data-contract` (`PATHS`).
- El contrato compartido se recompila antes de consumir cambios en otros paquetes.
- Evitar duplicar servicios o componentes equivalentes en carpetas legacy.

## 5. Regla visual critica: evitar cajas y bordes solapados

Este error ya aparecio en componentes de styleguide/widgets. Para no repetirlo:

- Usar una sola "superficie visual" por componente compuesto (card, panel, banner, widget).
- Si el template interno ya tiene contenedor con borde/radius/sombra, `:host` debe quedar neutro (`display: block; min-width: 0;`) sin borde extra.
- No envolver patrones/widgets en contenedores demo con borde adicional salvo necesidad real.
- Evitar margenes negativas, `position: absolute` para corregir alineado, o offsets manuales de pixeles.
- Mantener espaciado y radios usando tokens globales (`--space-*`, `--radius-*`).
- Revisar overflow: si un hijo se recorta, corregir layout del contenedor, no con transforms de parche.

Checklist rapido antes de cerrar una tarea visual:

- `/styleguide` no muestra dobles marcos ni bordes montados.
- `/widgets` mantiene alineacion y densidad correctas.
- Botones de accion no quedan fuera del bloque visual.
- Variantes `active/ack/silenced/error` conservan jerarquia visual.

## 6. Definition of done (DoD)

Una tarea solo esta "done" cuando:

- build del paquete afectado: OK,
- tests del paquete afectado: OK (si existen),
- validacion visual completada (si aplica),
- estado documental actualizado,
- no quedan TODO sin registrar en roadmap/estado.

## 7. Plantilla de entrega para IA

Usar este formato en cada entrega:

1. Alcance exacto del cambio.
2. Archivos tocados.
3. Comandos ejecutados y resultado.
4. Riesgos residuales o bloqueos.
5. Siguiente paso recomendado (si existe).

## 8. Anti-patrones a evitar

- Afirmar que algo esta completado sin ejecutar build/test.
- Marcar docs como "actualizados" dejando referencias a archivos eliminados.
- Introducir nuevas guias paralelas (`*_PROMPT.md`) para estado operativo.
- Mezclar cambios funcionales con cambios de formato masivos sin necesidad.

## 9. Convencion de estado

Usar estos marcadores en docs de estado/roadmap:

- `✅` completado
- `[IN_PROGRESS]` en progreso
- `[BLOCKED]` bloqueado
- `[PENDING]` pendiente

La marca `✅` es el simbolo oficial de completado para este proyecto.


