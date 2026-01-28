import { PATHS, type SignalKPath } from '@omi/marine-data-contract';

export type WidgetSize = 'S' | 'M' | 'L';

export interface WidgetDefinition {
    id: string;
    title: string;
    description: string;
    size: WidgetSize;
    requiredPaths: SignalKPath[];
    category: 'navigation' | 'environment' | 'electrical' | 'system';
}

export interface WidgetConfig {
    id: string;
    visible: boolean;
    order: number;
}

export interface DashboardLayout {
    widgets: WidgetConfig[];
}

// Available widget definitions
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
    {
        id: 'navigation-card',
        title: 'Navigation',
        description: 'SOG, COG, HDG, Position with trend',
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
        title: 'Wind',
        description: 'Apparent wind speed and angle',
        size: 'L',
        requiredPaths: [
            PATHS.environment.wind.speedApparent,
            PATHS.environment.wind.angleApparent
        ],
        category: 'environment'
    },
    {
        id: 'depth-card',
        title: 'Depth',
        description: 'Depth below transducer with trend',
        size: 'M',
        requiredPaths: [PATHS.environment.depth.belowTransducer],
        category: 'environment'
    },
    {
        id: 'power-card',
        title: 'Power',
        description: 'Battery voltage and current',
        size: 'M',
        requiredPaths: [
            PATHS.electrical.batteries.house.voltage,
            PATHS.electrical.batteries.house.current
        ],
        category: 'electrical'
    },
    {
        id: 'diagnostics-summary',
        title: 'System',
        description: 'Connection status and diagnostics',
        size: 'S',
        requiredPaths: [],
        category: 'system'
    },
    {
        id: 'sog-simple',
        title: 'SOG (Simple)',
        description: 'Speed over ground - compact',
        size: 'S',
        requiredPaths: [PATHS.navigation.speedOverGround],
        category: 'navigation'
    },
    {
        id: 'heading-simple',
        title: 'Heading (Simple)',
        description: 'True heading - compact',
        size: 'S',
        requiredPaths: [PATHS.navigation.headingTrue],
        category: 'navigation'
    },
    {
        id: 'depth-simple',
        title: 'Depth (Simple)',
        description: 'Depth - compact',
        size: 'S',
        requiredPaths: [PATHS.environment.depth.belowTransducer],
        category: 'environment'
    }
];

// Default layout configuration
export const DEFAULT_LAYOUT: DashboardLayout = {
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
