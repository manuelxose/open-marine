import type { ChartImportKind } from '../types/chart-vm';

/**
 * Normalize an arbitrary label into a safe chart id (lowercase kebab-case).
 */
export function toChartId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Validate a selected file for a given import kind. Returns an error message, or
 * null when the file is acceptable. Encrypted/commercial packages are rejected.
 */
export function validateChartFile(kind: ChartImportKind, file: File): string | null {
  const name = file.name.toLowerCase();
  if (/\.(s63|oesenc|osenc|zip)$/i.test(name)) {
    return 'Encrypted/commercial chart packages are not imported directly. Use legal MBTiles, open S-57, GeoTIFF or KAP data.';
  }
  const allowed: Record<ChartImportKind, RegExp> = {
    mbtiles: /\.mbtiles$/i,
    raster: /\.(tif|tiff|kap)$/i,
    s57: /\.000$/i,
  };
  if (!allowed[kind].test(name)) {
    return kind === 'mbtiles'
      ? 'Select a .mbtiles file.'
      : kind === 'raster'
        ? 'Select a GeoTIFF (.tif/.tiff) or KAP file.'
        : 'Select an open S-57 .000 file.';
  }
  return null;
}
