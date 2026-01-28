import type { Translations } from './en';

export const es: Translations = {
  settings: {
    title: 'Configuración',
    subtitle: 'Personaliza tu experiencia MFD',
    sections: {
      general: 'General',
      appearance: 'Apariencia',
      units: 'Unidades',
      dashboard: 'Widgets del Dashboard',
    },
    language: {
      label: 'Idioma',
      description: 'Selecciona tu idioma preferido',
    },
    theme: {
      label: 'Tema',
      description: 'Cambiar entre modo día y noche',
    },
    compact: {
      label: 'Modo Compacto',
      description: 'Aumentar la densidad de información',
    },
    units: {
      speed: {
        label: 'Velocidad',
        description: 'Unidad para medidas de velocidad',
      },
      depth: {
        label: 'Profundidad',
        description: 'Unidad para medidas de profundidad',
      },
    },
    widgets: {
      reset: 'Restablecer diseño predeterminado',
    },
  },
  nav: {
    dashboard: 'Panel de Control',
    chart: 'Carta',
    instruments: 'Instrumentos',
    alarms: 'Alarmas',
    diagnostics: 'Diagnóstico',
    settings: 'Ajustes',
  },
  chart: {
    controls: {
      auto_center: 'Auto-centrar',
      track: 'Estela',
      vector: 'Vector',
      center_boat: 'Centrar en Barco',
      on: 'ON',
      off: 'OFF',
    },
    hud: {
      sog: 'SOG',
      cog: 'COG',
      hdg: 'Rumbo',
      depth: 'Prof',
      aws: 'AWS',
      awa: 'AWA',
      wp_brg: 'WP BRG',
      wp_dst: 'WP DIST',
      age: 'Edad',
      lat: 'Lat',
      lon: 'Lon',
    },
    view: {
      title: 'Vista de Carta',
      center: 'Centro',
      hint: 'Haga clic en la carta para añadir un waypoint.',
    },
    waypoints: {
      title: 'Waypoints',
      active: 'Activo',
      select: 'Seleccionar',
      delete: 'Eliminar',
      empty: 'Sin waypoints',
      clear_active: 'Limpiar Activo',
    },
  },
  instruments: {
    page: {
      title: 'Instrumentos',
      subtitle: 'Todos los datos de instrumentación disponibles',
    },
  },
  alarms: {
    page: {
      title: 'Alarmas',
      active: 'Alarma activa',
      no_active: 'Sin alarmas activas',
    },
  },
  diagnostics: {
    page: {
      search_placeholder: 'Filtrar rutas...',
      stats: {
        showing: 'Mostrando',
        of: 'de',
        points: 'puntos',
      },
      table: {
        path: 'Ruta',
        value: 'Valor',
        age: 'Edad',
        source: 'Fuente',
      },
    },
  },
  dashboard: {
    panels: {
      navigation: 'Navegación',
      wind: 'Viento',
      depth: 'Profundidad',
      power: 'Energía',
      system: 'Sistema',
    },
    metrics: {
      sog: 'SOG',
      cog: 'COG',
      hdg: 'Rumbo',
      depth: 'Prof.',
      aws: 'AWS',
      awa: 'AWA',
      tws: 'TWS',
      twa: 'TWA',
      batt: 'Bat.',
      voltage: 'Voltaje',
      current: 'Corriente',
      power: 'Potencia',
      gw_temp: 'Temp GW',
      uptime: 'T. Activo',
      heap: 'Memoria',
    },
    status: {
      fix: 'FIJO',
      nofix: 'SIN SEÑAL',
      stale: 'ANTIGUO',
      offline: 'Desconectado',
      disconnected: 'Sin Conexión',
      waiting: 'Esperando datos',
      streaming: 'En línea',
      error: 'Error del Sistema',
    },
    system: {
      updates_processed: 'Actualizaciones procesadas',
      last_update: 'Última actualización',
    },
  },
};
