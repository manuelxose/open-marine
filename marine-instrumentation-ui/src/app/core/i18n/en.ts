export const en = {
  settings: {
    title: 'Settings',
    subtitle: 'Customize your MFD experience',
    sections: {
      general: 'General',
      appearance: 'Appearance',
      units: 'Units',
      dashboard: 'Dashboard Widgets',
    },
    language: {
      label: 'Language',
      description: 'Select your preferred language',
    },
    theme: {
      label: 'Theme',
      description: 'Switch between day and night mode',
    },
    compact: {
      label: 'Compact Mode',
      description: 'Increase information density',
    },
    units: {
      speed: {
        label: 'Speed',
        description: 'Display unit for speed measurements',
      },
      depth: {
        label: 'Depth',
        description: 'Display unit for depth measurements',
      },
    },
    widgets: {
      reset: 'Reset to Default Layout',
    },
    nav: {
      dashboard: 'Dashboard',
      chart: 'Chart',
      instruments: 'Instruments',
      alarms: 'Alarms',
      diagnostics: 'Diagnostics',
      settings: 'Settings',
    },
    chart: {
      controls: {
        auto_center: 'Auto-center',
        track: 'Track',
        vector: 'Vector',
        center_boat: 'Center on Boat',
        on: 'ON',
        off: 'OFF',
      },
      hud: {
        sog: 'SOG',
        cog: 'COG',
        hdg: 'HDG',
        depth: 'Depth',
        aws: 'AWS',
        awa: 'AWA',
        wp_brg: 'WP BRG',
        wp_dst: 'WP DST',
        age: 'Age',
        lat: 'Lat',
        lon: 'Lon',
      },
    },
    instruments: {
      page: {
        title: 'Instruments',
        subtitle: 'All available instrumentation data',
      },
    },
    alarms: {
      page: {
        title: 'Alarms',
        active: 'Active alarm',
        no_active: 'No active alarms',
      },
    },
    diagnostics: {
      page: {
        search_placeholder: 'Filter paths...',
        stats: {
          showing: 'Showing',
          of: 'of',
          points: 'points',
        },
        table: {
          path: 'Path',
          value: 'Value',
          age: 'Age',
          source: 'Source',
        },
      },
    },
    dashboard: {
      panels: {
        navigation: 'Navigation',
        wind: 'Wind',
        depth: 'Depth',
        power: 'Power',
        system: 'System',
      },
      metrics: {
        sog: 'SOG',
        cog: 'COG',
        hdg: 'HDG',
        depth: 'Depth',
        aws: 'AWS',
        awa: 'AWA',
        tws: 'TWS',
        twa: 'TWA',
        batt: 'Batt',
        voltage: 'Voltage',
        current: 'Current',
        power: 'Power',
        gw_temp: 'GW Temp',
        uptime: 'Uptime',
        heap: 'Heap',
      },
      status: {
        fix: 'FIX',
        nofix: 'NO FIX',
        stale: 'STALE',
        offline: 'Offline',
        disconnected: 'Disconnected',
        waiting: 'Waiting for data',
        streaming: 'Streaming',
        error: 'System Error',
      },
      system: {
        updates_processed: 'Updates processed',
        last_update: 'Last update',
      },
    },
  },
};

export type Translations = typeof en;
