import {
  WIDGET_DEFINITIONS,
  type WidgetKind,
  type WidgetSize,
} from '../../../core/models/widget.models';
import {
  INSTRUMENT_CATALOG,
  INSTRUMENT_CATEGORIES,
  type InstrumentCategoryId,
} from '../../instruments/data/instrument-catalog';
import { hasVisualWidget } from '../../instruments/data/visual-widget-map';

/**
 * Unified dashboard widget library. Combines the composite panels and the full
 * instrument catalog into a single, category-grouped registry that drives the
 * dashboard "Add" selector. Single source of truth for what can be placed on
 * the dashboard.
 */

export type LibraryGroupId = 'panels' | InstrumentCategoryId;

export interface LibraryItem {
  kind: WidgetKind;
  /** Panel definition id or instrument catalog id. */
  refId: string;
  label: string;
  description: string;
  size: WidgetSize;
  group: LibraryGroupId;
  icon: string;
}

export interface LibraryGroup {
  id: LibraryGroupId;
  label: string;
  icon: string;
  items: LibraryItem[];
}

// Human-readable panel metadata (panel titles in WIDGET_DEFINITIONS are i18n keys).
const PANEL_META: Record<string, { label: string; description: string; icon: string }> = {
  'navigation-card': { label: 'Navigation', description: 'Position, SOG, COG & heading', icon: 'compass' },
  'wind-card': { label: 'Wind', description: 'Apparent & true wind with trend', icon: 'wind' },
  'depth-card': { label: 'Depth', description: 'Depth below transducer with trend', icon: 'anchor' },
  'power-card': { label: 'Power', description: 'Battery voltage, current & power', icon: 'battery' },
  'system-card': { label: 'System', description: 'Connection & data health', icon: 'settings' },
  'engine-card': { label: 'Engine', description: 'RPM, temperature, oil & fuel', icon: 'engine' },
  'environment-card': { label: 'Environment', description: 'Water, air, pressure & humidity', icon: 'thermometer' },
  'autopilot-compass': { label: 'Autopilot Compass', description: 'Heading dial with target & rudder', icon: 'compass' },
  'sog-simple': { label: 'Speed Over Ground', description: 'Single SOG readout', icon: 'speedometer' },
  'heading-simple': { label: 'Heading', description: 'Single heading readout', icon: 'compass' },
  'depth-simple': { label: 'Depth', description: 'Single depth readout', icon: 'anchor' },
};

const PANEL_ITEMS: LibraryItem[] = WIDGET_DEFINITIONS.map((def) => {
  const meta = PANEL_META[def.id];
  return {
    kind: 'panel' as const,
    refId: def.id,
    label: meta?.label ?? def.id,
    description: meta?.description ?? '',
    size: def.size,
    group: 'panels' as const,
    icon: meta?.icon ?? 'activity',
  };
});

const CATEGORY_ICON = new Map<InstrumentCategoryId, string>(
  INSTRUMENT_CATEGORIES.map((c) => [c.id, c.icon]),
);

const INSTRUMENT_ITEMS: LibraryItem[] = INSTRUMENT_CATALOG.map((inst) => ({
  kind: 'instrument' as const,
  refId: inst.id,
  label: inst.label,
  description: inst.unit ? `Unit: ${inst.unit}` : '',
  // Instruments with a dedicated visual gauge get a roomier tile.
  size: hasVisualWidget(inst.id) ? 'M' : 'S',
  group: inst.category,
  icon: CATEGORY_ICON.get(inst.category) ?? 'gauge',
}));

/** All placeable items, panels first then instruments. */
export const LIBRARY_ITEMS: LibraryItem[] = [...PANEL_ITEMS, ...INSTRUMENT_ITEMS];

/** Category-grouped library for the selector UI (panels group first). */
export const LIBRARY_GROUPS: LibraryGroup[] = [
  { id: 'panels', label: 'Panels', icon: 'layers', items: PANEL_ITEMS },
  ...INSTRUMENT_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    icon: cat.icon,
    items: INSTRUMENT_ITEMS.filter((i) => i.group === cat.id),
  })),
];

/** Lookup a library item by kind + refId. */
export function getLibraryItem(kind: WidgetKind, refId: string): LibraryItem | undefined {
  return LIBRARY_ITEMS.find((i) => i.kind === kind && i.refId === refId);
}

/** Case-insensitive search across labels and descriptions. */
export function searchLibrary(query: string): LibraryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return LIBRARY_ITEMS;
  }
  return LIBRARY_ITEMS.filter(
    (i) =>
      i.label.toLowerCase().includes(q) ||
      i.refId.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q),
  );
}
