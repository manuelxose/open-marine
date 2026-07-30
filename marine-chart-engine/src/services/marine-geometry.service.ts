import fs from 'node:fs';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import polygonClipping from 'polygon-clipping';
import { feature as topojsonFeature } from 'topojson-client';
import type { ChartRegistryService } from './chart-registry.service.js';
import { parseAreaPolygon, pointInArea, type AreaPolygon } from './geojson-area-filter.js';

export type MarineGeometryBounds = [west: number, south: number, east: number, north: number];
type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface IndexedFeatureRow {
  id: number;
  object_class: string;
  layer: string;
  geometry_json: string;
  properties_json: string;
}

export interface MarineMaskResult {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'MultiPolygon'; coordinates: MultiPolygon };
    properties: {
      featureType: 'marineMask';
      source: 'enc' | 'official-coast' | 'global-fallback';
      coverage: 'available' | 'fallback' | 'unavailable';
      precision: 'enc-vector' | 'coastal-fallback';
      fallbackUsed: boolean;
    };
  }>;
  properties: {
    source: 'enc' | 'official-coast' | 'global-fallback';
    coverage: 'available' | 'fallback' | 'unavailable';
    chartIds: string[];
    precision: 'enc-vector' | 'coastal-fallback';
    fallbackUsed: boolean;
    advisoryOnly: true;
  };
}

export interface DepthOverlayResult {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: Record<string, unknown>;
    properties: Record<string, unknown>;
  }>;
  properties: {
    coverage: 'available' | 'unavailable';
    chartIds: string[];
    safetyDepthM: number;
    advisoryOnly: true;
  };
}

export interface ClippedMarineCell {
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
  anchor: Position;
  waterFraction: number;
}

export class MarineGeometryService {
  private readonly maskCache = new Map<string, MarineMaskResult>();
  private globalLand: MultiPolygon | null = null;

  constructor(
    private readonly registry: ChartRegistryService,
    private readonly fallbackMaskPath: string,
  ) {}

  marineMask(
    bounds: MarineGeometryBounds,
    areaValue: unknown,
    requestedChartIds: string[],
  ): MarineMaskResult {
    validateBounds(bounds);
    const area = parseAreaPolygon(areaValue);
    const chartIds = this.resolveVectorChartIds(requestedChartIds);
    const cacheKey = JSON.stringify([bounds, area, chartIds, this.indexVersions(chartIds)]);
    const cached = this.maskCache.get(cacheKey);
    if (cached) return cached;

    const depthAreas = this.readIndexedGeometries(chartIds, bounds, ['depth_areas']);
    const landAreas = this.readIndexedGeometries(chartIds, bounds, ['land']);
    let coordinates: MultiPolygon = [];
    let source: MarineMaskResult['properties']['source'] = 'global-fallback';
    let coverage: MarineMaskResult['properties']['coverage'] = 'unavailable';
    let precision: MarineMaskResult['properties']['precision'] = 'coastal-fallback';
    let usedChartIds: string[] = [];
    let fallbackUsed = false;

    if (depthAreas.length > 0) {
      coordinates = unionAll(depthAreas);
      if (landAreas.length > 0 && coordinates.length > 0) {
        coordinates = polygonClipping.difference(coordinates, unionAll(landAreas)) as MultiPolygon;
      }
      source = 'enc';
      coverage = 'available';
      precision = 'enc-vector';
      usedChartIds = chartIds;
      const fallback = this.fallbackWaterMask(bounds, area);
      if (fallback.coordinates.length > 0) {
        const encCoverage = this.readIndexedGeometries(chartIds, bounds, ['coverage']);
        const covered = encCoverage.length > 0 ? unionAll(encCoverage) : unionAll(depthAreas);
        const outsideEnc = polygonClipping.difference(fallback.coordinates, covered) as MultiPolygon;
        if (outsideEnc.length > 0) {
          coordinates = polygonClipping.union(coordinates, outsideEnc) as MultiPolygon;
          fallbackUsed = true;
        }
      }
    } else {
      const fallback = this.fallbackWaterMask(bounds, area);
      coordinates = fallback.coordinates;
      source = fallback.source;
      coverage = coordinates.length > 0 ? 'fallback' : 'unavailable';
      fallbackUsed = coordinates.length > 0;
    }

    if (source === 'enc') coordinates = intersectMask(coordinates, bounds, area);
    const result: MarineMaskResult = {
      type: 'FeatureCollection',
      features: coordinates.length > 0
        ? [{
            type: 'Feature',
            geometry: { type: 'MultiPolygon', coordinates },
            properties: { featureType: 'marineMask', source, coverage, precision, fallbackUsed },
          }]
        : [],
      properties: {
        source,
        coverage,
        chartIds: usedChartIds,
        precision,
        fallbackUsed,
        advisoryOnly: true,
      },
    };
    if (this.maskCache.size >= 64) this.maskCache.delete(this.maskCache.keys().next().value ?? '');
    this.maskCache.set(cacheKey, result);
    return result;
  }

  depthOverlay(
    bounds: MarineGeometryBounds,
    areaValue: unknown,
    requestedChartIds: string[],
    safetyDepthM: number,
    zoom: number,
    requestedLayers: string[] = ['depth_areas', 'depth_contours', 'soundings', 'hazards'],
  ): DepthOverlayResult {
    validateBounds(bounds);
    if (!Number.isFinite(safetyDepthM) || safetyDepthM < 0.5 || safetyDepthM > 100) {
      throw new Error('safetyDepthM must be between 0.5 and 100 metres');
    }
    const area = parseAreaPolygon(areaValue);
    const chartIds = this.resolveVectorChartIds(requestedChartIds);
    const effectiveMask = this.marineMask(bounds, areaValue, chartIds);
    const effectiveMaskCoordinates = effectiveMask.features[0]?.geometry.coordinates ?? [];
    const allowedLayers = requestedLayers.filter((layer) =>
      ['depth_areas', 'depth_contours', 'soundings', 'hazards'].includes(layer));
    const qualityFeatures = this.readIndexedRows(chartIds, bounds, ['data_quality']).map(({ row }) => ({
      geometry: JSON.parse(row.geometry_json) as Record<string, unknown>,
      properties: JSON.parse(row.properties_json) as Record<string, unknown>,
    }));
    const features = this.readIndexedRows(
      chartIds,
      bounds,
      allowedLayers,
    ).flatMap(({ chartId, row }) => {
      let geometry = JSON.parse(row.geometry_json) as Record<string, unknown>;
      const properties = JSON.parse(row.properties_json) as Record<string, unknown>;
      const quality = qualityFeatures.find((candidate) =>
        geometriesIntersect(geometry, candidate.geometry))?.properties;
      if (quality) {
        for (const key of ['catzoc', 'inform', 'sordat', 'sorind', 'sursta', 'surend']) {
          if (properties[key] === undefined && quality[key] !== undefined) properties[key] = quality[key];
        }
      }
      if (area && !geometryIntersectsArea(geometry, area)) return [];
      if (row.layer === 'depth_areas' && effectiveMaskCoordinates.length > 0) {
        const polygons = geometryToMultiPolygon(geometry);
        if (polygons.length === 0) return [];
        const clipped = polygonClipping.intersection(
          unionAll(polygons),
          effectiveMaskCoordinates,
        ) as MultiPolygon;
        if (clipped.length === 0) return [];
        geometry = clipped.length === 1
          ? { type: 'Polygon', coordinates: clipped[0] }
          : { type: 'MultiPolygon', coordinates: clipped };
      }
      const scamin = finiteNumber(properties['scamin']);
      if (scamin !== null && Number.isFinite(zoom) && nominalScale(zoom, (bounds[1] + bounds[3]) / 2) > scamin) {
        return [];
      }
      const featureType = row.layer === 'depth_areas'
        ? 'depthArea'
        : row.layer === 'depth_contours'
          ? 'depthContour'
          : row.layer === 'soundings'
            ? 'sounding'
            : 'hazard';
      const shallowestDepth = firstFinite(properties, ['drval1', 'depth', 'valsou', 'valdco']);
      return [{
        type: 'Feature' as const,
        id: `${chartId}:${row.id}`,
        geometry,
        properties: {
          ...properties,
          featureType,
          chartId,
          unsafe: shallowestDepth !== null && shallowestDepth <= safetyDepthM,
          shallowestDepth,
          deepestDepth: firstFinite(properties, ['drval2']),
          contourDepth: firstFinite(properties, ['valdco']),
          soundingDepth: firstFinite(properties, ['depth', 'valsou']),
        },
      }];
    });
    const evaluatedChartIds = [...new Set(features.map((feature) => String(feature.properties['chartId'])))];
    return {
      type: 'FeatureCollection',
      features,
      properties: {
        coverage: effectiveMask.properties.source === 'enc' ? 'available' : 'unavailable',
        chartIds: evaluatedChartIds,
        safetyDepthM,
        advisoryOnly: true,
      },
    };
  }

  filterPointsToMask<T extends {
    geometry: { type: string; coordinates: [number, number] };
  }>(
    features: T[],
    mask: MarineMaskResult,
  ): T[] {
    const coordinates = mask.features[0]?.geometry.coordinates ?? [];
    if (coordinates.length === 0) return [];
    return features.filter((feature) =>
      feature.geometry.type === 'Point'
      && coordinates.some((polygon) =>
        pointInArea(feature.geometry.coordinates[0], feature.geometry.coordinates[1], {
          type: 'Polygon',
          coordinates: polygon,
        })));
  }

  clipFeaturesToMask<T extends {
    geometry: { type: string; coordinates: unknown };
  }>(
    features: T[],
    mask: MarineMaskResult,
  ): T[] {
    const maskCoordinates = mask.features[0]?.geometry.coordinates ?? [];
    if (maskCoordinates.length === 0) return [];
    return features.flatMap((feature): T[] => {
      if (feature.geometry.type === 'Point' && isPosition(feature.geometry.coordinates)) {
        return pointInMultiPolygon(feature.geometry.coordinates, maskCoordinates) ? [feature] : [];
      }
      const polygons = geometryToMultiPolygon(feature.geometry as Record<string, unknown>);
      if (polygons.length > 0) {
        const clipped = polygonClipping.intersection(unionAll(polygons), maskCoordinates) as MultiPolygon;
        if (clipped.length === 0) return [];
        return [{
          ...feature,
          geometry: clipped.length === 1
            ? { type: 'Polygon', coordinates: clipped[0] }
            : { type: 'MultiPolygon', coordinates: clipped },
        } as T];
      }
      return flattenPositions(feature.geometry.coordinates)
        .some((position) => pointInMultiPolygon(position, maskCoordinates))
        ? [feature]
        : [];
    });
  }

  clipCellToMask(ring: Ring, mask: MarineMaskResult): ClippedMarineCell | null {
    const maskCoordinates = mask.features[0]?.geometry.coordinates ?? [];
    if (maskCoordinates.length === 0) return null;
    const clipped = polygonClipping.intersection([[ring]], maskCoordinates) as MultiPolygon;
    if (clipped.length === 0) return null;
    const sourceArea = Math.max(Number.EPSILON, Math.abs(ringArea(ring)));
    const waterArea = clipped.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
    const largest = clipped.reduce((best, polygon) =>
      polygonArea(polygon) > polygonArea(best) ? polygon : best, clipped[0]!);
    const anchor = visualCenter(largest);
    return {
      geometry: clipped.length === 1
        ? { type: 'Polygon', coordinates: clipped[0]! }
        : { type: 'MultiPolygon', coordinates: clipped },
      anchor,
      waterFraction: Math.min(1, waterArea / sourceArea),
    };
  }

  private resolveVectorChartIds(requested: string[]): string[] {
    const available = this.registry.list()
      .filter((chart) => chart.kind === 'vector' && chart.available)
      .map((chart) => chart.id);
    return requested.length > 0
      ? requested.filter((chartId) => available.includes(chartId))
      : available;
  }

  private readIndexedGeometries(
    chartIds: string[],
    bounds: MarineGeometryBounds,
    layers: string[],
  ): MultiPolygon[] {
    return this.readIndexedRows(chartIds, bounds, layers).flatMap(({ row }) => {
      const geometry = JSON.parse(row.geometry_json) as Record<string, unknown>;
      return geometryToMultiPolygon(geometry);
    });
  }

  private readIndexedRows(
    chartIds: string[],
    bounds: MarineGeometryBounds,
    layers: string[],
  ): Array<{ chartId: string; row: IndexedFeatureRow }> {
    const rows: Array<{ chartId: string; row: IndexedFeatureRow }> = [];
    for (const chartId of chartIds) {
      const indexFile = this.indexPath(chartId);
      if (!indexFile) continue;
      const database = new Database(indexFile, { readonly: true, fileMustExist: true });
      try {
        const placeholders = layers.map(() => '?').join(',');
        const found = database.prepare(`
          SELECT f.id, f.object_class, f.layer, f.geometry_json, f.properties_json
          FROM enc_features f
          JOIN enc_features_rtree r ON r.id = f.id
          WHERE r.max_lon >= ? AND r.min_lon <= ? AND r.max_lat >= ? AND r.min_lat <= ?
            AND f.layer IN (${placeholders})
          LIMIT 10000
        `).all(bounds[0], bounds[2], bounds[1], bounds[3], ...layers) as IndexedFeatureRow[];
        rows.push(...found.map((row) => ({ chartId, row })));
      } finally {
        database.close();
      }
    }
    return rows;
  }

  private indexPath(chartId: string): string | null {
    const mbtiles = this.registry.mbtilesPath(chartId);
    const candidate = mbtiles ? `${mbtiles}.enc-index.sqlite` : null;
    return candidate && fs.existsSync(candidate) ? candidate : null;
  }

  private indexVersions(chartIds: string[]): Array<[string, number]> {
    return chartIds.flatMap((chartId): Array<[string, number]> => {
      const file = this.indexPath(chartId);
      return file ? [[chartId, fs.statSync(file).mtimeMs]] : [];
    });
  }

  private readFallbackMask(): MultiPolygon {
    try {
      const collection = JSON.parse(fs.readFileSync(this.fallbackMaskPath, 'utf8')) as {
        features?: Array<{ geometry?: Record<string, unknown> | null }>;
      };
      return unionAll((collection.features ?? []).flatMap((feature) =>
        feature.geometry ? geometryToMultiPolygon(feature.geometry) : []));
    } catch {
      return [];
    }
  }

  private fallbackWaterMask(
    bounds: MarineGeometryBounds,
    area: AreaPolygon | null,
  ): { coordinates: MultiPolygon; source: 'official-coast' | 'global-fallback' } {
    const localCoordinates = intersectMask(this.readFallbackMask(), bounds, area);
    return localCoordinates.length > 0
      ? { coordinates: localCoordinates, source: 'official-coast' }
      : { coordinates: this.globalWaterMask(bounds, area), source: 'global-fallback' };
  }

  private globalWaterMask(bounds: MarineGeometryBounds, area: AreaPolygon | null): MultiPolygon {
    const selection: MultiPolygon = area
      ? [area.coordinates as Ring[]]
      : [[[
          [bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[2], bounds[3]],
          [bounds[0], bounds[3]], [bounds[0], bounds[1]],
        ]]];
    const clippedSelection = polygonClipping.intersection(selection, [[[
      [bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[2], bounds[3]],
      [bounds[0], bounds[3]], [bounds[0], bounds[1]],
    ]]]) as MultiPolygon;
    if (clippedSelection.length === 0) return [];
    const land = intersectMask(this.readGlobalLand(), bounds, null);
    return land.length > 0
      ? polygonClipping.difference(clippedSelection, land) as MultiPolygon
      : clippedSelection;
  }

  private readGlobalLand(): MultiPolygon {
    if (this.globalLand) return this.globalLand;
    try {
      const require = createRequire(import.meta.url);
      const topology = JSON.parse(
        fs.readFileSync(require.resolve('world-atlas/land-50m.json'), 'utf8'),
      ) as any;
      const landObject = topology.objects?.land;
      const geojson = topojsonFeature(topology, landObject) as unknown as {
        type: 'Feature' | 'FeatureCollection';
        geometry?: Record<string, unknown>;
        features?: Array<{ geometry?: Record<string, unknown> | null }>;
      };
      const geometries = geojson.type === 'FeatureCollection'
        ? (geojson.features ?? []).flatMap((item) =>
            item.geometry ? geometryToMultiPolygon(item.geometry) : [])
        : geojson.geometry
          ? geometryToMultiPolygon(geojson.geometry)
          : [];
      this.globalLand = unionAll(geometries);
    } catch {
      this.globalLand = [];
    }
    return this.globalLand;
  }
}

const unionAll = (geometries: MultiPolygon[]): MultiPolygon => {
  if (geometries.length === 0) return [];
  return geometries.slice(1).reduce(
    (merged, geometry) => polygonClipping.union(merged, geometry) as MultiPolygon,
    geometries[0]!,
  );
};

const intersectMask = (
  mask: MultiPolygon,
  bounds: MarineGeometryBounds,
  area: AreaPolygon | null,
): MultiPolygon => {
  if (mask.length === 0) return [];
  const bbox: MultiPolygon = [[[
    [bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[2], bounds[3]],
    [bounds[0], bounds[3]], [bounds[0], bounds[1]],
  ]]];
  let clipped = polygonClipping.intersection(mask, bbox) as MultiPolygon;
  if (area && clipped.length > 0) {
    clipped = polygonClipping.intersection(clipped, [area.coordinates as Ring[]]) as MultiPolygon;
  }
  return clipped;
};

const geometryToMultiPolygon = (geometry: Record<string, unknown>): MultiPolygon[] => {
  if (geometry['type'] === 'Polygon' && Array.isArray(geometry['coordinates'])) {
    return [[geometry['coordinates'] as Polygon]];
  }
  if (geometry['type'] === 'MultiPolygon' && Array.isArray(geometry['coordinates'])) {
    return [geometry['coordinates'] as MultiPolygon];
  }
  return [];
};

const validateBounds = (bounds: MarineGeometryBounds): void => {
  const [west, south, east, north] = bounds;
  if (![west, south, east, north].every(Number.isFinite)
    || west < -180 || east > 180 || south < -90 || north > 90
    || west >= east || south >= north || east - west > 12 || north - south > 12) {
    throw new Error('bbox must be ordered WGS84 west,south,east,north and at most 12 degrees per axis');
  }
};

const geometryIntersectsArea = (geometry: Record<string, unknown>, area: AreaPolygon): boolean =>
  flattenPositions(geometry['coordinates']).some(([longitude, latitude]) =>
    pointInArea(longitude, latitude, area))
  || area.coordinates[0]!.some(([longitude, latitude]) =>
    geometryToMultiPolygon(geometry).some((multiPolygon) =>
      multiPolygon.some((polygon) => pointInArea(longitude!, latitude!, {
        type: 'Polygon',
        coordinates: polygon,
      }))));

const geometriesIntersect = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean => {
  const rightPolygons = geometryToMultiPolygon(right);
  if (rightPolygons.some((multiPolygon) =>
    flattenPositions(left['coordinates']).some(([longitude, latitude]) =>
      multiPolygon.some((polygon) =>
        pointInArea(longitude, latitude, { type: 'Polygon', coordinates: polygon }))))) {
    return true;
  }
  const leftPolygons = geometryToMultiPolygon(left);
  return leftPolygons.some((multiPolygon) =>
    flattenPositions(right['coordinates']).some(([longitude, latitude]) =>
      multiPolygon.some((polygon) =>
        pointInArea(longitude, latitude, { type: 'Polygon', coordinates: polygon }))));
};

const flattenPositions = (value: unknown): Position[] => {
  if (!Array.isArray(value)) return [];
  if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    return [[Number(value[0]), Number(value[1])]];
  }
  return value.flatMap(flattenPositions);
};

const finiteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const firstFinite = (properties: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = finiteNumber(properties[key]);
    if (value !== null) return value;
  }
  return null;
};

const nominalScale = (zoom: number, latitude: number): number =>
  559_082_264.028 * Math.cos(latitude * Math.PI / 180) / 2 ** zoom;

const ringArea = (ring: Ring): number =>
  ring.slice(1).reduce((sum, point, index) =>
    sum + ring[index]![0] * point[1] - point[0] * ring[index]![1], 0) / 2;

const polygonArea = (polygon: Polygon): number =>
  Math.max(0, Math.abs(ringArea(polygon[0] ?? []))
    - polygon.slice(1).reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0));

const visualCenter = (polygon: Polygon): Position => {
  const outer = polygon[0] ?? [];
  if (outer.length === 0) return [0, 0];
  const west = Math.min(...outer.map((point) => point[0]));
  const east = Math.max(...outer.map((point) => point[0]));
  const south = Math.min(...outer.map((point) => point[1]));
  const north = Math.max(...outer.map((point) => point[1]));
  let best: Position = outer[0]!;
  let bestClearance = -1;
  for (let row = 0; row <= 10; row++) {
    for (let column = 0; column <= 10; column++) {
      const candidate: Position = [
        west + (east - west) * column / 10,
        south + (north - south) * row / 10,
      ];
      if (!pointInArea(candidate[0], candidate[1], { type: 'Polygon', coordinates: polygon })) continue;
      const clearance = polygon.flatMap((ring) => ring.slice(1).map((point, index) =>
        pointSegmentDistance(candidate, ring[index]!, point))).reduce(
          (minimum, distance) => Math.min(minimum, distance),
          Number.POSITIVE_INFINITY,
        );
      if (clearance > bestClearance) {
        best = candidate;
        bestClearance = clearance;
      }
    }
  }
  return best;
};

const pointSegmentDistance = (point: Position, start: Position, end: Position): number => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1,
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
};

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) && Number.isFinite(value[0]) && Number.isFinite(value[1]);

const pointInMultiPolygon = (position: Position, coordinates: MultiPolygon): boolean =>
  coordinates.some((polygon) =>
    pointInArea(position[0], position[1], { type: 'Polygon', coordinates: polygon }));

export const parseMarineBounds = (value: unknown): MarineGeometryBounds => {
  if (typeof value !== 'string') throw new Error('bbox is required');
  const values = value.split(',').map(Number);
  if (values.length !== 4) throw new Error('bbox must contain west,south,east,north');
  const bounds = values as MarineGeometryBounds;
  validateBounds(bounds);
  return bounds;
};

export const parseChartIds = (value: unknown): string[] =>
  typeof value === 'string'
    ? value.split(',').map((item) => item.trim()).filter((item) => /^[a-z0-9][a-z0-9-]{1,62}$/.test(item))
    : [];
