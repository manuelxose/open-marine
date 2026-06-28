import { PATHS, type SignalKPath } from '@omi/marine-data-contract';

export type WidgetSize = 'S' | 'M' | 'L';

/** A widget on the dashboard is either a composite panel or a single instrument. */
export type WidgetKind = 'panel' | 'instrument';

export interface WidgetDefinition {
    id: string;
    title: string;
    description: string;
    size: WidgetSize;
    requiredPaths: SignalKPath[];
    category: 'navigation' | 'environment' | 'electrical' | 'system' | 'engine' | 'autopilot';
}

export interface WidgetConfig {
    /**
     * Unique placement id. For panels this equals the panel definition id
     * (one instance each); for instruments it is a generated unique id so the
     * same instrument can be placed more than once.
     */
    id: string;
    kind: WidgetKind;
    /** Panel definition id (WIDGET_DEFINITIONS) or instrument catalog id. */
    refId: string;
    size: WidgetSize;
    visible: boolean;
    order: number;
}

export interface DashboardLayout {
    widgets: WidgetConfig[];
}

/** Build a unique placement id for an instrument widget (allows duplicates). */
export function makeInstrumentWidgetId(refId: string): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `inst-${refId}-${rand}`;
}

// Available widget definitions
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
    {
        id: 'navigation-card',
        title: 'dashboard.panels.navigation',
        description: 'settings.widgets.desc.navigation',
        size: 'L',
        requiredPaths: [
            PATHS.navigation.speedOverGround,
            PATHS.navigation.courseOverGroundTrue,
            PATHS.navigation.headingTrue,
            PATHS.navigation.position
        ],
        category: 'navigation'
    },
    {
        id: 'wind-card',
        title: 'dashboard.panels.wind',
        description: 'settings.widgets.desc.wind',
        size: 'L',
        requiredPaths: [
            PATHS.environment.wind.speedApparent,
            PATHS.environment.wind.angleApparent
        ],
        category: 'environment'
    },
    {
        id: 'depth-card',
        title: 'dashboard.panels.depth',
        description: 'settings.widgets.desc.depth',
        size: 'M',
        requiredPaths: [PATHS.environment.depth.belowTransducer],
        category: 'environment'
    },
    {
        id: 'power-card',
        title: 'dashboard.panels.power',
        description: 'settings.widgets.desc.power',
        size: 'M',
        requiredPaths: [
            PATHS.electrical.batteries.house.voltage,
            PATHS.electrical.batteries.house.current
        ],
        category: 'electrical'
    },
    {
        id: 'system-card',
        title: 'dashboard.panels.system',
        description: 'settings.widgets.desc.system',
        size: 'S',
        requiredPaths: [],
        category: 'system'
    },
    {
        id: 'engine-card',
        title: 'dashboard.panels.engine',
        description: 'settings.widgets.desc.engine',
        size: 'M',
        requiredPaths: [
            PATHS.propulsion?.main?.revolutions ?? 'propulsion.main.revolutions',
            PATHS.propulsion?.main?.temperature ?? 'propulsion.main.temperature',
        ],
        category: 'engine'
    },
    {
        id: 'environment-card',
        title: 'dashboard.panels.environment',
        description: 'settings.widgets.desc.environment',
        size: 'M',
        requiredPaths: [
            PATHS.environment?.water?.temperature ?? 'environment.water.temperature',
            PATHS.environment?.outside?.temperature ?? 'environment.outside.temperature',
            PATHS.environment?.outside?.pressure ?? 'environment.outside.pressure',
        ],
        category: 'environment'
    },
    {
        id: 'autopilot-compass',
        title: 'dashboard.panels.autopilot',
        description: 'settings.widgets.desc.autopilot_compass',
        size: 'L',
        requiredPaths: [
            PATHS.navigation.headingTrue,
            PATHS.steering?.autopilot?.state ?? ('steering.autopilot.state' as SignalKPath),
            PATHS.steering?.autopilot?.target?.headingTrue ??
                ('steering.autopilot.target.headingTrue' as SignalKPath),
        ],
        category: 'autopilot'
    },
    {
        id: 'sog-simple',
        title: 'SOG (Simple)',
        description: 'settings.widgets.desc.sog_simple',
        size: 'S',
        requiredPaths: [PATHS.navigation.speedOverGround],
        category: 'navigation'
    },
    {
        id: 'heading-simple',
        title: 'Heading (Simple)',
        description: 'settings.widgets.desc.heading_simple',
        size: 'S',
        requiredPaths: [PATHS.navigation.headingTrue],
        category: 'navigation'
    },
    {
        id: 'depth-simple',
        title: 'Depth (Simple)',
        description: 'settings.widgets.desc.depth_simple',
        size: 'S',
        requiredPaths: [PATHS.environment.depth.belowTransducer],
        category: 'environment'
    }
];

// Default layout configuration — composite panels only; instruments are added
// by the user from the widget library.
const DEFAULT_PANEL_LAYOUT: { id: string; visible: boolean }[] = [
    { id: 'navigation-card', visible: true },
    { id: 'wind-card', visible: true },
    { id: 'engine-card', visible: true },
    { id: 'depth-card', visible: true },
    { id: 'power-card', visible: true },
    { id: 'environment-card', visible: true },
    { id: 'system-card', visible: true },
    { id: 'sog-simple', visible: false },
    { id: 'heading-simple', visible: false },
    { id: 'depth-simple', visible: false }
];

export const DEFAULT_LAYOUT: DashboardLayout = {
    widgets: DEFAULT_PANEL_LAYOUT.map((entry, order) => {
        const def = WIDGET_DEFINITIONS.find((d) => d.id === entry.id);
        return {
            id: entry.id,
            kind: 'panel' as const,
            refId: entry.id,
            size: def?.size ?? 'S',
            visible: entry.visible,
            order,
        };
    })
};
