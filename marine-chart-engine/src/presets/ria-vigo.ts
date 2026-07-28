export const RIA_VIGO_PRESET = {
  id: 'ria-vigo',
  label: 'Ria de Vigo and approaches',
  bounds: [-9.05, 42.05, -8.4, 42.4] as [number, number, number, number],
  center: [-8.7207, 42.2406] as [number, number],
  minZoom: 6,
  maxZoom: 16,
  tidePortId: 29,
  offlineCore: [
    {
      id: 'ria-vigo-bathymetry',
      providerId: 'emodnet-bathymetry',
      minZoom: 6,
      maxZoom: 14,
      licenseMode: 'download-or-cache-when-permitted',
    },
    {
      id: 'ria-vigo-seamarks',
      providerId: 'openseamap',
      minZoom: 8,
      maxZoom: 16,
      licenseMode: 'import-local-extract',
    },
  ],
  onlineOnly: ['ihm-enc-p2', 'ihm-enc-p3', 'ihm-enc-p4', 'ihm-enc-p5'],
  disclaimer: 'Recreational situational awareness only. Not an ECDIS or a substitute for official charts.',
} as const;
