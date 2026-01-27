# Settings & Preferences - Implementation Summary

## Overview
Added a settings drawer component allowing users to customize units, theme, and dashboard density with localStorage persistence.

## Features Implemented

### 1. **PreferencesService** (`core/services/preferences.service.ts`)
- Manages user preferences with localStorage persistence
- Supports:
  - Speed units: `kn`, `m/s`, `km/h`
  - Depth units: `m`, `ft`
  - Compact Mode toggle
- Auto-applies compact mode CSS class to body

### 2. **SettingsDrawerComponent** (`ui/components/settings-drawer/settings-drawer.component.ts`)
- **Slide-in Panel**: Pure CSS implementation (no external UI library)
  - Positioned fixed on right side
  - Glass-morphic design matching dashboard theme
  - Smooth 300ms slide transition
- **Controls**:
  - Theme toggle (Day/Night)
  - Compact mode toggle switch
  - Speed unit dropdown (kn / m/s / km/h)
  - Depth unit dropdown (m / ft)
- **Trigger**: Floating settings button (bottom-right)

### 3. **Updated Formatters** (`core/formatting/formatters.ts`)
- `formatSpeed(mps, unit)` - now accepts unit parameter
- `formatDepth(meters, unit)` - renamed from `formatDepthMeters` and accepts unit
- Automatic conversion based on user preference

### 4. **Updated Instruments**
- `SogInstrumentComponent` - respects speed unit preference
- `DepthInstrumentComponent` - respects depth unit preference
- Both components now inject `PreferencesService` and combine prefs$ into their data streams

### 5. **Compact Mode CSS** (`styles.scss`)
```scss
body.compact-mode {
  .instrument-grid { gap: 0.5rem; padding: 0.5rem; }
  .card { padding: 0.5rem !important; }
  .title { font-size: 0.65rem !important; }
  .value { font-size: clamp(1.5rem, 4vw, 2.5rem) !important; }
}
```

## Integration
- Settings drawer added to DashboardPage template
- Automatically loads preferences on app init
- Changes persist immediately to localStorage

## Files Created
- `src/app/core/services/preferences.service.ts`
- `src/app/ui/components/settings-drawer/settings-drawer.component.ts`

## Files Modified
- `src/app/core/formatting/formatters.ts`
- `src/app/ui/instruments/sog/sog-instrument.component.ts`
- `src/app/ui/instruments/depth/depth-instrument.component.ts`
- `src/app/pages/dashboard/dashboard.page.ts`
- `src/styles.scss`

## Usage
1. Click settings icon (bottom-right)
2. Adjust preferences
3. Changes apply immediately and persist across sessions

## Technical Notes
- All components use OnPush change detection
- Preferences are combined with data streams using `combineLatest`
- Type-safe with no `any` types
- Follows existing architectural patterns
