# Open Marine — Design System & Aesthetic

Authoritative guide for keeping the UI visually coherent. Load before any styling
work. **Absolute rule (from the theme file): never hardcode colors in components —
always derive from tokens.**

## Two token layers

1. `marine-instrumentation-ui/src/app/shared/styles/_tokens.scss` — base Nord
   semantic palette + spacing/radius/shadow/z-index scales. Day-mode defaults.
2. `marine-instrumentation-ui/src/app/shared/styles/_glass-bridge-theme.scss` —
   **the authoritative instrument/marine palette** (`--gb-*`). Used by instruments,
   the chart overlays, dashboard and autopilot. It also overrides `--success`,
   `--warn`, `--danger`, `--chart-overlay-*`.

Themes: `:root` **defaults to night** (`[data-theme='night'], :root`). Day is opt-in
via `[data-theme='day']`. Every `--gb-*` token is defined for both, so token-only
styling adapts automatically. Visual language target: Garmin / Raymarine / B&G.

## Glass Bridge tokens (use these in components)

- Surfaces: `--gb-bg-canvas`, `--gb-bg-bezel`, `--gb-bg-face`, `--gb-bg-panel`,
  `--gb-bg-glass`, `--gb-bg-glass-active`.
- Borders: `--gb-border-panel`, `--gb-border-active` (active/selected/focus).
- Text: `--gb-text-value` (primary digital value), `--gb-text-unit`,
  `--gb-text-muted`, `--gb-text-cardinal`, `--gb-text-stale`.
- Data/status: `--gb-data-good` (green), `--gb-data-warn` (yellow),
  `--gb-data-stale` (red); connection: `--gb-connection-active/-lost/-stale`.
- Accent / reference (blue): `--gb-tick-reference` or `--gb-needle-secondary`.
  Safety orange (off-course / primary needle): `--gb-needle-primary`.
- Arcs (gauge fills, translucent): `--gb-arc-normal/-warning/-danger`.
- Alarms (bg + border pairs): `--gb-alarm-emergency-*` (red), `--gb-alarm-critical-*`
  (orange), `--gb-alarm-warning-*` (yellow), `--gb-alarm-info-*` (blue).
- Chart overlays (any floating panel on the map): `--chart-overlay-bg`,
  `--chart-overlay-border`, `--chart-overlay-shadow`, `--chart-overlay-blur`.

Scales (from `_tokens.scss`): spacing `--space-0..16`, radius `--radius-sm|md|lg|full`,
shadows `--shadow-sm..2xl`, z-index `--z-*` and chart `--z-map`, `--z-chart-panels`,
`--z-chart-modals`, etc. Chart spacing: `--chart-edge-gap`, `--chart-element-gap`.

## Common mappings (do NOT invent equivalents)

- Engaged / OK / good → `--gb-data-good`; subtle fill → `--gb-arc-normal`.
- Fault / danger / disengage → `--gb-data-stale` + `--gb-alarm-emergency-bg/-border`.
- Caution / warning / off-course → `--gb-data-warn` / `--gb-needle-primary` +
  `--gb-alarm-warning|critical-*`.
- Selected/active control → fill `--gb-tick-reference` with text `--gb-bg-canvas`
  (or subtle: `--gb-bg-glass-active` + `--gb-border-active`).
- `--status-offline` resolves to **grey** (text-tertiary), NOT red — don't use it
  for danger.

## Component conventions

- Standalone + `OnPush`. Reuse `shared/components/` (`app-button`, `app-icon`,
  `panel-card`, `gb-instrument-bezel`, `app-flex`/`app-grid`, sparkline) before new UI.
- Numeric/instrument values: `font-family: var(--font-mono, monospace)`,
  `font-variant-numeric: tabular-nums`. Labels: uppercase, `letter-spacing` ~0.08em,
  `--gb-text-muted`.
- Touch targets ≥ 44px (`min-height: 44px`). Panels: `--radius-lg`, 1px
  `--gb-border-panel`, glass background.
- Floating chart controls mirror `map-controls`/`quick-instruments`: use the
  `--chart-overlay-*` tokens and a `chart-zone--*` wrapper in `chart.page.ts`.

## MapLibre caveat

WebGL paint properties (`maplibre-engine.service.ts`) **cannot read CSS variables**.
Use a literal hex that matches the intended token value and comment which token it
mirrors (e.g. autopilot target line `#00e676` = `--gb-data-good`). This is the only
sanctioned place for color literals.

## Reference components

- Autopilot console + chart overlay: `features/autopilot/components/` — canonical
  example of token-only styling, status colors and the active-control affordance.
- Instruments / gauges: `ui/instruments/` and `gb-instrument-bezel`.
