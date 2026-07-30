/**
 * Pure helpers for estimating the cost of an area (tile batch) download before
 * it is started, so the API/UI can warn about large jobs and enforce limits.
 */

export interface AreaEstimate {
  totalTiles: number;
  estimatedSizeMb: number;
  warning?: string;
}

// Rough average size of a 256x256 PNG sea-chart tile.
const AVG_TILE_BYTES = 15 * 1024;
// Soft threshold above which we warn the user (but still allow).
const WARN_TILE_COUNT = 10_000;

export const DEFAULT_MAX_TILES = 250_000;
export const DEFAULT_MAX_ZOOM = 19;

/**
 * Count the number of XYZ tiles covering a bbox at a single zoom level.
 */
export function tileCountForZoom(bbox: [number, number, number, number], z: number): number {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const n = 2 ** z;

  const xMin = clamp(Math.floor(((minLon + 180) / 360) * n), 0, n - 1);
  const xMax = clamp(Math.floor(((maxLon + 180) / 360) * n), 0, n - 1);
  // Latitude is inverted in the Web Mercator tile grid.
  const yTop = clamp(lonLatToTileY(maxLat, n), 0, n - 1);
  const yBottom = clamp(lonLatToTileY(minLat, n), 0, n - 1);

  const width = minLon <= maxLon
    ? xMax - xMin + 1
    : (n - xMin) + (xMax + 1);
  const height = Math.abs(yBottom - yTop) + 1;
  return width * height;
}

/**
 * Estimate total tiles and download size for a bbox across a zoom range.
 */
export function estimateAreaDownload(
  bbox: [number, number, number, number],
  minZoom: number,
  maxZoom: number,
): AreaEstimate {
  let totalTiles = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    totalTiles += tileCountForZoom(bbox, z);
  }

  const estimatedSizeMb = Math.round((totalTiles * AVG_TILE_BYTES) / (1024 * 1024));
  const estimate: AreaEstimate = { totalTiles, estimatedSizeMb };
  if (totalTiles > WARN_TILE_COUNT) {
    estimate.warning = 'Large download. Use WiFi/SSD and a wired connection if possible.';
  }
  return estimate;
}

function lonLatToTileY(lat: number, n: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
