import { effect } from '@angular/core';

/**
 * Coalesced Map Update Effect
 *
 * Replaces ~40 individual effects with a single coalesced effect that reads
 * all navigation data signals and batches updates to the map engine.
 *
 * Usage in chart.page.ts constructor:
 * ```typescript
 * constructor() {
 *   // ... existing code ...
 *
 *   // Replace all individual effects with:
 *   this.setupCoalescedMapEffects();
 * }
 * ```
 */

/**
 * Creates a single coalesced effect that batches all map updates.
 * This reduces Angular's effect scheduling overhead from ~40 RAF callbacks to 1.
 */
export function createCoalescedMapEffect(
  // Signal readers
  signals: {
    playbackVesselSignal: () => any;
    vesselSignal: () => any;
    trackSignal: () => any;
    vectorSignal: () => any;
    headingLineSignal: () => any;
    autopilotTargetSignal: () => any;
    laylinesSignal: () => any;
    trueWindSignal: () => any;
    apparentWindSignal: () => any;
    waypointsSignal: () => any;
    routeSignal: () => any;
    savedTracksSignal: () => any;
    benchRouteSignal: () => any;
    centerSignal: () => any;
    rangeRingsSignal: () => any;
    bearingLineSignal: () => any;
    aisTargetsSignal: () => any;
    aisTracksSignal: () => any;
    aisPredictionsSignal: () => any;
    cpaLinesSignal: () => any;
    measurementStateSignal: () => any;
    anchorWatchState: () => any;
    ownPositionSignal: () => any;
  },
  // Engine methods
  engine: {
    updateVesselPosition: (lngLat: [number, number] | null, rotationDeg: number | null, state: 'fix' | 'stale' | 'no-fix') => void;
    updateTrack: (coords: [number, number][] | any) => void;
    updateVector: (coords: [number, number][], visible: boolean, label?: { cogDeg: number; sogKnots: number }, timeTicks?: { label: string; coords: [number, number] }[]) => void;
    updateHeadingLine: (coords: [number, number][], visible: boolean, headingDeg: number | null) => void;
    updateAutopilotTarget: (coords: [number, number][], visible: boolean) => void;
    updateLaylines: (lines: any[], visible: boolean) => void;
    updateTrueWind: (wind: any) => void;
    updateApparentWind: (wind: any) => void;
    updateWaypoints: (waypoints: any) => void;
    updateRoute: (route: any) => void;
    updateSavedTracks: (tracks: any) => void;
    updateBenchRoute: (line: any, points: any) => void;
    updateView: (center: [number, number] | null) => void;
    updateRangeRings: (center: [number, number], intervals: number[]) => void;
    clearRangeRings: () => void;
    updateBearingLine: (coords: [number, number][], visible: boolean) => void;
    updateAisTargets: (targets: any) => void;
    updateAisTracks: (tracks: any) => void;
    updateAisPredictions: (predictions: any) => void;
    updateCpaLines: (lines: any) => void;
    updateMeasurement: (pointA: [number, number] | null, pointB: [number, number] | null, bearingDeg: number | null, distanceNm: number | null) => void;
    clearMeasurement: () => void;
    updateAnchorWatch: (anchorPosition: [number, number], radiusMeters: number, alarmActive: boolean) => void;
    clearAnchorWatch: () => void;
  },
  // Zone runner
  runOutsideAngular: (fn: () => void) => void,
  // Anchor watch service (optional)
  anchorWatchService?: {
    updateVesselPosition: (lon: number, lat: number) => void;
  }
): void {
  // Previous values for equality checking
  let prevVessel: any = null;
  let prevTrack: any = null;
  let prevVector: any = null;
  let prevHeadingLine: any = null;
  let prevApTarget: any = null;
  let prevLaylines: any = null;
  let prevTrueWind: any = null;
  let prevApparentWind: any = null;
  let prevWaypoints: any = null;
  let prevRoute: any = null;
  let prevSavedTracks: any = null;
  let prevBenchRoute: any = null;
  let prevCenter: any = null;
  let prevRangeRings: any = null;
  let prevBearingLine: any = null;
  let prevAisTargets: any = null;
  let prevAisTracks: any = null;
  let prevAisPredictions: any = null;
  let prevCpaLines: any = null;
  let prevMeasurement: any = null;
  let prevAnchorWatch: any = null;

  effect(() => {
    // Read all signals in a single effect
    const vessel = signals.playbackVesselSignal() ?? signals.vesselSignal();
    const track = signals.trackSignal();
    const vector = signals.vectorSignal();
    const headingLine = signals.headingLineSignal();
    const apTarget = signals.autopilotTargetSignal();
    const laylines = signals.laylinesSignal();
    const trueWind = signals.trueWindSignal();
    const apparentWind = signals.apparentWindSignal();
    const waypoints = signals.waypointsSignal();
    const route = signals.routeSignal();
    const savedTracks = signals.savedTracksSignal();
    const benchRoute = signals.benchRouteSignal();
    const center = signals.centerSignal();
    const rangeRings = signals.rangeRingsSignal();
    const bearingLine = signals.bearingLineSignal();
    const aisTargets = signals.aisTargetsSignal();
    const aisTracks = signals.aisTracksSignal();
    const aisPredictions = signals.aisPredictionsSignal();
    const cpaLines = signals.cpaLinesSignal();
    const measurement = signals.measurementStateSignal();
    const anchorWatch = signals.anchorWatchState();
    const ownPosition = signals.ownPositionSignal();

    // Run all updates outside Angular in a single batch
    runOutsideAngular(() => {
      // Vessel (high frequency)
      if (vessel && !isEqual(vessel, prevVessel)) {
        prevVessel = vessel;
        engine.updateVesselPosition(vessel.lngLat, vessel.rotationDeg, vessel.state);
      }

      // Track
      if (!isEqual(track, prevTrack)) {
        prevTrack = track;
        engine.updateTrack(track);
      }

      // Vector
      if (!isEqual(vector, prevVector)) {
        prevVector = vector;
        engine.updateVector(vector.coords, vector.visible, vector.label, vector.timeTicks);
      }

      // Heading line
      if (!isEqual(headingLine, prevHeadingLine)) {
        prevHeadingLine = headingLine;
        engine.updateHeadingLine(headingLine.coords, headingLine.visible, headingLine.headingDeg);
      }

      // Autopilot target
      if (!isEqual(apTarget, prevApTarget)) {
        prevApTarget = apTarget;
        engine.updateAutopilotTarget(apTarget.coords, apTarget.visible);
      }

      // Laylines
      if (!isEqual(laylines, prevLaylines)) {
        prevLaylines = laylines;
        engine.updateLaylines(laylines.lines, laylines.visible);
      }

      // True wind
      if (!isEqual(trueWind, prevTrueWind)) {
        prevTrueWind = trueWind;
        engine.updateTrueWind(trueWind);
      }

      // Apparent wind
      if (!isEqual(apparentWind, prevApparentWind)) {
        prevApparentWind = apparentWind;
        engine.updateApparentWind(apparentWind);
      }

      // Waypoints
      if (!isEqual(waypoints, prevWaypoints)) {
        prevWaypoints = waypoints;
        engine.updateWaypoints(waypoints);
      }

      // Route
      if (!isEqual(route, prevRoute)) {
        prevRoute = route;
        engine.updateRoute(route);
      }

      // Saved tracks
      if (!isEqual(savedTracks, prevSavedTracks)) {
        prevSavedTracks = savedTracks;
        engine.updateSavedTracks(savedTracks);
      }

      // Bench route
      if (!isEqual(benchRoute, prevBenchRoute)) {
        prevBenchRoute = benchRoute;
        engine.updateBenchRoute(benchRoute.line, benchRoute.points);
      }

      // Center
      if (!isEqual(center, prevCenter)) {
        prevCenter = center;
        engine.updateView(center);
      }

      // Range rings
      if (!isEqual(rangeRings, prevRangeRings)) {
        prevRangeRings = rangeRings;
        if (rangeRings && rangeRings.center) {
          engine.updateRangeRings(rangeRings.center, rangeRings.intervals);
        } else {
          engine.clearRangeRings();
        }
      }

      // Bearing line
      if (!isEqual(bearingLine, prevBearingLine)) {
        prevBearingLine = bearingLine;
        engine.updateBearingLine(bearingLine.coords, bearingLine.visible);
      }

      // AIS targets
      if (!isEqual(aisTargets, prevAisTargets)) {
        prevAisTargets = aisTargets;
        engine.updateAisTargets(aisTargets);
      }

      // AIS tracks
      if (!isEqual(aisTracks, prevAisTracks)) {
        prevAisTracks = aisTracks;
        engine.updateAisTracks(aisTracks);
      }

      // AIS predictions
      if (!isEqual(aisPredictions, prevAisPredictions)) {
        prevAisPredictions = aisPredictions;
        engine.updateAisPredictions(aisPredictions);
      }

      // CPA lines
      if (!isEqual(cpaLines, prevCpaLines)) {
        prevCpaLines = cpaLines;
        engine.updateCpaLines(cpaLines);
      }

      // Measurement
      if (!isEqual(measurement, prevMeasurement)) {
        prevMeasurement = measurement;
        if (measurement.active) {
          engine.updateMeasurement(measurement.pointA, measurement.pointB, measurement.bearingDeg, measurement.distanceNm);
        } else {
          engine.clearMeasurement();
        }
      }

      // Anchor watch
      if (!isEqual(anchorWatch, prevAnchorWatch)) {
        prevAnchorWatch = anchorWatch;
        if (anchorWatch.active && anchorWatch.config) {
          engine.updateAnchorWatch(
            anchorWatch.config.anchorPosition,
            anchorWatch.config.radiusMeters,
            anchorWatch.alarmActive
          );
        } else {
          engine.clearAnchorWatch();
        }
      }
    });

    // Anchor watch service (runs inside Angular, no need for runOutsideAngular)
    if (anchorWatchService && ownPosition?.value?.longitude != null && ownPosition?.value?.latitude != null) {
      anchorWatchService.updateVesselPosition(ownPosition.value.longitude, ownPosition.value.latitude);
    }
  });
}

/**
 * Creates a single coalesced effect for configuration updates.
 * These change rarely (user interactions), so they don't need equality checking.
 */
export function createCoalescedConfigEffect(
  signals: {
    baseSourceSignal: () => any;
    orientation: () => any;
    aisVesselTypeColorsSignal: () => any;
    ownVesselIconScaleSignal: () => any;
    aisTargetIconScaleSignal: () => any;
    windTrackMinZoomSignal: () => any;
    rangeRingsMinZoomSignal: () => any;
    openSeaMapSignal: () => any;
    weatherTempSignal: () => any;
    weatherAirTempSignal: () => boolean;
    weatherWindSignal: () => any;
    weatherPrecipSignal: () => any;
    weatherCloudsSignal: () => any;
    weatherPressureSignal: () => any;
    weatherWavesSignal: () => boolean;
    environmentCurrentsSignal: () => boolean;
    environmentTimeSignal: () => string;
    weatherBoundsSignal: () => readonly number[];
    weatherGeometrySignal: () => { coordinates: number[][][] } | null;
    marineSourceGridSignal: () => boolean;
    marineDebugVariableSignal: () => 'wind' | 'waves' | 'currents';
    encDepthVisibleSignal: () => boolean;
    marineMaskVisibleSignal: () => boolean;
    weatherOpacitySignal: () => any;
    showAisTargetsSignal: () => any;
    showAisLabelsSignal: () => any;
    showCpaLinesSignal: () => any;
  },
  engine: {
    setBaseSource: (source: any) => void;
    setOrientation: (orientation: any) => void;
    setAisVesselTypeColors: (colors: any) => void;
    setOwnVesselIconScale: (scale: number) => void;
    setAisTargetIconScale: (scale: number) => void;
    setWindTrackMinZoom: (zoom: number) => void;
    setRangeRingsMinZoom: (zoom: number) => void;
    setOpenSeaMapVisible: (visible: boolean) => void;
    setWeatherLayer: (id: string, url: string | null, visible: boolean, opacity?: number) => void;
    setEnvironmentVector: (id: string, url: string | null, visible: boolean) => void;
    setEnvironmentParticles: (
      kind: 'wind' | 'currents',
      fieldUrl: string | null,
      maskUrl: string | null,
      visible: boolean,
      zonePolygon?: number[][][] | null,
    ) => void;
    setWeatherOpacity: (opacity: number) => void;
    setAisTargetsVisible: (visible: boolean) => void;
    setAisLabelsVisible: (visible: boolean) => void;
    setCpaLinesVisible: (visible: boolean) => void;
  },
  weatherTileUrl: (layer: string) => string | null,
  environmentVectorUrl: (layer: string) => string | null,
  environmentFieldUrl: (layer: 'wind' | 'currents' | 'mask') => string | null,
): void {
  effect(() => {
    const baseSource = signals.baseSourceSignal();
    const orientation = signals.orientation();
    const aisColors = signals.aisVesselTypeColorsSignal();
    const ownScale = signals.ownVesselIconScaleSignal();
    const aisScale = signals.aisTargetIconScaleSignal();
    const windMinZoom = signals.windTrackMinZoomSignal();
    const ringsMinZoom = signals.rangeRingsMinZoomSignal();
    const openSeaMap = signals.openSeaMapSignal();
    const weatherTemp = signals.weatherTempSignal();
    const weatherAirTemp = signals.weatherAirTempSignal();
    const weatherWind = signals.weatherWindSignal();
    const weatherPrecip = signals.weatherPrecipSignal();
    const weatherClouds = signals.weatherCloudsSignal();
    const weatherPressure = signals.weatherPressureSignal();
    const weatherWaves = signals.weatherWavesSignal();
    const environmentCurrents = signals.environmentCurrentsSignal();
    signals.environmentTimeSignal();
    signals.weatherBoundsSignal();
    const weatherGeometry = signals.weatherGeometrySignal();
    const marineSourceGrid = signals.marineSourceGridSignal();
    const encDepthVisible = signals.encDepthVisibleSignal();
    const marineMaskVisible = signals.marineMaskVisibleSignal();
    signals.marineDebugVariableSignal();
    const weatherOpacity = signals.weatherOpacitySignal();
    const showAisTargets = signals.showAisTargetsSignal();
    const showAisLabels = signals.showAisLabelsSignal();
    const showCpaLines = signals.showCpaLinesSignal();

    // Apply all config updates (no need for runOutsideAngular, these are lightweight)
    if (baseSource) engine.setBaseSource(baseSource);
    engine.setOrientation(orientation);
    engine.setAisVesselTypeColors(aisColors);
    engine.setOwnVesselIconScale(ownScale);
    engine.setAisTargetIconScale(aisScale);
    engine.setWindTrackMinZoom(windMinZoom);
    engine.setRangeRingsMinZoom(ringsMinZoom);
    engine.setOpenSeaMapVisible(openSeaMap);
    engine.setEnvironmentVector('seaTemperature', environmentVectorUrl('seaTemperature'), weatherTemp);
    engine.setWeatherLayer('air-temperature', weatherTileUrl('air-temperature'), weatherAirTemp, weatherOpacity);
    engine.setWeatherLayer('wind-speed', weatherTileUrl('wind-speed'), weatherWind, weatherOpacity);
    engine.setEnvironmentVector('wind', environmentVectorUrl('wind'), weatherWind);
    engine.setEnvironmentParticles(
      'wind',
      environmentFieldUrl('wind'),
      environmentFieldUrl('mask'),
      weatherWind,
      weatherGeometry?.coordinates ?? null,
    );
    engine.setWeatherLayer('precipitation', weatherTileUrl('precipitation'), weatherPrecip, weatherOpacity);
    engine.setWeatherLayer('clouds', weatherTileUrl('clouds'), weatherClouds, weatherOpacity);
    engine.setWeatherLayer('pressure', weatherTileUrl('pressure'), weatherPressure, weatherOpacity);
    engine.setEnvironmentVector('currents', environmentVectorUrl('currents'), environmentCurrents);
    engine.setEnvironmentParticles(
      'currents',
      environmentFieldUrl('currents'),
      environmentFieldUrl('mask'),
      environmentCurrents,
      weatherGeometry?.coordinates ?? null,
    );
    engine.setEnvironmentVector('waves', environmentVectorUrl('waves'), weatherWaves);
    engine.setEnvironmentVector('marineMask', environmentVectorUrl('marineMask'), marineMaskVisible);
    engine.setEnvironmentVector('encDepth', environmentVectorUrl('encDepth'), encDepthVisible);
    engine.setEnvironmentVector('sourceGrid', environmentVectorUrl('sourceGrid'), marineSourceGrid);
    engine.setWeatherOpacity(weatherOpacity);
    engine.setAisTargetsVisible(showAisTargets);
    engine.setAisLabelsVisible(showAisLabels);
    engine.setCpaLinesVisible(showCpaLines);
  });
}

// Simple deep equality check for objects
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }
  return true;
}
