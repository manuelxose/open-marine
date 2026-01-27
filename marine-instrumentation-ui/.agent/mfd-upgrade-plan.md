# MFD Application Upgrade - Implementation Plan

## Phase 1: Core Infrastructure ✓
- [x] Install Leaflet + @types/leaflet
- [x] Add Leaflet CSS to angular.json
- [ ] Update routing for all pages
- [ ] Enhance AppShell with proper navigation
- [ ] Add track buffer to DatapointStore

## Phase 2: Pages to Create
1. **Chart/Map Page** (`pages/chart/chart.page.ts`)
   - Leaflet map integration
   - Live vessel marker
   - Track polyline (breadcrumb trail)
   - Layers control panel
   - GPS status overlay
   
2. **Instruments Page** (`pages/instruments/instruments.page.ts`)
   - Dense grid of all instruments
   - Engineering view
   
3. **Alarms Page** (`pages/alarms/alarms.page.ts`)
   - Placeholder for now
   
4. **Settings Page** (`pages/settings/settings.page.ts`)
   - Convert SettingsDrawerComponent to full page
   - Units, theme, density

## Phase 3: Components to Create
1. **GPS Status Card** (`ui/components/gps-status-card/gps-status-card.component.ts`)
   - Fix state indicator
   - Position display
   - Timestamp
   - Quality metrics (if available)
   
2. **Navigation Bar** (update existing AppShell)
   - Side nav (collapsible)
   - Route links
   - Active route highlighting

## Phase 4: State Enhancements
1. **Position Track Buffer**
   - Ring buffer for last N positions
   - Selector: `trackPoints$`
   - Auto-prune old points (30 min or 100 points)
   
2. **New Selectors**
   - `currentPosition$`
   - `currentCOG$`
   - `currentHDG$`
   - `fixQuality$` (derived from data freshness)

## Phase 5: Dashboard Redesign
- Keep critical strip
- Improve composite cards layout
- Better spacing and density
- Remove "debug" feel

## Implementation Order
1. Routing + AppShell navigation
2. GPS Status component
3. Chart/Map page (core feature)
4. Settings page  
5. Instruments page
6. Dashboard improvements
7. Polish and validation

This will be done incrementally to ensure each step works before moving to the next.
