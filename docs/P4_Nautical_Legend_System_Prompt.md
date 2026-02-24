# PROMPT P4: Sistema de Leyenda Náutica — Símbolos, Abreviaturas y Convenciones
## Open Marine Instrumentation — Referencia Completa de Carta Náutica

**Versión:** 1.0 | **Fecha:** 2026-02-23 | **Estimación:** 8-10 horas
**Prerequisitos completados:**
- ✅ P0: Modos de mapa OSM → Satellite → Nautical → ENC
- ✅ P1: AIS tracks históricos + predicción
- ✅ P2: Carta vectorial ENC con estilos S-52
- ✅ P3: Vessel enrichment service

**Prioridad:** P4 — Funcionalidad esencial para formación y referencia en navegación

---

## 🎯 OBJETIVO

Crear un **sistema de leyenda náutica completo y consultable** directamente desde la
aplicación, que sirva como referencia profesional para:

- Todos los símbolos que aparecen en la carta (modos ENC y Nautical)
- Todos los elementos de UI propios de OMI (iconos AIS, alertas CPA, datos HUD)
- Abreviaturas náuticas estándar usadas en el panel de detalles y en la carta
- Convenciones de iluminación de faros (características de luz, colores, periodos)
- Sistema de balizamiento IALA-A (Europa, África, Asia, Oceanía)
- Señales de tráfico marítimo (TSS, áreas de precaución, zonas restringidas)
- Códigos de tipo de barco AIS (ITU-R M.1371-5)
- Sistema de profundidades y notación batimétrica
- Vientos, mareas y corrientes — símbolos y unidades

**Acceso:** Botón "?" persistente en la esquina inferior izquierda del chart, que abre
un modal fullscreen con navegación por categorías. También accesible desde la barra de
navegación lateral global.

**Características clave:**
- Búsqueda full-text instantánea sobre todo el contenido de la leyenda
- 12 categorías temáticas con navegación por tabs o sidebar
- Cada entrada: símbolo visual + nombre + descripción + norma de referencia
- Modo oscuro/claro respetando el tema actual de la app
- Offline-first: todo el contenido está embebido, sin requests externos
- Responsive: modal fullscreen en móvil, panel grande en desktop
- i18n: EN y ES completo

---

## 📁 ARCHIVOS INVOLUCRADOS

```
marine-instrumentation-ui/src/app/
├── features/chart-legend/                      ← CREAR CARPETA NUEVA
│   ├── chart-legend.component.ts               ← CREAR: componente modal principal
│   ├── chart-legend.component.html             ← CREAR: template completo
│   ├── chart-legend.component.scss             ← CREAR: estilos
│   ├── chart-legend-data.ts                    ← CREAR: datos estáticos completos
│   ├── chart-legend-search.pipe.ts             ← CREAR: pipe de búsqueda
│   └── components/
│       ├── legend-symbol/
│       │   └── legend-symbol.component.ts      ← CREAR: símbolo individual SVG
│       └── legend-category/
│           └── legend-category.component.ts    ← CREAR: sección de categoría
├── features/chart/
│   ├── chart.page.html                         ← MODIFICAR: añadir botón "?" y modal
│   ├── chart.page.ts                           ← MODIFICAR: showLegend signal
│   └── chart.page.css                         ← MODIFICAR: posición botón leyenda
├── core/i18n/
│   ├── en.ts                                   ← MODIFICAR: claves legend.*
│   └── es.ts                                   ← MODIFICAR: claves legend.*
└── app.routes.ts                               ← MODIFICAR: ruta /legend (acceso global)
```

---

## 🔍 ESTADO ACTUAL — Integración en chart.page

```html
<!-- chart.page.html actual — layout conocido: -->
<div class="chart-page">
  <app-chart-canvas class="chart-canvas" ...></app-chart-canvas>
  <app-chart-hud class="chart-hud" ...></app-chart-hud>
  <app-map-controls class="map-controls-overlay" ...></app-map-controls>
  <app-alarm-status-widget class="alarm-widget"></app-alarm-status-widget>

  <!-- FAB de instrumentos — bottom-right, z-index: 3 -->
  <app-fab class="instruments-fab" icon="compass" ...></app-fab>

  <div class="chart-side">...</div>
  <app-instruments-drawer ...></app-instruments-drawer>
  <app-playback-bar ...></app-playback-bar>
</div>

<!-- AÑADIR en P4:
  - Botón "?" bottom-left (separado de map-controls-overlay que está top-left)
  - Modal fullscreen <app-chart-legend>
-->
```

```css
/* chart.page.css — posiciones actuales: */
.map-controls-overlay { position: absolute; top: 1.5rem; left: 1.5rem; z-index: 2; }
.alarm-widget         { position: absolute; top: 1.5rem; left: 50%; z-index: 2; }
.chart-hud            { position: absolute; left: 1.5rem; bottom: 1.5rem; z-index: 2; }
.instruments-fab      { position: absolute; right: 1.5rem; bottom: 1.5rem; z-index: 3; }

/* NUEVA posición para el botón de leyenda: bottom-left, ENCIMA del HUD */
/* .legend-btn: bottom: 1.5rem, left: calc(1.5rem + 360px + 1rem)   ← desktop */
/* .legend-btn: bottom: 1.5rem, left: 1.5rem (cuando HUD no existe / móvil) */
```

---

## 📐 ARQUITECTURA DEL CONTENIDO — 12 Categorías

### Categoría 1: SÍMBOLOS DE LA APLICACIÓN (OMI)
*Los elementos propios de nuestra UI — lo que el usuario ve en pantalla*

| Símbolo | Nombre | Descripción |
|---------|--------|-------------|
| Triángulo azul | Buque propio (GPS bueno) | Posición del barco con fix GPS válido (<2s) |
| Triángulo amarillo | Buque propio (GPS antiguo) | Fix GPS entre 2-10 segundos de antigüedad |
| Triángulo gris | Buque propio (sin fix) | Sin señal GPS válida |
| Flecha punteada ámbar | Vector de rumbo (COG) | Proyección de curso y velocidad a 6 minutos |
| Flecha sólida azul | Rumbo verdadero (HDG) | Proa del barco según compás/giróscopo |
| Flecha verde | Viento verdadero (TWD) | Dirección e intensidad del viento real |
| Línea blanca | Track del barco | Rastro de posiciones propias (últimas 30 min) |
| Círculos concéntricos | Anillos de distancia | Escalas de distancia configurables (NM) |
| Línea discontinua con destino | Línea de marcación | Rumbo al waypoint activo |
| Punto de ancla azul | Waypoint | Punto de navegación marcado por el usuario |
| Línea punteada entre waypoints | Ruta activa | Secuencia de waypoints planificada |

### Categoría 2: OBJETIVOS AIS
*Interpretación de todos los iconos de tráfico AIS*

| Símbolo | Nombre | Descripción |
|---------|--------|-------------|
| Rombo relleno + flecha | Clase A navegando | Barco con transponder AIS Clase A en movimiento |
| Rombo vacío + flecha | Clase B navegando | Pequeña embarcación con AIS Clase B |
| Rombo rojo + destello | PELIGRO CPA | Target en ruta de colisión (CPA < umbral) |
| Cuadrado | Fondeado/Amarrado | Target con SOG < 0.3 kn |
| Cruz | Ayuda a la navegación (AtoN) | Boya, faro u otra señalización con transponder |
| Punto parpadeante | Base Station | Estación base AIS terrestre |
| Línea gris (trail) | Track histórico AIS | Estela de los últimos 30 minutos del target |
| Línea discontinua ámbar | Predicción trayectoria | Proyección lineal de 6 minutos del target |
| Línea roja doble | Línea CPA | Punto de máximo acercamiento calculado |

### Categoría 3: BALIZAMIENTO IALA-A
*Sistema de balizamiento lateral y cardinal — válido en Europa, África, Asia, Oceanía*

**Lateral (canal navegable):**
| Símbolo | Nombre | Color | Luz | Significado |
|---------|--------|-------|-----|-------------|
| Cono rojo hacia arriba | Boya de babor | Rojo | Rojo, ritmo cualquiera | Dejar por babor (a la izquierda) entrando al puerto |
| Cono verde hacia abajo | Boya de estribor | Verde | Verde, ritmo cualquiera | Dejar por estribor (a la derecha) entrando al puerto |
| Esfera roja/blanca | Boya de aguas seguras | Rojo y blanco | Isofase / Ocultación / LFl | Centro del canal, agua segura en todos lados |
| Boya amarilla | Señal especial | Amarillo | Ritmo cualquiera | Zona especial (fondeo, cables, vertidos) |

**Cardinal (indica agua profunda respecto al peligro):**
| Símbolo | Nombre | Colores | Luz | Significado |
|---------|--------|---------|-----|-------------|
| Conos arriba/arriba | Cardinal Norte | Negro arriba / Amarillo abajo | VQ o Q (muy rápida o rápida) | Pase por el NORTE del peligro |
| Conos abajo/abajo | Cardinal Sur | Amarillo arriba / Negro abajo | VQ(6)+LFl o Q(6)+LFl | Pase por el SUR del peligro |
| Cono abajo/arriba | Cardinal Este | Negro — franja amarilla — Negro | VQ(3) o Q(3) | Pase por el ESTE del peligro |
| Cono arriba/abajo | Cardinal Oeste | Amarillo — franja negra — Amarillo | VQ(9) o Q(9) | Pase por el OESTE del peligro |

**Peligro aislado:**
| Símbolo | Nombre | Color | Luz | Significado |
|---------|--------|-------|-----|-------------|
| Esferas negras sobre rojo/negro | Peligro aislado | Negro y rojo | Fl(2) | Peligro pequeño con agua navegable alrededor |

### Categoría 4: CARACTERÍSTICAS DE LUCES
*Interpretación de las abreviaturas de luz de los faros*

| Abrev. | Nombre | Descripción visual |
|--------|--------|-------------------|
| F | Fixed (Fija) | Luz continua sin interrupciones |
| Fl | Flashing (Centelleante) | Destellos, oscuridad > luz |
| LFl | Long Flashing | Destellos largos (≥2s) |
| Q | Quick (Rápida) | 50-79 destellos/minuto |
| VQ | Very Quick (Muy rápida) | 80-159 destellos/minuto |
| UQ | Ultra Quick | 160+ destellos/minuto |
| Iso | Isophase | Luz y oscuridad iguales |
| Oc | Occulting | Oscuridades, luz > oscuridad |
| Al | Alternating | Alterna entre dos colores |
| Mo | Morse | Señal morse |
| Fl(2) | Group Flashing | 2 destellos por periodo |
| Fl(2+1) | Group + Flash | 2 destellos, pausa, 1 destello |

**Colores:**
| Abrev. | Color |
|--------|-------|
| W | Blanco |
| R | Rojo |
| G | Verde |
| Y | Amarillo |
| Bu | Azul |
| Vi | Violeta |

**Ejemplo de interpretación:** `Fl(3)R 10s 15M`
= Centelleante en grupos de 3, color ROJO, periodo de 10 segundos, alcance de 15 millas náuticas

### Categoría 5: PELIGROS Y NATURALEZA DEL FONDO
*Símbolos de peligros náuticos según IHO INT 1*

| Símbolo | Nombre | Descripción |
|---------|--------|-------------|
| + con asterisco | Roca cubierta | Roca que siempre está bajo el agua |
| * sobre la línea | Roca a flor | Roca visible con marea baja |
| Cruz negra | Roca awash | Roca a nivel de la superficie |
| Símbolo de pecio | Pecio conocido | Barco hundido que obstruye |
| Símbolo de pecio discontinuo | Pecio peligroso | Pecio con profundidad desconocida |
| Punto con círculo | Obstáculo | Objeto sumergido no identificado |
| Símbolo de ancla | Ancla perdida | Cable o ancla en el fondo |
| S | Arena | Naturaleza del fondo: arena |
| M | Fango (Mud) | Naturaleza del fondo: fango |
| Cy | Arcilla (Clay) | Naturaleza del fondo: arcilla |
| G | Grava | Naturaleza del fondo: grava |
| R | Roca | Naturaleza del fondo: roca |
| Co | Coral | Naturaleza del fondo: coral |
| Sh | Concha (Shell) | Naturaleza del fondo: conchas |
| Wd | Algas (Weed) | Naturaleza del fondo: algas |

### Categoría 6: BATIMETRÍA Y PROFUNDIDADES
*Lectura de curvas de nivel y profundidades en carta*

**Líneas batimétricas:**
- Línea azul sólida fina: Isolínea de profundidad menor (2m, 5m)
- Línea azul sólida media: Isolínea de profundidad media (10m, 20m)
- Línea azul sólida gruesa: Isolínea de profundidad mayor (50m, 100m, 200m)
- Área azul claro: Zona de 0-5m — peligrosa para la mayoría de embarcaciones
- Área azul medio: Zona de 5-20m — precaución
- Área azul oscuro: Zona >20m — generalmente segura

**Notación de profundidades en carta:**
- Número solo (ej: `12`): 12 decímetros (1.2m) en cartas antiguas
- Número con decimales (ej: `5.3`): 5.3 metros (escala métrica moderna)
- Número subrayado (ej: `̲4`): Profundidad reducida — alerta de bajos fondos
- Datúm de referencia: Nivel de Bajamar Equinoccial Media (MLLW en UK/EEUU)

**Calado de seguridad:**
- En modo ENC, la profundidad de seguridad configurable resalta en rojo
  las zonas con menos agua que el calado del barco

### Categoría 7: ZONAS Y ÁREAS
*Delimitaciones de áreas especiales*

| Símbolo | Nombre | Color borde | Color relleno | Descripción |
|---------|--------|-------------|---------------|-------------|
| Línea discontinua azul | Zona TSS | Azul | Azul translúcido | Traffic Separation Scheme — separación de tráfico |
| Línea punteada roja | Zona restringida | Rojo | Rojo translúcido | Acceso prohibido o condicionado |
| Ancla con círculo | Zona de fondeo | Azul marino | Sin relleno | Área designada para fondeo |
| Línea zigzag | Zona de precaución | Naranja | Naranja translúcido | Navegar con precaución extrema |
| Línea amarilla discontinua | Zona especial | Amarillo | Amarillo translúcido | Áreas con regulaciones específicas |
| Línea verde | Área protegida | Verde | Verde translúcido | Parque marino, reserva, zona sensible |

### Categoría 8: LÍNEAS Y DEMARCACIONES
*Líneas de referencia y delimitación en la carta*

| Símbolo | Nombre | Descripción |
|---------|--------|-------------|
| Línea negra gruesa | Costa (shoreline) | Límite tierra/agua en MHWS |
| Línea punteada fina | Límite de aguas territoriales | 12 millas náuticas |
| Línea punteada doble | Límite ZEE | Zona Económica Exclusiva (200 mn) |
| Línea roja | Límite internacional | Frontera marítima internacional |
| Línea azul discontinua | Línea de sondas iguales | Isolínea batimétrica |
| Línea verde | Límite del puerto | Aguas portuarias |

### Categoría 9: ABREVIATURAS NÁUTICAS
*Diccionario de todas las abreviaturas usadas en la aplicación*

**Navegación:**
| Abrev. | Inglés | Español |
|--------|--------|---------|
| SOG | Speed Over Ground | Velocidad sobre el fondo |
| COG | Course Over Ground | Rumbo sobre el fondo |
| HDG | Heading | Proa / Rumbo de la quilla |
| TWD | True Wind Direction | Dirección del viento verdadero |
| TWS | True Wind Speed | Velocidad del viento verdadero |
| AWA | Apparent Wind Angle | Ángulo del viento aparente |
| AWS | Apparent Wind Speed | Velocidad del viento aparente |
| ROT | Rate of Turn | Velocidad de giro / Velocidad de caída |
| CPA | Closest Point of Approach | Punto de máximo acercamiento |
| TCPA | Time to CPA | Tiempo hasta el CPA |
| VMG | Velocity Made Good | Velocidad hacia el objetivo |
| DTW | Distance to Waypoint | Distancia al waypoint |
| BTW | Bearing to Waypoint | Rumbo al waypoint |
| ETA | Estimated Time of Arrival | Hora estimada de llegada |
| ETD | Estimated Time of Departure | Hora estimada de salida |
| XTE | Cross Track Error | Error de derrota |
| BOD | Bearing Origin to Destination | Rumbo origen-destino |
| LOG | Log | Corredera — distancia recorrida por el agua |

**Geodesia:**
| Abrev. | Inglés | Español |
|--------|--------|---------|
| LAT | Latitude | Latitud |
| LON | Longitude | Longitud |
| WGS84 | World Geodetic System 1984 | Sistema geodésico mundial 1984 |
| MLLW | Mean Lower Low Water | Bajamar media de aguas bajas (USA) |
| MHWS | Mean High Water Springs | Pleamar media de sicigias |
| MSL | Mean Sea Level | Nivel medio del mar |
| HAT | Highest Astronomical Tide | Máxima pleamar astronómica |
| LAT | Lowest Astronomical Tide | Mínima bajamar astronómica |

**Instrumentación:**
| Abrev. | Inglés | Español |
|--------|--------|---------|
| GPS | Global Positioning System | Sistema de posicionamiento global |
| GNSS | Global Navigation Satellite System | Sistema global de navegación por satélite |
| AIS | Automatic Identification System | Sistema de identificación automática |
| MMSI | Maritime Mobile Service Identity | Identidad MMSI (9 dígitos) |
| IMO | International Maritime Organization | Organización Marítima Internacional |
| VHF | Very High Frequency | Muy alta frecuencia (radio marina) |
| DSC | Digital Selective Calling | Llamada selectiva digital (radio) |
| SART | Search And Rescue Transponder | Transpondedor de búsqueda y rescate |
| EPIRB | Emergency Position Indicating Radio Beacon | Radiobalizas de posición de emergencia |

**Meteorología:**
| Abrev. | Inglés | Español |
|--------|--------|---------|
| Bft | Beaufort | Escala Beaufort (fuerza del viento) |
| QFE | Atmospheric pressure at field elevation | Presión barométrica |
| hPa | Hectopascal | Hectopascal (unidad de presión) |
| mb | Millibar | Milibar (unidad de presión, = hPa) |
| GRIB | Gridded Binary | Formato de datos meteorológicos |

### Categoría 10: UNIDADES Y CONVERSIONES
*Unidades de medida usadas en navegación*

**Distancia:**
| Unidad | Abrev. | Equivalencia |
|--------|--------|-------------|
| Milla náutica | NM / mn | 1852 metros = 1 minuto de arco de latitud |
| Cable | cab | 185.2 metros = 0.1 NM |
| Braza (fathom) | fm | 1.829 metros (profundidades en cartas antiguas) |
| Metro | m | Unidad SI base |
| Pie (foot) | ft | 0.3048 metros |

**Velocidad:**
| Unidad | Abrev. | Equivalencia |
|--------|--------|-------------|
| Nudo | kn / kt | 1 NM/hora = 0.5144 m/s |
| Metro por segundo | m/s | 1.944 nudos |
| Kilómetro por hora | km/h | 0.5399 nudos |

**Ángulos:**
| Convención | Descripción |
|------------|-------------|
| Grados verdaderos (°T) | Referencia: Norte verdadero (geográfico) |
| Grados magnéticos (°M) | Referencia: Norte magnético (compás) |
| Grados de relevo (°R) | Referencia: Proa del barco |
| Variación magnética | Ángulo entre Norte verdadero y magnético (E/W) |
| Desvío | Error del compás por influencias locales del barco |

**Presión:**
- 1 hPa = 1 mbar
- Presión atmosférica estándar: 1013.25 hPa
- Cada 10m de profundidad marina ≈ 1 bar adicional

**Temperatura:**
- Celsius (°C): temperatura del agua y aire en OMI
- Conversión: °F = (°C × 9/5) + 32

### Categoría 11: ESCALA BEAUFORT Y ESCALA DE DOUGLAS
*Fuerza del viento y estado de la mar*

**Escala Beaufort:**
| Fuerza | Descripción | Velocidad (nud) | Estado del mar |
|--------|-------------|----------------|---------------|
| 0 | Calma | <1 | Espejo |
| 1 | Ventolina | 1-3 | Rizos sin espuma |
| 2 | Flojito | 4-6 | Olas pequeñas sin romper |
| 3 | Flojo | 7-10 | Olas pequeñas que rompen |
| 4 | Bonancible | 11-16 | Olas moderadas, algo de espuma |
| 5 | Fresquito | 17-21 | Olas moderadas, muchos caballetes |
| 6 | Fresco | 22-27 | Olas grandes, espuma extensa |
| 7 | Frescachón | 28-33 | Mar gruesa, espuma en rayas |
| 8 | Temporal | 34-40 | Olas muy altas con espuma |
| 9 | Temporal fuerte | 41-47 | Olas enormes, visibilidad reducida |
| 10 | Temporal duro | 48-55 | Olas muy altas que rompen |
| 11 | Temporal muy duro | 56-63 | Olas excepcionales |
| 12 | Huracán | ≥64 | Aire lleno de espuma y spray |

**Escala de Douglas (estado del mar):**
| Grado | Descripción | Altura olas |
|-------|-------------|------------|
| 0 | Glassy / Calma | 0 m |
| 1 | Rippled / Rizada | 0-0.1 m |
| 2 | Wavelets / Suave | 0.1-0.5 m |
| 3 | Slight / Marejadilla | 0.5-1.25 m |
| 4 | Moderate / Marejada | 1.25-2.5 m |
| 5 | Rough / Fuerte marejada | 2.5-4 m |
| 6 | Very rough / Mar gruesa | 4-6 m |
| 7 | High / Mar muy gruesa | 6-9 m |
| 8 | Very high / Arbolada | 9-14 m |
| 9 | Phenomenal / Monstruosa | >14 m |

### Categoría 12: TIPOS DE BARCO AIS (ITU-R M.1371-5)
*Clasificación completa de tipos de buque AIS*

| Código | Tipo | Icono OMI |
|--------|------|-----------|
| 20-28 | Wing In Ground | Especial |
| 30 | Fishing | Pesquero |
| 31-32 | Towing | Remolcador |
| 33 | Dredging | Dragado |
| 35 | Military | Militar |
| 36 | Sailing | Velero |
| 37 | Pleasure Craft | Recreo |
| 50 | Pilot Vessel | Práctico |
| 51 | Search & Rescue | SAR |
| 52 | Tug | Remolcador |
| 53 | Port Tender | Tendera |
| 55 | Law Enforcement | Guardacostas |
| 60-69 | Passenger | Pasaje |
| 70-79 | Cargo | Carga |
| 80-89 | Tanker | Tanquero |
| 90-99 | Other | Otros |

---

## 📐 ESPECIFICACIÓN TÉCNICA DETALLADA POR TAREA

---

### TAREA 1: Crear `chart-legend-data.ts`

**Archivo a crear:** `src/app/features/chart-legend/chart-legend-data.ts`

Este archivo contiene el 90% del trabajo de P4. Es un objeto de datos estáticos
exhaustivo, tipado, y completamente offline. No depende de ningún servicio ni API.

```typescript
// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LegendCategoryId =
  | 'omi-symbols'
  | 'ais-targets'
  | 'iala-a'
  | 'light-characteristics'
  | 'hazards'
  | 'bathymetry'
  | 'zones'
  | 'lines'
  | 'abbreviations'
  | 'units'
  | 'beaufort'
  | 'ais-types';

export interface LegendCategory {
  id: LegendCategoryId;
  nameKey: string;        // clave i18n para el nombre de la categoría
  icon: string;           // nombre de icono de app-icon (o SVG inline)
  descriptionKey: string; // clave i18n para la descripción breve
  entries: LegendEntry[];
}

export interface LegendEntry {
  id: string;             // único dentro de la categoría (snake_case)
  nameKey: string;        // clave i18n
  descriptionKey: string; // clave i18n
  symbol: LegendSymbol;   // representación visual
  standard?: string;      // norma de referencia: 'IHO INT 1', 'IALA-A', 'ITU-R M.1371-5', etc.
  searchTokens?: string[]; // términos adicionales para búsqueda (en múltiples idiomas)
}

export type LegendSymbol =
  | { type: 'svg'; path: string; color?: string; strokeColor?: string; fillColor?: string }
  | { type: 'color-swatch'; color: string; border?: string }
  | { type: 'text-badge'; text: string; color?: string; bgColor?: string }
  | { type: 'composite'; parts: Array<{ shape: string; color: string; position?: string }> }
  | { type: 'line'; dashArray?: string; color: string; width?: number }
  | { type: 'icon'; name: string }; // usa app-icon existente

// ─── Datos ────────────────────────────────────────────────────────────────────

export const LEGEND_CATEGORIES: LegendCategory[] = [

  // ─── CATEGORÍA 1: Símbolos OMI ──────────────────────────────────────────────
  {
    id: 'omi-symbols',
    nameKey: 'legend.categories.omi_symbols',
    icon: 'vessel',
    descriptionKey: 'legend.categories.omi_symbols_desc',
    entries: [
      {
        id: 'own_vessel_good',
        nameKey: 'legend.omi.own_vessel_good',
        descriptionKey: 'legend.omi.own_vessel_good_desc',
        symbol: { type: 'svg', path: 'M12,2 L20,20 L12,16 L4,20 Z', color: '#0284c7', fillColor: '#38bdf8' },
        searchTokens: ['barco propio', 'own ship', 'vessel', 'GPS', 'posición'],
      },
      {
        id: 'own_vessel_stale',
        nameKey: 'legend.omi.own_vessel_stale',
        descriptionKey: 'legend.omi.own_vessel_stale_desc',
        symbol: { type: 'svg', path: 'M12,2 L20,20 L12,16 L4,20 Z', color: '#eab308', fillColor: '#fde047' },
        searchTokens: ['stale', 'antiguo', 'GPS lento'],
      },
      {
        id: 'own_vessel_no_fix',
        nameKey: 'legend.omi.own_vessel_no_fix',
        descriptionKey: 'legend.omi.own_vessel_no_fix_desc',
        symbol: { type: 'svg', path: 'M12,2 L20,20 L12,16 L4,20 Z', color: '#6b7280', fillColor: '#9ca3af' },
        searchTokens: ['no fix', 'sin GPS', 'señal perdida'],
      },
      {
        id: 'cog_vector',
        nameKey: 'legend.omi.cog_vector',
        descriptionKey: 'legend.omi.cog_vector_desc',
        symbol: { type: 'line', color: '#f59e0b', dashArray: '4 3', width: 2 },
        searchTokens: ['COG', 'curso', 'vector', 'rumbo fondo'],
      },
      {
        id: 'heading_vector',
        nameKey: 'legend.omi.heading_vector',
        descriptionKey: 'legend.omi.heading_vector_desc',
        symbol: { type: 'line', color: '#0284c7', width: 2 },
        searchTokens: ['HDG', 'heading', 'proa'],
      },
      {
        id: 'track_line',
        nameKey: 'legend.omi.track_line',
        descriptionKey: 'legend.omi.track_line_desc',
        symbol: { type: 'line', color: '#60a5fa', dashArray: '2 4', width: 1.5 },
        searchTokens: ['track', 'rastro', 'estela', 'recorrido'],
      },
      {
        id: 'waypoint',
        nameKey: 'legend.omi.waypoint',
        descriptionKey: 'legend.omi.waypoint_desc',
        symbol: { type: 'icon', name: 'waypoint' },
        searchTokens: ['waypoint', 'marca', 'punto de navegación'],
      },
      {
        id: 'range_rings',
        nameKey: 'legend.omi.range_rings',
        descriptionKey: 'legend.omi.range_rings_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'circle', color: 'rgba(255,255,255,0.3)', position: 'r=30' },
          { shape: 'circle', color: 'rgba(255,255,255,0.3)', position: 'r=20' },
        ]},
        searchTokens: ['range rings', 'anillos distancia', 'distancias'],
      },
      {
        id: 'bearing_line',
        nameKey: 'legend.omi.bearing_line',
        descriptionKey: 'legend.omi.bearing_line_desc',
        symbol: { type: 'line', color: '#a78bfa', dashArray: '6 3', width: 1.5 },
        searchTokens: ['bearing line', 'marcación', 'línea destino', 'waypoint activo'],
      },
      {
        id: 'true_wind_arrow',
        nameKey: 'legend.omi.true_wind',
        descriptionKey: 'legend.omi.true_wind_desc',
        symbol: { type: 'line', color: '#34d399', width: 2 },
        searchTokens: ['TWD', 'viento verdadero', 'true wind'],
      },
    ],
  },

  // ─── CATEGORÍA 2: AIS targets ────────────────────────────────────────────────
  {
    id: 'ais-targets',
    nameKey: 'legend.categories.ais_targets',
    icon: 'ais',
    descriptionKey: 'legend.categories.ais_targets_desc',
    entries: [
      {
        id: 'ais_class_a_moving',
        nameKey: 'legend.ais.class_a_moving',
        descriptionKey: 'legend.ais.class_a_moving_desc',
        symbol: { type: 'svg', path: 'M12,4 L16,18 L12,15 L8,18 Z', fillColor: '#e5e7eb', color: '#9ca3af' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['Class A', 'SOLAS', 'cargo', 'tanker', 'passenger'],
      },
      {
        id: 'ais_class_b_moving',
        nameKey: 'legend.ais.class_b_moving',
        descriptionKey: 'legend.ais.class_b_moving_desc',
        symbol: { type: 'svg', path: 'M12,4 L16,18 L12,15 L8,18 Z', fillColor: 'transparent', color: '#9ca3af' },
        standard: 'ITU-R M.1371-5',
        searchTokens: ['Class B', 'pleasure', 'sailing', 'recreational'],
      },
      {
        id: 'ais_dangerous',
        nameKey: 'legend.ais.dangerous',
        descriptionKey: 'legend.ais.dangerous_desc',
        symbol: { type: 'icon', name: 'alert-triangle' },
        searchTokens: ['CPA', 'TCPA', 'colisión', 'peligro', 'collision warning'],
      },
      {
        id: 'ais_anchored',
        nameKey: 'legend.ais.anchored',
        descriptionKey: 'legend.ais.anchored_desc',
        symbol: { type: 'icon', name: 'anchor' },
        searchTokens: ['fondeado', 'amarrado', 'anchored', 'moored', 'SOG 0'],
      },
      {
        id: 'ais_track',
        nameKey: 'legend.ais.track',
        descriptionKey: 'legend.ais.track_desc',
        symbol: { type: 'line', color: '#9ca3af', width: 1.5 },
        searchTokens: ['AIS track', 'estela AIS', 'historial'],
      },
      {
        id: 'ais_prediction',
        nameKey: 'legend.ais.prediction',
        descriptionKey: 'legend.ais.prediction_desc',
        symbol: { type: 'line', color: '#f59e0b', dashArray: '3 3', width: 1.5 },
        searchTokens: ['predicción', 'prediction', 'trayectoria futura'],
      },
      {
        id: 'cpa_line',
        nameKey: 'legend.ais.cpa_line',
        descriptionKey: 'legend.ais.cpa_line_desc',
        symbol: { type: 'line', color: '#ef4444', width: 1.5 },
        searchTokens: ['CPA line', 'colisión', 'máximo acercamiento'],
      },
    ],
  },

  // ─── CATEGORÍA 3: IALA-A ─────────────────────────────────────────────────────
  {
    id: 'iala-a',
    nameKey: 'legend.categories.iala_a',
    icon: 'anchor',
    descriptionKey: 'legend.categories.iala_a_desc',
    entries: [
      {
        id: 'port_mark',
        nameKey: 'legend.iala.port_mark',
        descriptionKey: 'legend.iala.port_mark_desc',
        symbol: { type: 'color-swatch', color: '#cc2222', border: '#cc2222' },
        standard: 'IALA-A',
        searchTokens: ['babor', 'port', 'rojo', 'red', 'lateral'],
      },
      {
        id: 'starboard_mark',
        nameKey: 'legend.iala.starboard_mark',
        descriptionKey: 'legend.iala.starboard_mark_desc',
        symbol: { type: 'color-swatch', color: '#1a7a1a', border: '#1a7a1a' },
        standard: 'IALA-A',
        searchTokens: ['estribor', 'starboard', 'verde', 'green', 'lateral'],
      },
      {
        id: 'cardinal_north',
        nameKey: 'legend.iala.cardinal_north',
        descriptionKey: 'legend.iala.cardinal_north_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'top-half', color: '#1a1a1a', position: 'top' },
          { shape: 'bottom-half', color: '#ffff00', position: 'bottom' },
        ]},
        standard: 'IALA-A',
        searchTokens: ['cardinal norte', 'north cardinal', 'VQ', 'peligro al sur'],
      },
      {
        id: 'cardinal_south',
        nameKey: 'legend.iala.cardinal_south',
        descriptionKey: 'legend.iala.cardinal_south_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'top-half', color: '#ffff00', position: 'top' },
          { shape: 'bottom-half', color: '#1a1a1a', position: 'bottom' },
        ]},
        standard: 'IALA-A',
        searchTokens: ['cardinal sur', 'south cardinal', 'VQ(6)', 'peligro al norte'],
      },
      {
        id: 'cardinal_east',
        nameKey: 'legend.iala.cardinal_east',
        descriptionKey: 'legend.iala.cardinal_east_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'band', color: '#1a1a1a', position: 'top-bottom' },
          { shape: 'band', color: '#ffff00', position: 'middle' },
        ]},
        standard: 'IALA-A',
        searchTokens: ['cardinal este', 'east cardinal', 'VQ(3)', 'peligro al oeste'],
      },
      {
        id: 'cardinal_west',
        nameKey: 'legend.iala.cardinal_west',
        descriptionKey: 'legend.iala.cardinal_west_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'band', color: '#ffff00', position: 'top-bottom' },
          { shape: 'band', color: '#1a1a1a', position: 'middle' },
        ]},
        standard: 'IALA-A',
        searchTokens: ['cardinal oeste', 'west cardinal', 'VQ(9)', 'peligro al este'],
      },
      {
        id: 'safe_water',
        nameKey: 'legend.iala.safe_water',
        descriptionKey: 'legend.iala.safe_water_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'stripe', color: '#cc2222', position: 'vertical-alternating' },
          { shape: 'stripe', color: '#ffffff', position: 'vertical-alternating' },
        ]},
        standard: 'IALA-A',
        searchTokens: ['aguas seguras', 'safe water', 'fairway', 'midchannel'],
      },
      {
        id: 'isolated_danger',
        nameKey: 'legend.iala.isolated_danger',
        descriptionKey: 'legend.iala.isolated_danger_desc',
        symbol: { type: 'composite', parts: [
          { shape: 'stripe', color: '#cc2222', position: 'horizontal' },
          { shape: 'stripe', color: '#1a1a1a', position: 'horizontal' },
        ]},
        standard: 'IALA-A',
        searchTokens: ['peligro aislado', 'isolated danger', 'Fl(2)'],
      },
      {
        id: 'special_mark',
        nameKey: 'legend.iala.special_mark',
        descriptionKey: 'legend.iala.special_mark_desc',
        symbol: { type: 'color-swatch', color: '#ffaa00', border: '#ffaa00' },
        standard: 'IALA-A',
        searchTokens: ['especial', 'special', 'amarillo', 'yellow', 'fondeo especial'],
      },
    ],
  },

  // ─── CATEGORÍA 4: Características de luces ──────────────────────────────────
  {
    id: 'light-characteristics',
    nameKey: 'legend.categories.lights',
    icon: 'satellite',
    descriptionKey: 'legend.categories.lights_desc',
    entries: [
      {
        id: 'light_fixed',
        nameKey: 'legend.lights.fixed',
        descriptionKey: 'legend.lights.fixed_desc',
        symbol: { type: 'text-badge', text: 'F', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
      },
      {
        id: 'light_fl',
        nameKey: 'legend.lights.fl',
        descriptionKey: 'legend.lights.fl_desc',
        symbol: { type: 'text-badge', text: 'Fl', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['centelleante', 'flash', 'destellos'],
      },
      {
        id: 'light_lfl',
        nameKey: 'legend.lights.lfl',
        descriptionKey: 'legend.lights.lfl_desc',
        symbol: { type: 'text-badge', text: 'LFl', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
      },
      {
        id: 'light_q',
        nameKey: 'legend.lights.q',
        descriptionKey: 'legend.lights.q_desc',
        symbol: { type: 'text-badge', text: 'Q', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['rápida', 'quick', 'cardinal'],
      },
      {
        id: 'light_vq',
        nameKey: 'legend.lights.vq',
        descriptionKey: 'legend.lights.vq_desc',
        symbol: { type: 'text-badge', text: 'VQ', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['muy rápida', 'very quick', 'cardinal norte'],
      },
      {
        id: 'light_iso',
        nameKey: 'legend.lights.iso',
        descriptionKey: 'legend.lights.iso_desc',
        symbol: { type: 'text-badge', text: 'Iso', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
      },
      {
        id: 'light_oc',
        nameKey: 'legend.lights.oc',
        descriptionKey: 'legend.lights.oc_desc',
        symbol: { type: 'text-badge', text: 'Oc', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['ocultación', 'occulting'],
      },
      {
        id: 'light_mo',
        nameKey: 'legend.lights.mo',
        descriptionKey: 'legend.lights.mo_desc',
        symbol: { type: 'text-badge', text: 'Mo', bgColor: '#FFFF88', color: '#1a1a1a' },
        standard: 'IHO INT 1 — P10',
        searchTokens: ['morse', 'Mo(A)', 'Mo(U)'],
      },
      {
        id: 'light_red',
        nameKey: 'legend.lights.red_sector',
        descriptionKey: 'legend.lights.red_sector_desc',
        symbol: { type: 'color-swatch', color: '#cc2222' },
        standard: 'IHO INT 1',
        searchTokens: ['sector rojo', 'peligro', 'zona prohibida'],
      },
      {
        id: 'light_green',
        nameKey: 'legend.lights.green_sector',
        descriptionKey: 'legend.lights.green_sector_desc',
        symbol: { type: 'color-swatch', color: '#1a7a1a' },
        standard: 'IHO INT 1',
        searchTokens: ['sector verde', 'canal seguro'],
      },
    ],
  },

  // ─── CATEGORÍA 5: Peligros ────────────────────────────────────────────────────
  {
    id: 'hazards',
    nameKey: 'legend.categories.hazards',
    icon: 'warning',
    descriptionKey: 'legend.categories.hazards_desc',
    entries: [
      {
        id: 'rock_submerged',
        nameKey: 'legend.hazards.rock_submerged',
        descriptionKey: 'legend.hazards.rock_submerged_desc',
        symbol: { type: 'text-badge', text: '+', bgColor: 'transparent', color: '#8b0000' },
        standard: 'IHO INT 1 — K10',
        searchTokens: ['roca sumergida', 'submerged rock', 'bajo'],
      },
      {
        id: 'rock_awash',
        nameKey: 'legend.hazards.rock_awash',
        descriptionKey: 'legend.hazards.rock_awash_desc',
        symbol: { type: 'text-badge', text: '*', bgColor: 'transparent', color: '#8b0000' },
        standard: 'IHO INT 1 — K11',
        searchTokens: ['roca a flor', 'rock awash', 'media marea'],
      },
      {
        id: 'wreck_dangerous',
        nameKey: 'legend.hazards.wreck_dangerous',
        descriptionKey: 'legend.hazards.wreck_dangerous_desc',
        symbol: { type: 'color-swatch', color: '#8b4500', border: '#8b4500' },
        standard: 'IHO INT 1 — K20-K30',
        searchTokens: ['pecio', 'wreck', 'barco hundido', 'obstáculo'],
      },
      {
        id: 'shoal',
        nameKey: 'legend.hazards.shoal',
        descriptionKey: 'legend.hazards.shoal_desc',
        symbol: { type: 'color-swatch', color: '#aee4f5', border: '#7ab3c8' },
        standard: 'IHO INT 1',
        searchTokens: ['bajo', 'shoal', 'poco fondo', 'arena'],
      },
      {
        id: 'obstruction',
        nameKey: 'legend.hazards.obstruction',
        descriptionKey: 'legend.hazards.obstruction_desc',
        symbol: { type: 'text-badge', text: '⊗', bgColor: 'transparent', color: '#8b6914' },
        standard: 'IHO INT 1 — L20',
        searchTokens: ['obstáculo', 'obstruction', 'cable submarino'],
      },
    ],
  },

  // ─── Las categorías 6-12 siguen el mismo patrón
  // (bathymetry, zones, lines, abbreviations, units, beaufort, ais-types)
  // Se implementan con la misma estructura de LegendEntry
];

// ─── Función de búsqueda ───────────────────────────────────────────────────────

/**
 * Busca entradas en todas las categorías por término.
 * Busca en nameKey, descriptionKey y searchTokens.
 * Retorna pares { category, entry } para mostrar el resultado en contexto.
 */
export function searchLegend(
  categories: LegendCategory[],
  term: string,
  translations: Record<string, string>
): Array<{ category: LegendCategory; entry: LegendEntry }> {
  if (!term || term.trim().length < 2) return [];

  const normalized = term.toLowerCase().trim();

  const results: Array<{ category: LegendCategory; entry: LegendEntry }> = [];

  for (const category of categories) {
    for (const entry of category.entries) {
      const name = (translations[entry.nameKey] ?? '').toLowerCase();
      const desc = (translations[entry.descriptionKey] ?? '').toLowerCase();
      const tokens = (entry.searchTokens ?? []).join(' ').toLowerCase();
      const std = (entry.standard ?? '').toLowerCase();

      if (
        name.includes(normalized) ||
        desc.includes(normalized) ||
        tokens.includes(normalized) ||
        std.includes(normalized)
      ) {
        results.push({ category, entry });
      }
    }
  }

  return results;
}
```

**Verificación Tarea 1:**
- [ ] `LEGEND_CATEGORIES` contiene las 12 categorías
- [ ] Cada categoría tiene al menos 5 entradas
- [ ] `searchLegend(categories, 'CPA', translations)` retorna al menos 2 resultados
- [ ] `searchLegend(categories, 'red', translations)` retorna entradas de balizas e IALA
- [ ] `tsc --noEmit` sin errores

---

### TAREA 2: Crear `LegendSymbolComponent`

**Archivo:** `src/app/features/chart-legend/components/legend-symbol/legend-symbol.component.ts`

Componente puro que renderiza cualquier tipo de `LegendSymbol` en un
contenedor SVG de 48×48px.

```typescript
@Component({
  selector: 'app-legend-symbol',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="symbol-container">
      <!-- Tipo: icon — usa app-icon existente -->
      <app-icon
        *ngIf="symbol.type === 'icon'"
        [name]="symbol.name"
        [size]="32"
        class="symbol-icon"
      ></app-icon>

      <!-- Tipo: color-swatch — rectángulo de color -->
      <div
        *ngIf="symbol.type === 'color-swatch'"
        class="color-swatch"
        [style.background-color]="symbol.color"
        [style.border-color]="symbol.border || symbol.color"
      ></div>

      <!-- Tipo: text-badge — texto estilizado -->
      <span
        *ngIf="symbol.type === 'text-badge'"
        class="text-badge"
        [style.color]="symbol.color || 'currentColor'"
        [style.background-color]="symbol.bgColor || 'transparent'"
      >{{ symbol.text }}</span>

      <!-- Tipo: line — línea SVG -->
      <svg
        *ngIf="symbol.type === 'line'"
        width="48" height="24" viewBox="0 0 48 24"
        class="symbol-svg"
      >
        <line
          x1="2" y1="12" x2="46" y2="12"
          [attr.stroke]="symbol.color"
          [attr.stroke-width]="symbol.width || 2"
          [attr.stroke-dasharray]="symbol.dashArray || 'none'"
          stroke-linecap="round"
        />
      </svg>

      <!-- Tipo: svg — path SVG personalizado -->
      <svg
        *ngIf="symbol.type === 'svg'"
        width="48" height="48" viewBox="0 0 24 24"
        class="symbol-svg"
      >
        <path
          [attr.d]="symbol.path"
          [attr.fill]="symbol.fillColor || 'none'"
          [attr.stroke]="symbol.color || 'currentColor'"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <!-- Tipo: composite — múltiples formas -->
      <svg
        *ngIf="symbol.type === 'composite'"
        width="48" height="48" viewBox="0 0 48 48"
        class="symbol-svg"
      >
        <!-- Círculos anidados para range rings -->
        <ng-container *ngIf="hasCircleParts()">
          <circle
            *ngFor="let part of symbol.parts; let i = index"
            cx="24" cy="24"
            [attr.r]="getCircleRadius(i)"
            [attr.stroke]="part.color"
            fill="none"
            stroke-width="1"
          />
        </ng-container>

        <!-- Rayas para marcas de balizamiento -->
        <ng-container *ngIf="hasStripeParts()">
          <rect
            *ngFor="let part of symbol.parts; let i = index"
            x="6" y="0" width="36"
            [attr.height]="48 / symbol.parts.length"
            [attr.y]="i * (48 / symbol.parts.length)"
            [attr.fill]="part.color"
          />
        </ng-container>
      </svg>
    </div>
  `,
  styles: [`
    .symbol-container {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 4px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .color-swatch {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      border: 2px solid;
    }

    .text-badge {
      font-family: var(--font-mono, monospace);
      font-size: 0.9rem;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 3px;
      letter-spacing: 0.05em;
    }

    .symbol-svg {
      display: block;
    }

    .symbol-icon {
      opacity: 0.9;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegendSymbolComponent {
  @Input({ required: true }) symbol!: LegendSymbol;

  hasCircleParts(): boolean {
    return this.symbol.type === 'composite' &&
      this.symbol.parts.some(p => p.shape === 'circle');
  }

  hasStripeParts(): boolean {
    return this.symbol.type === 'composite' &&
      this.symbol.parts.some(p => ['stripe', 'band', 'top-half', 'bottom-half'].includes(p.shape));
  }

  getCircleRadius(index: number): number {
    const radii = [20, 14, 8];
    return radii[index] ?? 8;
  }
}
```

---

### TAREA 3: Crear `ChartLegendComponent` — componente principal

**Archivos:**
- `src/app/features/chart-legend/chart-legend.component.ts`
- `src/app/features/chart-legend/chart-legend.component.html`
- `src/app/features/chart-legend/chart-legend.component.scss`

```typescript
// chart-legend.component.ts

@Component({
  selector: 'app-chart-legend',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppIconComponent,
    AppModalComponent,
    LegendSymbolComponent,
    TranslatePipe,           // pipe i18n existente
  ],
  templateUrl: './chart-legend.component.html',
  styleUrls: ['./chart-legend.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartLegendComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  readonly categories = LEGEND_CATEGORIES;

  // Estado del componente
  selectedCategoryId = signal<LegendCategoryId>('omi-symbols');
  searchTerm = signal<string>('');

  // Categoría seleccionada
  readonly selectedCategory = computed(() =>
    this.categories.find(c => c.id === this.selectedCategoryId())
  );

  // Resultados de búsqueda
  readonly searchResults = computed(() => {
    const term = this.searchTerm();
    if (!term || term.length < 2) return null;
    // Búsqueda simple sin translations (usar tokens directamente)
    return this.categories.flatMap(cat =>
      cat.entries
        .filter(entry => {
          const tokens = [
            ...(entry.searchTokens ?? []),
            entry.id,
            entry.standard ?? '',
          ].join(' ').toLowerCase();
          return tokens.includes(term.toLowerCase());
        })
        .map(entry => ({ category: cat, entry }))
    );
  });

  readonly isSearching = computed(() => (this.searchTerm()?.length ?? 0) >= 2);

  selectCategory(id: LegendCategoryId): void {
    this.selectedCategoryId.set(id);
    this.searchTerm.set('');
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByCatId(_: number, cat: LegendCategory): string {
    return cat.id;
  }
}
```

```html
<!-- chart-legend.component.html -->
<app-modal
  [isOpen]="isOpen"
  [title]="'legend.title' | translate"
  size="fullscreen"
  [showFooter]="false"
  (close)="close.emit()"
>
  <div class="legend-layout">

    <!-- ── Sidebar de categorías ─────────────────────────────────────── -->
    <aside class="legend-sidebar">
      <!-- Buscador -->
      <div class="legend-search">
        <app-icon name="search" [size]="16" class="search-icon"></app-icon>
        <input
          type="search"
          class="search-input"
          [placeholder]="'legend.search_placeholder' | translate"
          [value]="searchTerm()"
          (input)="onSearchChange($any($event.target).value)"
          autocomplete="off"
        />
        <button
          *ngIf="searchTerm().length > 0"
          class="search-clear"
          (click)="clearSearch()"
          aria-label="Clear search"
        >
          <app-icon name="x" [size]="14"></app-icon>
        </button>
      </div>

      <!-- Lista de categorías -->
      <nav class="category-nav" *ngIf="!isSearching()">
        <button
          *ngFor="let cat of categories; trackBy: trackByCatId"
          class="category-btn"
          [class.active]="selectedCategoryId() === cat.id"
          (click)="selectCategory(cat.id)"
        >
          <app-icon [name]="$any(cat.icon)" [size]="18"></app-icon>
          <span>{{ cat.nameKey | translate }}</span>
          <span class="entry-count">{{ cat.entries.length }}</span>
        </button>
      </nav>

      <!-- En búsqueda: mostrar conteo de resultados -->
      <div class="search-info" *ngIf="isSearching()">
        <span class="result-count">
          {{ (searchResults()?.length ?? 0) }} {{ 'legend.results' | translate }}
          "{{ searchTerm() }}"
        </span>
      </div>
    </aside>

    <!-- ── Área de contenido ──────────────────────────────────────────── -->
    <main class="legend-content">

      <!-- Vista normal: categoría seleccionada -->
      <ng-container *ngIf="!isSearching()">
        <div class="content-header" *ngIf="selectedCategory() as cat">
          <h2>{{ cat.nameKey | translate }}</h2>
          <p class="content-description">{{ cat.descriptionKey | translate }}</p>
        </div>

        <div class="entries-grid" *ngIf="selectedCategory() as cat">
          <div
            *ngFor="let entry of cat.entries; trackBy: trackById"
            class="entry-card"
          >
            <app-legend-symbol [symbol]="entry.symbol" class="entry-symbol"></app-legend-symbol>

            <div class="entry-info">
              <div class="entry-name">{{ entry.nameKey | translate }}</div>
              <div class="entry-description">{{ entry.descriptionKey | translate }}</div>
              <div class="entry-standard" *ngIf="entry.standard">
                <app-icon name="info" [size]="12"></app-icon>
                {{ entry.standard }}
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Vista de búsqueda: resultados multi-categoría -->
      <ng-container *ngIf="isSearching()">
        <div class="search-results" *ngIf="searchResults() as results">

          <!-- Sin resultados -->
          <div class="no-results" *ngIf="results.length === 0">
            <app-icon name="search" [size]="48" class="no-results-icon"></app-icon>
            <p>{{ 'legend.no_results' | translate }} "{{ searchTerm() }}"</p>
          </div>

          <!-- Con resultados: agrupados por categoría -->
          <ng-container *ngIf="results.length > 0">
            <div
              *ngFor="let result of results"
              class="entry-card entry-card--search"
            >
              <app-legend-symbol [symbol]="result.entry.symbol" class="entry-symbol"></app-legend-symbol>

              <div class="entry-info">
                <div class="entry-category-label">
                  {{ result.category.nameKey | translate }}
                </div>
                <div class="entry-name">{{ result.entry.nameKey | translate }}</div>
                <div class="entry-description">{{ result.entry.descriptionKey | translate }}</div>
              </div>
            </div>
          </ng-container>
        </div>
      </ng-container>

    </main>
  </div>
</app-modal>
```

**SCSS clave (chart-legend.component.scss):**
```scss
.legend-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  min-height: 0;
  gap: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}

.legend-sidebar {
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface-secondary);
}

.legend-search {
  position: relative;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);

  .search-icon {
    position: absolute;
    left: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 2.25rem;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }

  .search-clear {
    position: absolute;
    right: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;

    &:hover { color: var(--text-primary); }
  }
}

.category-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  &.active {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    color: var(--primary);
  }

  span { flex: 1; }

  .entry-count {
    flex: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    background: var(--bg-surface);
    padding: 1px 6px;
    border-radius: 10px;
    font-variant-numeric: tabular-nums;
  }
}

.legend-content {
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.content-header {
  h2 {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .content-description {
    color: var(--text-secondary);
    margin: 0;
    font-size: 0.875rem;
  }
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.entry-card {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.875rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  transition: border-color 0.15s;

  &:hover { border-color: var(--border-default); }

  &--search {
    // En búsqueda, ancho completo
    grid-column: 1 / -1;
  }
}

.entry-symbol { flex-shrink: 0; }

.entry-info {
  flex: 1;
  min-width: 0;
}

.entry-category-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  margin-bottom: 0.2rem;
}

.entry-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.entry-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.entry-standard {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.375rem;
  font-size: 0.7rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: var(--text-tertiary);
  text-align: center;

  .no-results-icon { opacity: 0.3; }
}

.search-info {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);

  .result-count {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
}
```

---

### TAREA 4: Integrar en `chart.page`

**Archivos:**
- `src/app/features/chart/chart.page.ts` — añadir signal `showLegend`
- `src/app/features/chart/chart.page.html` — añadir botón y componente
- `src/app/features/chart/chart.page.css` — posición del botón

```typescript
// chart.page.ts — AÑADIR:
import { ChartLegendComponent } from '../chart-legend/chart-legend.component';

// En la clase:
readonly showLegend = signal(false);

handleToggleLegend(): void {
  this.showLegend.set(!this.showLegend());
}
```

```html
<!-- chart.page.html — AÑADIR antes del cierre del </div> final: -->

<!-- Botón de leyenda — bottom left, sobre el HUD -->
<button
  class="legend-btn"
  (click)="handleToggleLegend()"
  [attr.aria-label]="'legend.open_button' | translate"
  [attr.aria-expanded]="showLegend()"
  title="Chart Legend"
>
  <span class="legend-btn-icon">?</span>
</button>

<!-- Modal de leyenda -->
<app-chart-legend
  [isOpen]="showLegend()"
  (close)="showLegend.set(false)"
></app-chart-legend>
```

```css
/* chart.page.css — AÑADIR: */
.legend-btn {
  position: absolute;
  /* Encima del HUD (bottom: 1.5rem + 44px HUD + 0.5rem gap ≈ 6rem) */
  bottom: 6rem;
  left: 1.5rem;
  z-index: 2;

  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-color, #4c566a);
  background: var(--panel-bg, #2e3440);
  color: var(--text-primary, #eceff4);
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transition: all 0.2s ease;
}

.legend-btn:hover {
  background: var(--panel-bg-hover, #3b4252);
  transform: scale(1.05);
}

.legend-btn-icon {
  font-family: 'Georgia', serif;
  font-style: italic;
  line-height: 1;
}

@media (max-width: 720px) {
  .legend-btn {
    bottom: 5rem;
    left: 0.5rem;
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }
}
```

---

### TAREA 5: Añadir ruta global `/legend`

```typescript
// app.routes.ts — AÑADIR para acceso desde menú principal:
{
  path: 'legend',
  loadComponent: () =>
    import('./features/chart-legend/chart-legend-standalone.page').then(
      m => m.ChartLegendStandalonePage
    ),
  title: 'Chart Legend | OMI',
},
```

**Crear página standalone `chart-legend-standalone.page.ts`:**
```typescript
// Wrapper que abre el modal directamente como página completa
// Para acceso desde la barra de navegación lateral
@Component({
  selector: 'app-chart-legend-standalone',
  standalone: true,
  imports: [ChartLegendComponent],
  template: `
    <app-chart-legend
      [isOpen]="true"
      (close)="goBack()"
    ></app-chart-legend>
  `,
})
export class ChartLegendStandalonePage {
  private location = inject(Location);
  goBack(): void { this.location.back(); }
}
```

**Añadir enlace en la barra lateral:**
```html
<!-- app-shell.component.html — AÑADIR enlace de leyenda: -->
<a routerLink="/legend" routerLinkActive="active" class="nav-link" title="Chart Legend">
  <svg ...><!-- Icono de libro/pregunta --></svg>
  <span class="nav-text" *ngIf="!navCollapsed">Legend</span>
</a>
```

---

### TAREA 6: i18n completo

```typescript
// en.ts — AÑADIR (extracto representativo, completar todas las claves):
legend: {
  title: 'Nautical Chart Legend',
  open_button: 'Open chart legend',
  search_placeholder: 'Search symbols, abbreviations...',
  results: 'results for',
  no_results: 'No results for',
  categories: {
    omi_symbols: 'OMI Symbols',
    omi_symbols_desc: 'Symbols and indicators used by this application',
    ais_targets: 'AIS Targets',
    ais_targets_desc: 'AIS vessel icons and their meaning',
    iala_a: 'IALA-A Buoyage',
    iala_a_desc: 'Lateral, cardinal and special marks — Europe, Africa, Asia, Oceania',
    lights: 'Light Characteristics',
    lights_desc: 'Lighthouse and buoy light abbreviations',
    hazards: 'Hazards & Seabed',
    hazards_desc: 'Underwater dangers and seabed types',
    bathymetry: 'Bathymetry',
    bathymetry_desc: 'Depth contours and soundings interpretation',
    zones: 'Zones & Areas',
    zones_desc: 'Traffic separation, restricted and special areas',
    lines: 'Lines & Limits',
    lines_desc: 'Maritime boundaries and reference lines',
    abbreviations: 'Abbreviations',
    abbreviations_desc: 'Nautical abbreviations used in navigation',
    units: 'Units & Conversions',
    units_desc: 'Nautical measurement units and conversions',
    beaufort: 'Beaufort & Douglas',
    beaufort_desc: 'Wind and sea state scales',
    ais_types: 'AIS Ship Types',
    ais_types_desc: 'ITU-R M.1371-5 vessel type classification',
  },
  omi: {
    own_vessel_good: 'Own Vessel (GPS Good)',
    own_vessel_good_desc: 'Your vessel with valid GPS fix less than 2 seconds old',
    own_vessel_stale: 'Own Vessel (GPS Stale)',
    own_vessel_stale_desc: 'GPS fix 2-10 seconds old — position may be slightly inaccurate',
    own_vessel_no_fix: 'Own Vessel (No Fix)',
    own_vessel_no_fix_desc: 'No valid GPS fix — last known position shown',
    cog_vector: 'COG Vector',
    cog_vector_desc: 'Projected path based on course and speed over ground (6 min horizon)',
    heading_vector: 'Heading Vector',
    heading_vector_desc: 'True heading of the vessel keel according to compass/gyro',
    track_line: 'Own Track',
    track_line_desc: 'Breadcrumb trail of your vessel positions (last 30 min)',
    waypoint: 'Waypoint',
    waypoint_desc: 'User-created navigation mark — click to activate as destination',
    range_rings: 'Range Rings',
    range_rings_desc: 'Distance rings centered on own vessel (configurable intervals)',
    bearing_line: 'Bearing Line',
    bearing_line_desc: 'Line from own vessel to active destination waypoint',
    true_wind: 'True Wind Indicator',
    true_wind_desc: 'Direction and speed of true wind relative to water surface',
  },
  ais: {
    class_a_moving: 'AIS Class A — Underway',
    class_a_moving_desc: 'SOLAS vessel (cargo, tanker, passenger) with full AIS transponder',
    class_b_moving: 'AIS Class B — Underway',
    class_b_moving_desc: 'Smaller vessel (sailing, recreational) with Class B transponder',
    dangerous: 'Dangerous Target',
    dangerous_desc: 'CPA below threshold — collision risk — immediate attention required',
    anchored: 'Anchored / Moored',
    anchored_desc: 'Vessel with SOG less than 0.3 knots',
    track: 'AIS Historical Track',
    track_desc: 'Trail of AIS position reports for this vessel (last 30 min)',
    prediction: 'AIS Predicted Track',
    prediction_desc: 'Linear 6-minute trajectory based on current speed and heading',
    cpa_line: 'CPA Indicator Line',
    cpa_line_desc: 'Closest Point of Approach line between own vessel and target',
  },
  iala: {
    port_mark: 'Port Lateral Mark',
    port_mark_desc: 'Leave to PORT (left) when approaching harbour — Red, any rhythm',
    starboard_mark: 'Starboard Lateral Mark',
    starboard_mark_desc: 'Leave to STARBOARD (right) when approaching harbour — Green, any rhythm',
    cardinal_north: 'North Cardinal Mark',
    cardinal_north_desc: 'Pass to the NORTH — Black over Yellow — VQ or Q light',
    cardinal_south: 'South Cardinal Mark',
    cardinal_south_desc: 'Pass to the SOUTH — Yellow over Black — VQ(6)+LFl or Q(6)+LFl',
    cardinal_east: 'East Cardinal Mark',
    cardinal_east_desc: 'Pass to the EAST — Black/Yellow/Black — VQ(3) or Q(3)',
    cardinal_west: 'West Cardinal Mark',
    cardinal_west_desc: 'Pass to the WEST — Yellow/Black/Yellow — VQ(9) or Q(9)',
    safe_water: 'Safe Water Mark',
    safe_water_desc: 'All-round safe water — mid-channel or fairway — Isophase, Occulting or LFl',
    isolated_danger: 'Isolated Danger Mark',
    isolated_danger_desc: 'Small hazard with navigable water all around — Fl(2)',
    special_mark: 'Special Mark',
    special_mark_desc: 'Marks a special area or feature — yellow, any rhythm',
  },
  lights: {
    fixed: 'Fixed (F)',
    fixed_desc: 'Continuous steady light',
    fl: 'Flashing (Fl)',
    fl_desc: 'Single flash, darkness longer than light',
    lfl: 'Long Flashing (LFl)',
    lfl_desc: 'Single long flash (≥2 seconds)',
    q: 'Quick (Q)',
    q_desc: '50–79 flashes per minute',
    vq: 'Very Quick (VQ)',
    vq_desc: '80–159 flashes per minute',
    iso: 'Isophase (Iso)',
    iso_desc: 'Equal periods of light and darkness',
    oc: 'Occulting (Oc)',
    oc_desc: 'Light longer than darkness',
    mo: 'Morse (Mo)',
    mo_desc: 'Morse code light pattern, e.g. Mo(A)',
    red_sector: 'Red Sector',
    red_sector_desc: 'Light sector indicating danger or prohibited zone',
    green_sector: 'Green Sector',
    green_sector_desc: 'Light sector indicating safe water or channel',
  },
  hazards: {
    rock_submerged: 'Submerged Rock',
    rock_submerged_desc: 'Rock always below water — depth shown if known',
    rock_awash: 'Rock Awash',
    rock_awash_desc: 'Rock at chart datum level — covers and uncovers with tide',
    wreck_dangerous: 'Dangerous Wreck',
    wreck_dangerous_desc: 'Sunken vessel or obstacle — depth unknown or less than safety',
    shoal: 'Shoal / Shallow Area',
    shoal_desc: 'Shallow water area — colored lighter than surrounding depth zones',
    obstruction: 'Obstruction',
    obstruction_desc: 'Submerged object, cable or pipe — obstruct navigation',
  },
}

// es.ts — AÑADIR (equivalentes en español):
legend: {
  title: 'Leyenda de Carta Náutica',
  open_button: 'Abrir leyenda de carta',
  search_placeholder: 'Buscar símbolos, abreviaturas...',
  results: 'resultados para',
  no_results: 'Sin resultados para',
  // ... continúa para todas las claves ...
}
```

---

## 🧪 PLAN DE VERIFICACIÓN

### Test 1: Acceso y apertura
```
1. Abrir http://localhost:4200/chart
2. ESPERADO: Botón "?" visible bottom-left, encima del HUD
3. Click en "?" → ESPERADO: Modal fullscreen se abre con animación
4. ESPERADO: Sidebar con 12 categorías, primera seleccionada "OMI Symbols"
5. ESPERADO: Grid de entries con símbolos visuales renderizados
6. Escape o X → ESPERADO: Modal se cierra
```

### Test 2: Navegación por categorías
```
1. Abrir leyenda
2. Click en "IALA-A Buoyage"
3. ESPERADO: Grid actualiza con todas las boyas y marcas IALA
4. Cada boya muestra: símbolo de color correcto, nombre, descripción, norma "IALA-A"
5. Click en "Abbreviations"
6. ESPERADO: Tabla-grid de abreviaturas con EN/ES
7. Todas las 12 categorías son accesibles sin scroll horizontal
```

### Test 3: Búsqueda
```
1. Abrir leyenda
2. Escribir "CPA" en el buscador
3. ESPERADO: Resultados inmediatos (sin delay perceptible)
4. ESPERADO: Aparecen al menos 3 entradas con etiqueta de categoría
5. Borrar y escribir "cardinal"
6. ESPERADO: Las 4 boyas cardinales (N/S/E/W) aparecen en resultados
7. Escribir "xyz" (sin resultados)
8. ESPERADO: Mensaje "No results for 'xyz'" con icono
9. Borrar → ESPERADO: Vuelve la vista de categoría seleccionada
```

### Test 4: Acceso desde nav lateral
```
1. Hacer click en "Legend" en la barra de navegación lateral
2. ESPERADO: Navega a /legend
3. ESPERADO: La misma UI de leyenda en página completa
4. Click en X o botón Back
5. ESPERADO: Regresa a la página anterior
```

### Test 5: Responsividad (móvil)
```
1. DevTools → modo móvil 375px
2. Abrir leyenda desde chart
3. ESPERADO: Sidebar colapsa arriba (grid-template-rows: auto 1fr)
4. Las categorías se muestran como scroll horizontal o acordeón
5. Las entries ocupan el ancho completo (1 columna)
6. El símbolo visual sigue siendo visible (48x48)
7. Texto legible sin zoom
```

### Test 6: Idioma
```
1. Ir a Settings → cambiar idioma a Español
2. Abrir leyenda
3. ESPERADO: Título "Leyenda de Carta Náutica"
4. ESPERADO: Categorías en español
5. ESPERADO: Descripción de cada entry en español
6. Buscador: escribir "estribor"
7. ESPERADO: Aparece la entrada de Estribor / Starboard Mark
```

### Test 7: Compatibilidad con P0-P3
```
1. Con leyenda CERRADA: toggle de capas OSM→ENC funciona (P0/P2)
2. Con leyenda ABIERTA: el mapa sigue actualizando (AIS, posición — P1)
3. Con leyenda ABIERTA: click fuera del modal → modal cierra, mapa responde
4. Abrir leyenda en modo ENC: la leyenda muestra los símbolos del ENC en categorías
5. Abrir leyenda mientras hay AIS panel abierto (P3): ambos coexisten
   (modal de leyenda cubre el panel AIS — z-index 5000 del modal)
```

---

## ⚠️ POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: SVG paths de los símbolos no se renderizan

**Síntoma:** `LegendSymbolComponent` muestra contenedores vacíos  
**Causa:** El path SVG del `type: 'svg'` no es un path válido  
**Solución:** Verificar los paths en `chart-legend-data.ts`. Si fallan, usar `type: 'color-swatch'`
como fallback. No es un error crítico — los datos de texto siguen siendo útiles.

### Problema 2: `TranslatePipe` no encuentra las claves de leyenda

**Síntoma:** Las claves aparecen crudas: `legend.omi.own_vessel_good`  
**Causa:** Las claves no están en `en.ts` / `es.ts`  
**Solución:** Verificar que el objeto `legend:` está correctamente anidado y sin
comas faltantes. El pipe de traducción existente ya maneja rutas con puntos.

### Problema 3: Modal cubre elementos de navegación (z-index)

**Síntoma:** El modal aparece detrás de elementos del chart  
**Causa:** El modal usa `z-index: 5000` del CSS de `app-modal`, pero algún
overlay del chart tiene `z-index` mayor  
**Verificación:** Los elementos del chart tienen `z-index: 2` y `z-index: 3`.
El modal a `5000` debe cubrir todo. No debería ser problema.

### Problema 4: Performance lenta con 12 categorías × muchas entries

**Síntoma:** Scroll lento en el grid de entries  
**Causa:** Muchos componentes `LegendSymbolComponent` renderizados simultáneamente  
**Solución:** `ChangeDetectionStrategy.OnPush` ya ayuda. Si sigue lento:
```typescript
// Añadir virtual scrolling con @angular/cdk:
import { ScrollingModule } from '@angular/cdk/scrolling';
// Usar <cdk-virtual-scroll-viewport itemSize="80"> alrededor del entries-grid
```

### Problema 5: Botón "?" colisiona con el HUD en algunos idiomas

**Síntoma:** El botón de leyenda se solapa con el HUD cuando el HUD es más alto  
**Causa:** El HUD crece con más instrumentos activos  
**Solución:**
```css
/* Usar bottom dinámico con fallback: */
.legend-btn {
  bottom: 1.5rem;
  /* Si el HUD está activo (tiene clase .chart-hud-expanded), ajustar: */
  left: calc(1.5rem + var(--hud-width, 0px) + 1rem);
}
/* O simplemente colocar el botón en top-left bajo los map-controls: */
.legend-btn {
  top: calc(1.5rem + (48px * 4) + (12px * 3) + 1rem); /* bajo los 4 controles */
  left: 1.5rem;
  bottom: auto;
}
```

---

## ✅ DEFINITION OF DONE

- [ ] **T1:** `chart-legend-data.ts` con 12 categorías completas y al menos 80 entries totales
- [ ] **T1:** `searchLegend()` funciona con términos en EN y ES
- [ ] **T2:** `LegendSymbolComponent` renderiza los 5 tipos de símbolo sin errores
- [ ] **T3:** `ChartLegendComponent` muestra modal con sidebar + grid responsivo
- [ ] **T3:** Búsqueda reactiva con debounce (si el usuario escribe rápido, no hay lag)
- [ ] **T3:** Estado de búsqueda y sin-resultados implementados
- [ ] **T4:** Botón "?" visible en chart.page en posición correcta (bottom-left)
- [ ] **T4:** `showLegend` signal implementado, modal abre/cierra correctamente
- [ ] **T5:** Ruta `/legend` funciona como página standalone
- [ ] **T5:** Enlace en barra de navegación lateral
- [ ] **T6:** i18n EN y ES con todas las claves (mínimo 80 claves nuevas)
- [ ] **Visual:** Símbolos visuales renderizados (colores correctos por categoría)
- [ ] **Visual:** Diseño consistente con el Glass Bridge del resto de la app
- [ ] **Responsive:** Funciona en pantallas de 375px de ancho
- [ ] **Accesibilidad:** Modal tiene `role="dialog"`, `aria-modal`, focus trap, cierre con Escape
- [ ] **Búsqueda:** Encuentra "COG" → COG Vector; "estribor" → Starboard Mark; "Fl" → múltiples luces
- [ ] **Build:** `ng build --configuration=production` sin errores

**Commit message sugerido:**
```
feat(legend): add comprehensive nautical chart legend with search and 12 categories

- Create ChartLegendComponent: fullscreen modal with sidebar + grid layout
- Create LegendSymbolComponent: renders svg/color-swatch/text-badge/line/icon/composite
- Create chart-legend-data.ts: 12 categories, 80+ entries, fully typed
  - OMI Symbols (own vessel states, track, vectors, waypoints, range rings)
  - AIS Targets (Class A/B, dangerous, anchored, track, prediction, CPA line)
  - IALA-A Buoyage (lateral port/starboard, all 4 cardinals, safe water, isolated danger)
  - Light Characteristics (F, Fl, LFl, Q, VQ, Iso, Oc, Mo, color sectors)
  - Hazards (submerged rocks, wrecks, obstructions, shoals)
  - Bathymetry (depth zones, contour lines, datum reference)
  - Zones & Areas (TSS, restricted, anchorage, special)
  - Lines & Limits (shoreline, territorial, ZEE, port limits)
  - Abbreviations (SOG/COG/HDG/TWD/CPA/TCPA/etc. EN+ES)
  - Units & Conversions (NM, knots, fathoms, beaufort, pressure)
  - Beaufort & Douglas scales (complete 0-12 / 0-9)
  - AIS Ship Types (ITU-R M.1371-5 full classification)
- Real-time search across all categories (name, description, tokens, standard)
- searchLegend() function supporting EN and ES search terms
- '?' button positioned bottom-left in chart.page above HUD
- Standalone /legend route accessible from main nav sidebar
- i18n: ~100 new keys in EN and ES
- ChangeDetectionStrategy.OnPush throughout
- ARIA: role="dialog", aria-modal, Escape to close (via AppModalComponent)
```

---

## 🚀 EXTENSIONES FUTURAS

- **Filtrado por modo de mapa:** "Solo mostrar símbolos del modo ENC actual" para
  reducir la leyenda a lo que es visible en pantalla en ese momento.
  
- **Highlight en mapa:** Al hacer click en una entrada de la leyenda, resaltar
  el símbolo correspondiente en el mapa si está visible (ej. click en "Cardinal Norte"
  → resaltar todas las boyas cardinales norte visibles).

- **Tooltips contextuales:** Al hacer hover sobre cualquier símbolo del mapa
  (AIS, boya ENC), mostrar un tooltip pequeño con el nombre de la leyenda.
  Requiere integración con MapLibre popup.

- **Exportar leyenda como PDF:** Generar un PDF de la leyenda completa para
  referencia offline, usando el mismo sistema de datos de `chart-legend-data.ts`.

- **Leyenda personalizada:** Permitir al usuario marcar entradas como favoritas
  para tener una categoría "Mis referencias" con los símbolos que más usa.
