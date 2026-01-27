# Configurable Dashboard Layout - Implementation Summary

## Overview
Implemented a flexible dashboard layout system allowing users to show/hide widgets and configure dashboard composition with localStorage persistence.

## Architecture

### 1. **Widget Definition Model** (`core/models/widget.models.ts`)

```typescript
export interface WidgetDefinition {
    id: string;                 // Unique identifier
    title: string;              // Display name
    description: string;        // Short description
    size: 'S' | 'M' | 'L';     // Widget size class
    requiredPaths: string[];    // Signal K paths needed
    category: string;           // Grouping category
}

export interface WidgetConfig {
    id: string;
    visible: boolean;           // Show/hide state
    order: number;             // Display order
}
```

### 2. **Available Widgets**

#### Large (L) - Primary composite instruments
- **navigation-card**: SOG, COG, HDG, Position + trend
- **wind-card**: AWS, AWA + trend

#### Medium (M) - Secondary instruments  
- **depth-card**: Depth + trend
- **power-card**: Battery voltage/current + trend

#### Small (S) - Compact single-value displays
- **diagnostics-summary**: System status
- **sog-simple**: Speed over ground (compact)
- **heading-simple**: True heading (compact)
- **depth-simple**: Depth (compact)

### 3. **LayoutService** (`core/services/layout.service.ts`)

**Responsibilities:**
- Manages widget visibility and ordering
- Persists configuration to `localStorage` (`omi-layout`)
- Merges saved config with defaults (handles new widgets gracefully)
- Provides reactive layout$ observable

**Key Methods:**
```typescript
getWidgetDefinitions(): WidgetDefinition[]
getVisibleWidgets(): WidgetConfig[]
toggleWidget(widgetId: string): void
setWidgetVisibility(widgetId: string, visible: boolean): void
reorderWidgets(newOrder: string[]): void  // Future: drag & drop
reset(): void
```

### 4. **Settings UI Integration**

Added "Dashboard Widgets" section in `SettingsDrawerComponent`:
- Lists all available widgets with descriptions
- Toggle switches for each widget
- Size badge (S/M/L) for each widget
- "Reset to Default" button
- Scrollable list (max-height for many widgets)

### 5. **Dynamic Dashboard Rendering**

**DashboardPage** now renders widgets dynamically:
- Uses `*ngFor` + `visibleWidgets$` observable
- `NgSwitch` to render correct component per widget ID
- Responsive grid:
  - **Size L**: 4 columns (full-width mobile)
  - **Size M**: 4 columns (full-width mobile)
  - **Size S**: 3 columns (2-up mobile)
- `trackBy` for performance

## Grid Layout

```
[ Critical Strip - Always Visible ]
┌─────────────────────────────────┐
│ SOG │ HDG │ Depth │ Wind │ Bat │
└─────────────────────────────────┘

[ Dynamic Widget Grid - 12 columns ]
┌────────┬────────┬────────┐
│   L    │   L    │   M    │  ← Size-based columns
│        │        ├────────┤
│        │        │   M    │
│        │        ├────────┤
│        │        │ S │ S  │
└────────┴────────┴────────┘
```

## User Experience

1. **Settings → Dashboard Widgets**
2. Toggle widgets on/off
3. Dashboard updates in real-time
4. Configuration persists across sessions
5. Reset to default anytime

## Technical Implementation

### Default Configuration
```typescript
const DEFAULT_LAYOUT: DashboardLayout = {
    widgets: [
        { id: 'navigation-card', visible: true, order: 0 },
        { id: 'wind-card', visible: true, order: 1 },
        { id: 'depth-card', visible: true, order: 2 },
        { id: 'power-card', visible: true, order: 3 },
        { id: 'diagnostics-summary', visible: true, order: 4 },
        { id: 'sog-simple', visible: false, order: 5 },
        { id: 'heading-simple', visible: false, order: 6 },
        { id: 'depth-simple', visible: false, order: 7 }
    ]
};
```

### Merge Strategy
When loading saved config, the service merges with defaults to ensure:
- New widgets added in updates appear with default settings
- Removed widgets are safely ignored
- User preferences are preserved

## Future Enhancements

- [ ] Drag & drop reordering
- [ ] Widget size customization
- [ ] Custom widget templates
- [ ] Import/export configurations
- [ ] Per-device layouts (tablet vs desktop)

## Files Created
- `src/app/core/models/widget.models.ts`
- `src/app/core/services/layout.service.ts`

## Files Modified
- `src/app/ui/components/settings-drawer/settings-drawer.component.ts`
- `src/app/pages/dashboard/dashboard.page.ts`

## Benefits
✅ User customization - show only relevant widgets  
✅ Flexible layout - adapts to user needs  
✅ Easy to extend - add new widgets via definitions  
✅ Persistent - survives page refreshes  
✅ Performant - OnPush + trackBy  
✅ Type-safe - no `any` types
