/**
 * Autopilot technical manual — long-form, bilingual product documentation.
 *
 * This content is deliberately kept OUT of the typed `Translations` dictionary
 * (`core/i18n/*`): the manual is prose/reference, not UI chrome, so a dedicated
 * per-language content model is far more maintainable than hundreds of flat
 * typed keys. The manual component selects `en`/`es` from `LanguageService`.
 *
 * Everything here mirrors the real `marine-autopilot-engine` behaviour (modes,
 * safety rules, sensor staleness budgets, control law, calibration). Keep it in
 * sync with the engine when that behaviour changes.
 */

export type ManualBlock =
  | { k: 'p'; text: string }
  | { k: 'ul'; items: string[] }
  | { k: 'steps'; items: string[] }
  | { k: 'note'; text: string }
  | { k: 'warn'; text: string }
  | { k: 'spec'; rows: { label: string; value: string }[] };

export interface ManualSection {
  id: string;
  icon: string;
  title: string;
  blocks: ManualBlock[];
}

export interface ManualDoc {
  title: string;
  subtitle: string;
  ui: { open: string; close: string; search: string; contents: string; empty: string };
  sections: ManualSection[];
}

const EN: ManualDoc = {
  title: 'Autopilot — Technical Manual',
  subtitle: 'How the pilot senses, decides and steers · full product reference',
  ui: {
    open: 'MANUAL',
    close: 'Close',
    search: 'Search the manual…',
    contents: 'Contents',
    empty: 'No sections match your search.',
  },
  sections: [
    {
      id: 'overview',
      icon: '🛈',
      title: 'Overview',
      blocks: [
        {
          k: 'p',
          text: 'The autopilot is a closed-loop steering system. A fixed-rate control loop reads a consistent snapshot of the boat sensors, applies the mandatory safety rules, runs the controller for the active mode, and commands the drive — then publishes its full state so this panel always reflects what the pilot is doing.',
        },
        {
          k: 'p',
          text: 'Responsibility is split for safety: the engine performs the navigation and control maths, while a separate microcontroller is the real-time failsafe layer that actually moves the motor and cuts power if the engine stops talking to it (heartbeat).',
        },
        {
          k: 'warn',
          text: 'The pilot always boots in STANDBY with the motor disabled. It never engages the drive on its own — engaging is always an explicit operator action.',
        },
      ],
    },
    {
      id: 'modes',
      icon: '🕹',
      title: 'Operating Modes',
      blocks: [
        {
          k: 'p',
          text: 'The pilot is always in exactly one state. The active mode decides which controller runs and what setpoint is held.',
        },
        {
          k: 'ul',
          items: [
            'STANDBY — Idle. The drive is disarmed and no steering commands are sent. Required to open calibration, run drive-tests or change tuning. Manual helm is in control.',
            'AUTO (compass) — Holds a fixed heading setpoint. The current heading is captured on engage; use dodge to nudge it.',
            'WIND (vane) — Holds a fixed apparent-wind angle (AWA). The setpoint tracks the bow, so the pilot steers to keep the same angle to the wind.',
            'TRACK (GPS/route) — Follows the active waypoint leg, steering to minimise cross-track error (XTE) toward the destination bearing.',
            'FAULT — A latched safety cut. The motor is off and the reason is shown until the operator clears it.',
          ],
        },
        {
          k: 'note',
          text: 'The engine names heading→AUTO and track→ROUTE when it publishes state, matching Signal K conventions; the panel labels TRACK for the route-following mode.',
        },
      ],
    },
    {
      id: 'engage',
      icon: '🔘',
      title: 'Engaging & Disengaging',
      blocks: [
        {
          k: 'steps',
          items: [
            'Select the mode tab (Auto / Wind / Route) in the helm console.',
            'Press ENGAGE. The engine validates pre-flight checks, arms the drive and begins closed-loop steering.',
            'To stop, press DISENGAGE — the pilot returns to STANDBY immediately, disarms the drive and restores manual helm.',
          ],
        },
        {
          k: 'p',
          text: 'Engagement captures the live setpoint from the current sensors: AUTO/TRACK capture the current true heading, WIND captures the current apparent-wind angle. If a required input is invalid the command is refused with a reason (shown as “COMMAND REJECTED” and logged in the Event Log):',
        },
        {
          k: 'ul',
          items: [
            '“no valid heading” — AUTO or TRACK requested without a fresh compass heading.',
            '“no valid apparent wind” — WIND requested without a fresh masthead wind reading.',
            '“fault must be cleared first” — a latched FAULT is active; clear it before engaging.',
            '“no sensor data yet” — the engine has not received a first sensor snapshot.',
          ],
        },
        {
          k: 'warn',
          text: 'TRACK only requires a valid heading to engage — not an active destination. If you engage TRACK with no course flowing, the pilot holds heading instead of steering to a waypoint. The panel makes this explicit (see Event Log “TRACK engaged but no active destination/course”).',
        },
      ],
    },
    {
      id: 'follow',
      icon: '📍',
      title: 'Following a Waypoint / Route',
      blocks: [
        {
          k: 'steps',
          items: [
            'On the chart or Resources page, set a waypoint/route as the destination (this sets the Signal K Course).',
            'If the pilot is already engaged, it switches to TRACK automatically and follows the destination.',
            'If the pilot is in STANDBY, the panel shows a “FOLLOW IN TRACK” banner. Press it to engage TRACK toward the destination — an explicit, safety-compliant confirmation (the pilot never auto-engages from STANDBY).',
          ],
        },
        {
          k: 'p',
          text: 'Once following, the pilot reads the leg bearing and XTE from the Signal K Course API and steers to close the track. On arrival at a waypoint it advances to the next leg; on the final waypoint it signals ROUTE COMPLETE.',
        },
      ],
    },
    {
      id: 'dodge',
      icon: '🎯',
      title: 'Course Adjustment (Dodge)',
      blocks: [
        {
          k: 'p',
          text: 'Available in AUTO and WIND. The dodge buttons add or subtract degrees from the active setpoint so you can steer around an obstacle or trim the course. The pilot applies a smooth heading change at the configured turn rate.',
        },
        {
          k: 'spec',
          rows: [
            { label: '◀◀ 10°', value: 'Turn 10° to port' },
            { label: '◀ 1°', value: 'Turn 1° to port' },
            { label: '1° ▶', value: 'Turn 1° to starboard' },
            { label: '10° ▶▶', value: 'Turn 10° to starboard' },
          ],
        },
        {
          k: 'note',
          text: 'Dodge changes are not persistent: a new engage or mode switch re-captures the setpoint from the current heading / wind angle.',
        },
      ],
    },
    {
      id: 'control',
      icon: '⚙',
      title: 'Steering & Control Law',
      blocks: [
        {
          k: 'p',
          text: 'Each mode drives a PID controller that turns the heading (or AWA, or track) error into a rudder demand. A deadband suppresses tiny corrections; the demand is then clamped to the rudder limit and converted to a normalised drive command in [-1, 1].',
        },
        {
          k: 'ul',
          items: [
            'Kp / Ki / Kd — proportional, integral and derivative gains of the steering PID.',
            'Deadband — heading-error tolerance below which no correction is applied (reduces hunting).',
            'Rudder limit — maximum commanded rudder angle; the demand is clamped to ±limit.',
            'PWM min / max — the drive floor and cap applied to the normalised motor demand (for backends without a rudder-position sensor).',
          ],
        },
        {
          k: 'p',
          text: 'The engine never drives the motor directly: it outputs a desired rudder angle plus a normalised drive, and the selected backend maps that to PWM / direction / enable on its transport.',
        },
      ],
    },
    {
      id: 'wind',
      icon: '🌬',
      title: 'Wind Mode & Hazards',
      blocks: [
        {
          k: 'p',
          text: 'In WIND the pilot steers to keep a fixed apparent-wind angle. Because the setpoint tracks the bow, an accidental tack or gybe is opposed automatically — the control law counter-steers back to the set angle. The pilot also detects and surfaces three hazards:',
        },
        {
          k: 'ul',
          items: [
            'Gust — apparent wind speed spikes above its running average.',
            'Accidental tack — apparent wind crosses the bow (AWA sign flip with both sides near head-to-wind).',
            'Accidental gybe — apparent wind crosses the stern beyond the gybe-guard angle (risk of an uncontrolled boom swing).',
          ],
        },
        {
          k: 'p',
          text: 'A detected hazard is held for a few seconds so the helmsman sees it, raises the matching alarm, and is shown in the ALERTS band (gybe is treated as critical). The pilot counter-steers to the set wind angle; it does not auto-disengage.',
        },
      ],
    },
    {
      id: 'track',
      icon: '🧭',
      title: 'Track Mode & Route Following',
      blocks: [
        {
          k: 'p',
          text: 'In TRACK the pilot reads the active leg from the Signal K Course API: the bearing to the next waypoint and the cross-track error (XTE). The demanded heading is the leg bearing plus a clamped XTE correction, so the boat converges onto the track and then holds it.',
        },
        {
          k: 'ul',
          items: [
            'XTE — perpendicular distance off the track line. Positive = starboard of track (steer to port); shown with a P/S prefix.',
            'Sailing-limit (no-go) guard — the pilot never steers a demanded heading inside the no-go zone. If the leg points too close to the wind it clamps to the closest sailable heading (the no-go edge, default tack angle 40°) and raises a NO-GO alert.',
            'Route auto-advance — on arrival within the arrival radius (default 30 m) the pilot requests the next route point; it re-arms after leaving 1.5× that radius so a single pass advances exactly one leg.',
            'ROUTE COMPLETE — signalled when the final waypoint is reached.',
          ],
        },
        {
          k: 'note',
          text: 'Signal K does not auto-advance a route; a course/route must be active in Signal K first. The pilot requests the next point on arrival.',
        },
      ],
    },
    {
      id: 'safety',
      icon: '🛡',
      title: 'Safety Systems',
      blocks: [
        {
          k: 'p',
          text: 'Safety rules run every tick, before control. They can raise a latched FAULT (motor off) or softly demote to a safer mode.',
        },
        {
          k: 'ul',
          items: [
            'STANDBY by default — the motor is never enabled at boot or without an explicit engage.',
            'Watchdog — if the control loop stalls, the watchdog cuts the drive and raises FAULT (watchdog-timeout).',
            'Heartbeat — the engine pulses the drive backend each tick; a hardware backend cuts power if the heartbeat stops.',
            'Fault conditions — over-current, under-voltage, watchdog timeout, E-stop, a microcontroller-reported drive fault, or persistent off-course beyond the fault threshold latch a FAULT.',
            'Demotion — losing the wind in WIND demotes to AUTO; losing GPS/course in TRACK demotes to a safer state rather than steering blind.',
            'E-Stop — a latched motor cut. The software E-STOP button and any hardware kill line both assert it; power stays cut until the fault is cleared.',
          ],
        },
        {
          k: 'p',
          text: 'A FAULT is latched: it stays until the operator presses CLEAR FAULT (which also releases the software E-stop) and returns the pilot to STANDBY.',
        },
      ],
    },
    {
      id: 'sensors',
      icon: '📡',
      title: 'Data Sources & Validity',
      blocks: [
        {
          k: 'p',
          text: 'Each tick the engine builds a snapshot of every input the control and safety layers need. Each value has a staleness budget — a reading older than its budget is treated as missing/invalid, which drives the safety rules (e.g. lost heading → motor off).',
        },
        {
          k: 'spec',
          rows: [
            { label: 'Heading', value: 'valid ≤ 1.5 s — required to steer; loss → FAULT' },
            { label: 'Apparent wind', value: 'valid ≤ 3 s — required in WIND; loss → demote' },
            { label: 'Position / COG / SOG', value: 'valid ≤ 3 s' },
            { label: 'Course (XTE / bearing)', value: 'valid ≤ 5 s — required in TRACK; loss → hold heading' },
            { label: 'Rudder feedback', value: 'valid ≤ 2 s' },
            { label: 'Motor current', value: 'valid ≤ 2 s — over-current → FAULT' },
            { label: 'Battery voltage', value: 'valid ≤ 10 s — under-voltage → refuse / FAULT' },
          ],
        },
        {
          k: 'note',
          text: 'Data flows over the Signal K bus; the engine also serves its own HTTP command API (port 3990) that replicates the Signal K v2 autopilot routes the panel calls.',
        },
      ],
    },
    {
      id: 'telemetry',
      icon: '📊',
      title: 'Telemetry Readouts',
      blocks: [
        {
          k: 'p',
          text: 'The telemetry tiles show the live control state. Values are read back from Signal K, so they reflect exactly what the engine published.',
        },
        {
          k: 'spec',
          rows: [
            { label: 'HEADING (actual / target)', value: 'compass heading vs the pilot setpoint (green = active target)' },
            { label: 'RUDDER CMD', value: 'rudder angle being commanded (positive = starboard)' },
            { label: 'APP. WIND', value: 'apparent wind angle (AWA); the WIND setpoint source' },
            { label: 'MOTOR (A)', value: 'instantaneous drive current; high sustained current can mean a binding rudder' },
            { label: 'BATTERY (V)', value: 'supply voltage at the drive; turns red below 11.8 V' },
            { label: 'XTE (TRACK)', value: 'cross-track error in metres, with P/S side' },
            { label: 'WAYPOINT BRG (TRACK)', value: 'true bearing to the active waypoint' },
          ],
        },
      ],
    },
    {
      id: 'alerts',
      icon: '🚨',
      title: 'Alerts',
      blocks: [
        {
          k: 'p',
          text: 'The ALERTS band surfaces active conditions at panel level so nothing is missed while you focus on the controls.',
        },
        {
          k: 'ul',
          items: [
            'FAULT — latched motor cut; shows the reason and a CLEAR FAULT action.',
            'NO-GO — the route bearing is inside the no-go zone; the pilot holds the sailable edge.',
            'Wind hazard — gust / tack risk / gybe risk (gybe shown as critical).',
            'OFF COURSE — the commanded rudder is large (> 10°), indicating the pilot is working hard to hold course.',
          ],
        },
      ],
    },
    {
      id: 'calibration',
      icon: '🎚',
      title: 'Calibration & Tuning',
      blocks: [
        {
          k: 'p',
          text: 'Open CALIBRATION from the status bar (STANDBY only). Changes apply immediately and are validated by the engine — invalid values are clamped to safe ranges.',
        },
        {
          k: 'spec',
          rows: [
            { label: 'Kp · Ki · Kd', value: 'steering PID gains' },
            { label: 'Deadband', value: 'heading-error tolerance before correction' },
            { label: 'Rudder limit', value: 'maximum commanded rudder angle' },
            { label: 'PWM min / max', value: 'motor-driver pulse-width range' },
            { label: 'Current limit', value: 'over-current fault threshold' },
            { label: 'Voltage cutoff', value: 'under-voltage lockout' },
          ],
        },
        {
          k: 'p',
          text: 'A dock-side drive test (jog to port/starboard for a few seconds) is available in STANDBY only, with the full safety layer still running so it aborts on any fault.',
        },
      ],
    },
    {
      id: 'eventlog',
      icon: '📜',
      title: 'Event Log',
      blocks: [
        {
          k: 'p',
          text: 'The Event Log is a live, operator-facing timeline of the decisions the pilot takes and why — an audit trail derived from the published state.',
        },
        {
          k: 'ul',
          items: [
            'Engage / disengage / mode changes and command refusals (with the engine’s reason).',
            'Faults raised and cleared; wind hazards; no-go on/off.',
            'TRACK following, XTE corrections, waypoint advance and route complete.',
            'TRACK engaged with no course (critical) — the pilot is holding heading, not tracking.',
          ],
        },
        {
          k: 'note',
          text: 'Entries are colour-coded by severity (info / action / warn / critical) and can be filtered and cleared.',
        },
      ],
    },
    {
      id: 'drive',
      icon: '🔌',
      title: 'Motor & Drive Backends',
      blocks: [
        {
          k: 'p',
          text: 'The drive is abstracted so the same control logic runs on the bench and on the boat. The engine only sets a desired rudder angle and pulses a heartbeat; each backend maps that to its transport.',
        },
        {
          k: 'ul',
          items: [
            'sim — the bench boat model; used for simulator-first validation.',
            'serial — UART to a microcontroller (framed ASCII + heartbeat), which is the real-time failsafe and reports rudder/current telemetry and drive faults.',
            'gpio / can — hardware transports (opt-in). Hardware backends are never the default.',
          ],
        },
        {
          k: 'warn',
          text: 'Hardware control is opt-in and configured explicitly; the pilot defaults to the simulator and never drives real hardware without configuration.',
        },
      ],
    },
    {
      id: 'troubleshooting',
      icon: '🧰',
      title: 'Troubleshooting',
      blocks: [
        {
          k: 'spec',
          rows: [
            { label: 'ENGINE OFFLINE', value: 'the engine API is unreachable on port 3990 — the service may be stopped, crashed or off-network.' },
            { label: 'Engage refused', value: 'read the reason: no valid heading / no valid apparent wind / fault must be cleared / no sensor data yet.' },
            { label: 'TRACK not steering to the waypoint', value: 'no active course — set a destination; the Event Log shows “TRACK engaged but no active destination/course”.' },
            { label: 'Won’t engage on low battery', value: 'under-voltage lockout — the engine refuses to engage below the voltage cutoff.' },
            { label: 'FAULT won’t clear', value: 'the fault condition is still present (e.g. E-stop held, over-current); resolve it, then press CLEAR FAULT.' },
            { label: 'NO-GO on a route leg', value: 'the leg points inside the no-go zone; the pilot holds the sailable edge until the bearing opens up.' },
          ],
        },
      ],
    },
  ],
};

const ES: ManualDoc = {
  title: 'Piloto automático — Manual técnico',
  subtitle: 'Cómo el piloto percibe, decide y gobierna · referencia completa del producto',
  ui: {
    open: 'MANUAL',
    close: 'Cerrar',
    search: 'Buscar en el manual…',
    contents: 'Índice',
    empty: 'Ninguna sección coincide con la búsqueda.',
  },
  sections: [
    {
      id: 'overview',
      icon: '🛈',
      title: 'Visión general',
      blocks: [
        {
          k: 'p',
          text: 'El piloto automático es un sistema de gobierno en lazo cerrado. Un bucle de control de frecuencia fija lee una instantánea coherente de los sensores del barco, aplica las reglas de seguridad obligatorias, ejecuta el controlador del modo activo y ordena el accionamiento — y luego publica todo su estado para que este panel refleje siempre lo que hace el piloto.',
        },
        {
          k: 'p',
          text: 'La responsabilidad se reparte por seguridad: el motor (engine) realiza los cálculos de navegación y control, mientras que un microcontrolador aparte es la capa de failsafe en tiempo real que realmente mueve el motor y corta la alimentación si el engine deja de comunicarse con él (heartbeat).',
        },
        {
          k: 'warn',
          text: 'El piloto siempre arranca EN ESPERA con el motor deshabilitado. Nunca engancha el accionamiento por sí solo — activar es siempre una acción explícita del operador.',
        },
      ],
    },
    {
      id: 'modes',
      icon: '🕹',
      title: 'Modos de operación',
      blocks: [
        {
          k: 'p',
          text: 'El piloto está siempre en exactamente un estado. El modo activo decide qué controlador se ejecuta y qué consigna se mantiene.',
        },
        {
          k: 'ul',
          items: [
            'EN ESPERA — Inactivo. El accionamiento está desarmado y no se envían órdenes de gobierno. Necesario para abrir calibración, ejecutar pruebas de motor o cambiar el sintonizado. El gobierno manual tiene el control.',
            'AUTO (compás) — Mantiene una consigna de rumbo fija. El rumbo actual se captura al activar; usa la esquiva para ajustarlo.',
            'VIENTO (veleta) — Mantiene un ángulo de viento aparente (AWA) fijo. La consigna sigue a la proa, así que el piloto gobierna para mantener el mismo ángulo al viento.',
            'DERROTA (GPS/ruta) — Sigue el tramo de waypoint activo, gobernando para minimizar el error de derrota (XTE) hacia la demora del destino.',
            'FALLO — Corte de seguridad enclavado. El motor está apagado y se muestra el motivo hasta que el operador lo borra.',
          ],
        },
        {
          k: 'note',
          text: 'El engine nombra rumbo→AUTO y derrota→ROUTE al publicar el estado, siguiendo las convenciones de Signal K; el panel etiqueta DERROTA para el modo de seguimiento de ruta.',
        },
      ],
    },
    {
      id: 'engage',
      icon: '🔘',
      title: 'Activar y desactivar',
      blocks: [
        {
          k: 'steps',
          items: [
            'Selecciona la pestaña de modo (Auto / Viento / Ruta) en la consola de gobierno.',
            'Pulsa ACTIVAR. El engine valida las comprobaciones previas, arma el accionamiento e inicia el gobierno en lazo cerrado.',
            'Para parar, pulsa DESACTIVAR — el piloto vuelve a EN ESPERA de inmediato, desarma el accionamiento y restablece el gobierno manual.',
          ],
        },
        {
          k: 'p',
          text: 'La activación captura la consigna en vivo de los sensores actuales: AUTO/DERROTA capturan el rumbo verdadero actual, VIENTO captura el ángulo de viento aparente actual. Si falta una entrada requerida, la orden se rechaza con un motivo (se muestra como «ORDEN RECHAZADA» y se registra en el Registro de eventos):',
        },
        {
          k: 'ul',
          items: [
            '«no valid heading» — AUTO o DERROTA solicitados sin un rumbo de compás fresco.',
            '«no valid apparent wind» — VIENTO solicitado sin una lectura fresca del viento del tope del palo.',
            '«fault must be cleared first» — hay un FALLO enclavado activo; bórralo antes de activar.',
            '«no sensor data yet» — el engine aún no ha recibido una primera instantánea de sensores.',
          ],
        },
        {
          k: 'warn',
          text: 'DERROTA solo exige un rumbo válido para engancharse — no un destino activo. Si activas DERROTA sin curso fluyendo, el piloto mantiene rumbo en vez de gobernar hacia un waypoint. El panel lo hace explícito (ver en el Registro «TRACK activado pero sin destino/curso activo»).',
        },
      ],
    },
    {
      id: 'follow',
      icon: '📍',
      title: 'Seguir un waypoint / ruta',
      blocks: [
        {
          k: 'steps',
          items: [
            'En la carta o en Recursos, fija un waypoint/ruta como destino (esto fija el Course de Signal K).',
            'Si el piloto ya está enganchado, cambia a DERROTA automáticamente y sigue el destino.',
            'Si el piloto está EN ESPERA, el panel muestra un banner «SEGUIR EN TRACK». Púlsalo para activar DERROTA hacia el destino — una confirmación explícita y segura (el piloto nunca se auto-activa desde EN ESPERA).',
          ],
        },
        {
          k: 'p',
          text: 'Una vez siguiendo, el piloto lee la demora del tramo y el XTE desde la API Course de Signal K y gobierna para cerrar la derrota. Al llegar a un waypoint avanza al siguiente tramo; en el último waypoint indica RUTA COMPLETADA.',
        },
      ],
    },
    {
      id: 'dodge',
      icon: '🎯',
      title: 'Ajuste de rumbo (esquiva)',
      blocks: [
        {
          k: 'p',
          text: 'Disponible en AUTO y VIENTO. Los botones de esquiva suman o restan grados a la consigna activa para sortear un obstáculo o ajustar el rumbo. El piloto aplica un cambio de rumbo suave a la velocidad de giro configurada.',
        },
        {
          k: 'spec',
          rows: [
            { label: '◀◀ 10°', value: 'Girar 10° a babor' },
            { label: '◀ 1°', value: 'Girar 1° a babor' },
            { label: '1° ▶', value: 'Girar 1° a estribor' },
            { label: '10° ▶▶', value: 'Girar 10° a estribor' },
          ],
        },
        {
          k: 'note',
          text: 'Los cambios de esquiva no son persistentes: una nueva activación o cambio de modo recaptura la consigna del rumbo / ángulo de viento actual.',
        },
      ],
    },
    {
      id: 'control',
      icon: '⚙',
      title: 'Gobierno y ley de control',
      blocks: [
        {
          k: 'p',
          text: 'Cada modo acciona un controlador PID que convierte el error de rumbo (o de AWA, o de derrota) en una demanda de timón. Una banda muerta suprime correcciones diminutas; la demanda se limita luego al tope de timón y se convierte en una orden de accionamiento normalizada en [-1, 1].',
        },
        {
          k: 'ul',
          items: [
            'Kp / Ki / Kd — ganancias proporcional, integral y derivativa del PID de gobierno.',
            'Banda muerta — tolerancia de error de rumbo por debajo de la cual no se corrige (reduce el zigzagueo).',
            'Tope de timón — ángulo máximo de timón ordenado; la demanda se limita a ±tope.',
            'PWM mín / máx — suelo y techo del accionamiento aplicados a la demanda de motor normalizada (para backends sin sensor de posición de timón).',
          ],
        },
        {
          k: 'p',
          text: 'El engine nunca acciona el motor directamente: emite un ángulo de timón deseado más un accionamiento normalizado, y el backend seleccionado lo traduce a PWM / dirección / habilitación en su transporte.',
        },
      ],
    },
    {
      id: 'wind',
      icon: '🌬',
      title: 'Modo viento y avisos',
      blocks: [
        {
          k: 'p',
          text: 'En VIENTO el piloto gobierna para mantener un ángulo de viento aparente fijo. Como la consigna sigue a la proa, una virada o trasluchada accidental se contrarresta automáticamente — la ley de control contragobierna hasta el ángulo fijado. El piloto además detecta y expone tres avisos:',
        },
        {
          k: 'ul',
          items: [
            'Racha — la velocidad de viento aparente supera su media móvil.',
            'Virada accidental — el viento aparente cruza la proa (cambio de signo del AWA con ambos lados cerca de proa al viento).',
            'Trasluchada accidental — el viento aparente cruza la popa más allá del ángulo de guarda (riesgo de giro incontrolado de la botavara).',
          ],
        },
        {
          k: 'p',
          text: 'Un aviso detectado se mantiene unos segundos para que el timonel lo vea, activa la alarma correspondiente y se muestra en la banda de ALERTAS (la trasluchada se trata como crítica). El piloto contragobierna al ángulo de viento fijado; no se auto-desactiva.',
        },
      ],
    },
    {
      id: 'track',
      icon: '🧭',
      title: 'Modo derrota y seguimiento de ruta',
      blocks: [
        {
          k: 'p',
          text: 'En DERROTA el piloto lee el tramo activo desde la API Course de Signal K: la demora al siguiente waypoint y el error de derrota (XTE). El rumbo demandado es la demora del tramo más una corrección de XTE acotada, de modo que el barco converge sobre la derrota y luego la mantiene.',
        },
        {
          k: 'ul',
          items: [
            'XTE — distancia perpendicular fuera de la línea de derrota. Positivo = a estribor de la derrota (gobierna a babor); se muestra con prefijo B/E.',
            'Guarda de límite de navegación (zona muerta) — el piloto nunca gobierna un rumbo demandado dentro de la zona muerta. Si el tramo apunta demasiado cerca del viento, se limita al rumbo navegable más próximo (el borde de la zona muerta, ángulo de virada por defecto 40°) y genera una alerta ZONA MUERTA.',
            'Avance de ruta automático — al llegar dentro del radio de llegada (por defecto 30 m) el piloto solicita el siguiente punto de ruta; se rearma tras salir de 1,5× ese radio para que un solo paso avance exactamente un tramo.',
            'RUTA COMPLETADA — se indica al alcanzar el último waypoint.',
          ],
        },
        {
          k: 'note',
          text: 'Signal K no avanza la ruta por sí solo; primero debe haber un course/ruta activo en Signal K. El piloto solicita el siguiente punto al llegar.',
        },
      ],
    },
    {
      id: 'safety',
      icon: '🛡',
      title: 'Sistemas de seguridad',
      blocks: [
        {
          k: 'p',
          text: 'Las reglas de seguridad se ejecutan en cada tick, antes del control. Pueden generar un FALLO enclavado (motor apagado) o degradar suavemente a un modo más seguro.',
        },
        {
          k: 'ul',
          items: [
            'EN ESPERA por defecto — el motor nunca se habilita al arrancar ni sin una activación explícita.',
            'Vigilante (watchdog) — si el bucle de control se detiene, el vigilante corta el accionamiento y genera FALLO (watchdog-timeout).',
            'Heartbeat — el engine pulsa el backend cada tick; un backend de hardware corta la alimentación si el heartbeat se detiene.',
            'Condiciones de fallo — sobrecorriente, subtensión, timeout del vigilante, parada de emergencia, un fallo de accionamiento reportado por el microcontrolador, o desvío persistente más allá del umbral enclavan un FALLO.',
            'Degradación — perder el viento en VIENTO degrada a AUTO; perder GPS/curso en DERROTA degrada a un estado más seguro en vez de gobernar a ciegas.',
            'Parada de emergencia — corte de motor enclavado. El botón de PARADA por software y cualquier línea física de corte la activan; la alimentación queda cortada hasta borrar el fallo.',
          ],
        },
        {
          k: 'p',
          text: 'Un FALLO es enclavado: permanece hasta que el operador pulsa BORRAR FALLO (que también libera la parada de emergencia por software) y devuelve el piloto a EN ESPERA.',
        },
      ],
    },
    {
      id: 'sensors',
      icon: '📡',
      title: 'Fuentes de datos y validez',
      blocks: [
        {
          k: 'p',
          text: 'En cada tick el engine construye una instantánea de cada entrada que necesitan las capas de control y seguridad. Cada valor tiene un presupuesto de frescura — una lectura más antigua que su presupuesto se trata como ausente/no válida, lo que activa las reglas de seguridad (p. ej. pérdida de rumbo → motor apagado).',
        },
        {
          k: 'spec',
          rows: [
            { label: 'Rumbo', value: 'válido ≤ 1,5 s — necesario para gobernar; pérdida → FALLO' },
            { label: 'Viento aparente', value: 'válido ≤ 3 s — necesario en VIENTO; pérdida → degradar' },
            { label: 'Posición / COG / SOG', value: 'válido ≤ 3 s' },
            { label: 'Curso (XTE / demora)', value: 'válido ≤ 5 s — necesario en DERROTA; pérdida → mantener rumbo' },
            { label: 'Realimentación de timón', value: 'válido ≤ 2 s' },
            { label: 'Corriente de motor', value: 'válido ≤ 2 s — sobrecorriente → FALLO' },
            { label: 'Tensión de batería', value: 'válido ≤ 10 s — subtensión → rechazar / FALLO' },
          ],
        },
        {
          k: 'note',
          text: 'Los datos circulan por el bus Signal K; el engine además sirve su propia API HTTP de comandos (puerto 3990) que replica las rutas de piloto Signal K v2 que llama el panel.',
        },
      ],
    },
    {
      id: 'telemetry',
      icon: '📊',
      title: 'Lecturas de telemetría',
      blocks: [
        {
          k: 'p',
          text: 'Los tiles de telemetría muestran el estado de control en vivo. Los valores se releen desde Signal K, así que reflejan exactamente lo que el engine publicó.',
        },
        {
          k: 'spec',
          rows: [
            { label: 'RUMBO (actual / objetivo)', value: 'rumbo de compás vs la consigna del piloto (verde = objetivo activo)' },
            { label: 'ORDEN TIMÓN', value: 'ángulo de timón ordenado (positivo = estribor)' },
            { label: 'VIENTO AP.', value: 'ángulo de viento aparente (AWA); fuente de consigna en VIENTO' },
            { label: 'MOTOR (A)', value: 'corriente instantánea; una corriente alta sostenida puede indicar timón agarrotado' },
            { label: 'BATERÍA (V)', value: 'tensión de alimentación del accionamiento; se pone roja por debajo de 11,8 V' },
            { label: 'XTE (DERROTA)', value: 'error de derrota en metros, con banda B/E' },
            { label: 'DEMORA WPT (DERROTA)', value: 'demora verdadera al waypoint activo' },
          ],
        },
      ],
    },
    {
      id: 'alerts',
      icon: '🚨',
      title: 'Alertas',
      blocks: [
        {
          k: 'p',
          text: 'La banda de ALERTAS expone las condiciones activas a nivel de panel para que no se pase nada por alto mientras te centras en los mandos.',
        },
        {
          k: 'ul',
          items: [
            'FALLO — corte de motor enclavado; muestra el motivo y una acción BORRAR FALLO.',
            'ZONA MUERTA — la demora de ruta está dentro de la zona muerta; el piloto mantiene el borde navegable.',
            'Aviso de viento — racha / riesgo de virada / riesgo de trasluchada (la trasluchada como crítica).',
            'FUERA DE RUMBO — el timón ordenado es grande (> 10°), indicando que el piloto trabaja duro para mantener rumbo.',
          ],
        },
      ],
    },
    {
      id: 'calibration',
      icon: '🎚',
      title: 'Calibración y sintonizado',
      blocks: [
        {
          k: 'p',
          text: 'Abre CALIBRACIÓN desde la barra de estado (solo EN ESPERA). Los cambios se aplican de inmediato y los valida el engine — los valores no válidos se limitan a rangos seguros.',
        },
        {
          k: 'spec',
          rows: [
            { label: 'Kp · Ki · Kd', value: 'ganancias del PID de gobierno' },
            { label: 'Banda muerta', value: 'tolerancia de error de rumbo antes de corregir' },
            { label: 'Tope de timón', value: 'ángulo máximo de timón ordenado' },
            { label: 'PWM mín / máx', value: 'rango de ancho de pulso del controlador del motor' },
            { label: 'Límite de corriente', value: 'umbral de fallo por sobrecorriente' },
            { label: 'Corte de tensión', value: 'bloqueo por subtensión' },
          ],
        },
        {
          k: 'p',
          text: 'Una prueba de accionamiento en muelle (jog a babor/estribor unos segundos) está disponible solo EN ESPERA, con la capa de seguridad completa aún activa, de modo que aborta ante cualquier fallo.',
        },
      ],
    },
    {
      id: 'eventlog',
      icon: '📜',
      title: 'Registro de eventos',
      blocks: [
        {
          k: 'p',
          text: 'El Registro de eventos es una línea de tiempo en vivo, orientada al operador, de las decisiones que toma el piloto y por qué — una traza de auditoría derivada del estado publicado.',
        },
        {
          k: 'ul',
          items: [
            'Activar / desactivar / cambios de modo y rechazos de orden (con el motivo del engine).',
            'Fallos generados y borrados; avisos de viento; zona muerta on/off.',
            'Seguimiento en DERROTA, correcciones de XTE, avance de waypoint y ruta completada.',
            'DERROTA activada sin curso (crítico) — el piloto mantiene rumbo, no sigue.',
          ],
        },
        {
          k: 'note',
          text: 'Las entradas se codifican por color según severidad (info / acción / aviso / crítico) y se pueden filtrar y limpiar.',
        },
      ],
    },
    {
      id: 'drive',
      icon: '🔌',
      title: 'Motor y backends de accionamiento',
      blocks: [
        {
          k: 'p',
          text: 'El accionamiento está abstraído para que la misma lógica de control corra en el banco y en el barco. El engine solo fija un ángulo de timón deseado y pulsa un heartbeat; cada backend lo traduce a su transporte.',
        },
        {
          k: 'ul',
          items: [
            'sim — el modelo de barco del banco; para validación simulador-primero.',
            'serial — UART a un microcontrolador (ASCII con tramas + heartbeat), que es el failsafe en tiempo real e informa telemetría de timón/corriente y fallos de accionamiento.',
            'gpio / can — transportes de hardware (opt-in). Los backends de hardware nunca son el valor por defecto.',
          ],
        },
        {
          k: 'warn',
          text: 'El control de hardware es opt-in y se configura explícitamente; el piloto usa el simulador por defecto y nunca acciona hardware real sin configuración.',
        },
      ],
    },
    {
      id: 'troubleshooting',
      icon: '🧰',
      title: 'Resolución de problemas',
      blocks: [
        {
          k: 'spec',
          rows: [
            { label: 'MOTOR DESCONECTADO', value: 'la API del engine no responde en el puerto 3990 — el servicio puede estar detenido, caído o fuera de red.' },
            { label: 'Activación rechazada', value: 'lee el motivo: no valid heading / no valid apparent wind / fault must be cleared / no sensor data yet.' },
            { label: 'DERROTA no gobierna al waypoint', value: 'sin curso activo — fija un destino; el Registro muestra «TRACK activado pero sin destino/curso activo».' },
            { label: 'No engancha con batería baja', value: 'bloqueo por subtensión — el engine rechaza activar por debajo del corte de tensión.' },
            { label: 'El FALLO no se borra', value: 'la condición de fallo sigue presente (p. ej. parada de emergencia mantenida, sobrecorriente); resuélvela y luego pulsa BORRAR FALLO.' },
            { label: 'ZONA MUERTA en un tramo', value: 'el tramo apunta dentro de la zona muerta; el piloto mantiene el borde navegable hasta que la demora se abra.' },
          ],
        },
      ],
    },
  ],
};

export const AUTOPILOT_MANUAL: Record<'en' | 'es', ManualDoc> = { en: EN, es: ES };
