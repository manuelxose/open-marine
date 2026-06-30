import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import {
  DEFAULT_VESSEL_TYPE_COLORS,
  VESSEL_TYPE_KEYS,
  normalizeHexColor,
  type VesselTypeColors,
  type VesselTypeFilter,
} from './chart-vessel-types';

export type AisDisplayAge = '1h' | '24h';
export type TrackDuration = '1d' | '7d' | '90d';
export type WindVectorSource = 'true' | 'apparent';

export interface EncLayerConfig {
  showDepthAreas: boolean;
  showDepthContours: boolean;
  showBuoys: boolean;
  showHazards: boolean;
  showAnchorages: boolean;
  showTSS: boolean;
  showLights: boolean;
}

export type { VesselTypeFilter, VesselTypeColors } from './chart-vessel-types';
export { VESSEL_TYPE_KEYS, VESSEL_TYPE_LABELS, DEFAULT_VESSEL_TYPE_COLORS } from './chart-vessel-types';

export interface ChartSettings {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
  showApparentWind: boolean;
  showRangeRings: boolean;
  rangeRingIntervals: number[];
  showOpenSeaMap: boolean;
  showAisTracks: boolean;
  safetyDepth: number;
  encLayers: EncLayerConfig;
  showAisTargets: boolean;
  showAisLabels: boolean;
  showCpaLines: boolean;
  ownVesselIconScale: number;
  aisTargetIconScale: number;
  fixedLocationMode: boolean;
  fixedLocationLat: number | null;
  fixedLocationLon: number | null;
  showHeadingLine: boolean;
  headingLineMinutes: number;
  cogLineMinutes: number;
  showLaylines: boolean;
  laylineAngleDeg: number;
  windTrackMinZoom: number;
  rangeRingsMinZoom: number;
  rangeRingCount: number;
  rangeRingStepNm: number;
  hideMooredTargets: boolean;
  hideAnchoredTargets: boolean;
  aisInactiveAfterMinutes: number;
  aisRemoveAfterMinutes: number;
  windVectorSource: WindVectorSource;
  // AIS Settings
  aisDisplayAge: AisDisplayAge;
  visibleVesselTypes: VesselTypeFilter[];
  vesselTypeColors: VesselTypeColors;
  // Track Settings
  trackDuration: TrackDuration;
  // Weather Overlays
  showTemperature: boolean;
  showWindSpeed: boolean;
  showWaves: boolean;
  showPrecipitation: boolean;
  showClouds: boolean;
  showPressure: boolean;
  weatherOpacity: number;
  enableVesselEnrichment: boolean;
  showSavedTracks: boolean;
}

const DEFAULT_SETTINGS: ChartSettings = {
  autoCenter: true,
  showTrack: true,
  showVector: true,
  showTrueWind: true,
  showApparentWind: true,
  showRangeRings: false,
  rangeRingIntervals: [0.25, 0.5, 1.0],
  showOpenSeaMap: false,
  showAisTracks: true,
  safetyDepth: 2.0,
  encLayers: {
    showDepthAreas: true,
    showDepthContours: true,
    showBuoys: true,
    showHazards: true,
    showAnchorages: true,
    showTSS: true,
    showLights: true,
  },
  showAisTargets: true,
  showAisLabels: true,
  showCpaLines: true,
  ownVesselIconScale: 1.15,
  aisTargetIconScale: 0.8,
  fixedLocationMode: false,
  fixedLocationLat: null,
  fixedLocationLon: null,
  showHeadingLine: true,
  headingLineMinutes: 6,
  cogLineMinutes: 10,
  showLaylines: false,
  laylineAngleDeg: 45,
  windTrackMinZoom: 0,
  rangeRingsMinZoom: 8,
  rangeRingCount: 4,
  rangeRingStepNm: 0.25,
  hideMooredTargets: false,
  hideAnchoredTargets: false,
  aisInactiveAfterMinutes: 6,
  aisRemoveAfterMinutes: 9,
  windVectorSource: 'true',
  aisDisplayAge: '24h',
  visibleVesselTypes: [...VESSEL_TYPE_KEYS],
  vesselTypeColors: { ...DEFAULT_VESSEL_TYPE_COLORS },
  trackDuration: '1d',
  showTemperature: false,
  showWindSpeed: false,
  showWaves: false,
  showPrecipitation: false,
  showClouds: false,
  showPressure: false,
  weatherOpacity: 0.6,
  enableVesselEnrichment: true,
  showSavedTracks: true,
};

const STORAGE_KEY = 'omi-chart-settings';

@Injectable({
  providedIn: 'root',
})
export class ChartSettingsService {
  private readonly settingsSubject = new BehaviorSubject<ChartSettings>(DEFAULT_SETTINGS);
  readonly settings$ = this.settingsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<ChartSettings>;
          this.settingsSubject.next(this.hydrateSettings(parsed));
        } catch {
          // ignore corrupted storage
        }
      }

      this.settings$.subscribe((settings) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      });
    }
  }

  get snapshot(): ChartSettings {
    return this.settingsSubject.value;
  }

  toggleAutoCenter(): void {
    this.update({ autoCenter: !this.settingsSubject.value.autoCenter });
  }

  toggleTrack(): void {
    this.update({ showTrack: !this.settingsSubject.value.showTrack });
  }

  toggleVector(): void {
    this.update({ showVector: !this.settingsSubject.value.showVector });
  }

  toggleTrueWind(): void {
    this.update({ showTrueWind: !this.settingsSubject.value.showTrueWind });
  }

  toggleApparentWind(): void {
    this.update({ showApparentWind: !this.settingsSubject.value.showApparentWind });
  }

  enableAutoCenter(): void {
    if (!this.settingsSubject.value.autoCenter) {
      this.update({ autoCenter: true });
    }
  }

  toggleRangeRings(): void {
    const current = this.settingsSubject.value;
    this.update({ showRangeRings: !current.showRangeRings });
  }

  setRangeRingIntervals(intervals: number[]): void {
    this.update({ rangeRingIntervals: intervals });
  }

  setRangeRingCount(count: number): void {
    const normalized = Math.max(1, Math.min(12, Math.round(count)));
    this.update({ rangeRingCount: normalized, rangeRingIntervals: this.buildRangeIntervals(normalized, this.snapshot.rangeRingStepNm) });
  }

  setRangeRingStepNm(stepNm: number): void {
    const normalized = this.positiveOr(stepNm, 0.25);
    this.update({
      rangeRingStepNm: normalized,
      rangeRingIntervals: this.buildRangeIntervals(this.snapshot.rangeRingCount, normalized),
    });
  }

  setFixedLocationMode(enabled: boolean): void {
    this.update({ fixedLocationMode: enabled });
  }

  setFixedLocation(lat: number | null, lon: number | null): void {
    const normalizedLat = lat !== null && Number.isFinite(lat) ? Math.min(90, Math.max(-90, lat)) : null;
    const normalizedLon = lon !== null && Number.isFinite(lon) ? Math.min(180, Math.max(-180, lon)) : null;
    this.update({ fixedLocationLat: normalizedLat, fixedLocationLon: normalizedLon });
  }

  setOwnVesselIconScale(scale: number): void {
    const normalized = this.clampNumber(scale, DEFAULT_SETTINGS.ownVesselIconScale, 0.5, 2.5);
    this.update({ ownVesselIconScale: normalized });
  }

  setAisTargetIconScale(scale: number): void {
    const normalized = this.clampNumber(scale, DEFAULT_SETTINGS.aisTargetIconScale, 0.4, 2.0);
    this.update({ aisTargetIconScale: normalized });
  }

  setShowHeadingLine(show: boolean): void {
    this.update({ showHeadingLine: show });
  }

  setHeadingLineMinutes(minutes: number): void {
    const normalized = this.clampNumber(minutes, DEFAULT_SETTINGS.headingLineMinutes, 1, 120);
    this.update({ headingLineMinutes: normalized });
  }

  setCogLineMinutes(minutes: number): void {
    const normalized = this.clampNumber(minutes, DEFAULT_SETTINGS.cogLineMinutes, 1, 120);
    this.update({ cogLineMinutes: normalized });
  }

  setShowLaylines(show: boolean): void {
    this.update({ showLaylines: show });
  }

  setLaylineAngleDeg(angleDeg: number): void {
    const normalized = this.clampNumber(angleDeg, DEFAULT_SETTINGS.laylineAngleDeg, 10, 80);
    this.update({ laylineAngleDeg: normalized });
  }

  setWindTrackMinZoom(zoom: number): void {
    const normalized = this.clampNumber(zoom, DEFAULT_SETTINGS.windTrackMinZoom, 0, 24);
    this.update({ windTrackMinZoom: normalized });
  }

  setRangeRingsMinZoom(zoom: number): void {
    const normalized = this.clampNumber(zoom, DEFAULT_SETTINGS.rangeRingsMinZoom, 0, 24);
    this.update({ rangeRingsMinZoom: normalized });
  }

  setHideMooredTargets(hide: boolean): void {
    this.update({ hideMooredTargets: hide });
  }

  setHideAnchoredTargets(hide: boolean): void {
    this.update({ hideAnchoredTargets: hide });
  }

  setAisInactiveAfterMinutes(minutes: number): void {
    const normalized = this.clampNumber(minutes, DEFAULT_SETTINGS.aisInactiveAfterMinutes, 1, 120);
    this.update({ aisInactiveAfterMinutes: normalized });
  }

  setAisRemoveAfterMinutes(minutes: number): void {
    const normalized = this.clampNumber(minutes, DEFAULT_SETTINGS.aisRemoveAfterMinutes, 1, 240);
    this.update({ aisRemoveAfterMinutes: normalized });
  }

  setWindVectorSource(source: WindVectorSource): void {
    this.update({ windVectorSource: source });
  }

  toggleOpenSeaMap(): void {
    this.update({ showOpenSeaMap: !this.settingsSubject.value.showOpenSeaMap });
  }

  toggleAisTracks(): void {
    this.update({ showAisTracks: !this.settingsSubject.value.showAisTracks });
  }

  toggleSavedTracks(): void {
    this.update({ showSavedTracks: !this.settingsSubject.value.showSavedTracks });
  }

  toggleVesselEnrichment(): void {
    this.update({ enableVesselEnrichment: !this.settingsSubject.value.enableVesselEnrichment });
  }

  setSafetyDepth(depth: number): void {
    const normalized = this.clampNumber(depth, DEFAULT_SETTINGS.safetyDepth, 0.5, 20);
    this.update({ safetyDepth: normalized });
  }

  updateEncLayers(partial: Partial<EncLayerConfig>): void {
    this.update({
      encLayers: {
        ...this.settingsSubject.value.encLayers,
        ...partial,
      },
    });
  }

  toggleAisTargets(): void {
    this.update({ showAisTargets: !this.settingsSubject.value.showAisTargets });
  }

  toggleAisLabels(): void {
    this.update({ showAisLabels: !this.settingsSubject.value.showAisLabels });
  }

  toggleCpaLines(): void {
    this.update({ showCpaLines: !this.settingsSubject.value.showCpaLines });
  }

  // AIS Settings
  setAisDisplayAge(age: AisDisplayAge): void {
    this.update({ aisDisplayAge: age });
  }

  toggleVesselType(type: VesselTypeFilter): void {
    const current = this.settingsSubject.value.visibleVesselTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    this.update({ visibleVesselTypes: next });
  }

  setAllVesselTypes(visible: boolean): void {
    this.update({ visibleVesselTypes: visible ? [...VESSEL_TYPE_KEYS] : [] });
  }

  setVesselTypeColor(type: VesselTypeFilter, color: string): void {
    const current = this.settingsSubject.value.vesselTypeColors[type];
    const fallback = current ?? DEFAULT_VESSEL_TYPE_COLORS[type];
    const normalized = normalizeHexColor(color, fallback);
    if (normalized === current) {
      return;
    }

    this.update({
      vesselTypeColors: {
        ...this.settingsSubject.value.vesselTypeColors,
        [type]: normalized,
      },
    });
  }

  resetVesselTypeColors(): void {
    this.update({ vesselTypeColors: { ...DEFAULT_VESSEL_TYPE_COLORS } });
  }

  // Track Settings
  setTrackDuration(duration: TrackDuration): void {
    this.update({ trackDuration: duration });
  }

  // Weather Overlays
  toggleTemperature(): void {
    this.update({ showTemperature: !this.settingsSubject.value.showTemperature });
  }

  toggleWindSpeed(): void {
    this.update({ showWindSpeed: !this.settingsSubject.value.showWindSpeed });
  }

  toggleWaves(): void {
    this.update({ showWaves: !this.settingsSubject.value.showWaves });
  }

  togglePrecipitation(): void {
    this.update({ showPrecipitation: !this.settingsSubject.value.showPrecipitation });
  }

  toggleClouds(): void {
    this.update({ showClouds: !this.settingsSubject.value.showClouds });
  }

  togglePressure(): void {
    this.update({ showPressure: !this.settingsSubject.value.showPressure });
  }

  setWeatherOpacity(opacity: number): void {
    const clamped = Math.max(0, Math.min(1, opacity));
    this.update({ weatherOpacity: clamped });
  }

  update(partial: Partial<ChartSettings>): void {
    this.settingsSubject.next({ ...this.settingsSubject.value, ...partial });
  }

  private hydrateSettings(saved: Partial<ChartSettings>): ChartSettings {
    const visibleVesselTypes = Array.isArray(saved.visibleVesselTypes)
      ? saved.visibleVesselTypes.filter((type): type is VesselTypeFilter => this.isVesselTypeFilter(type))
      : [...DEFAULT_SETTINGS.visibleVesselTypes];

    const vesselTypeColors = this.hydrateVesselTypeColors(saved.vesselTypeColors);

    const normalized = {
      ...DEFAULT_SETTINGS,
      ...saved,
      visibleVesselTypes,
      vesselTypeColors,
    };

    const rangeRingCount = this.coerceInteger(saved.rangeRingCount, DEFAULT_SETTINGS.rangeRingCount, 1, 12);
    const rangeRingStepNm = this.positiveOr(
      typeof saved.rangeRingStepNm === 'number' ? saved.rangeRingStepNm : DEFAULT_SETTINGS.rangeRingStepNm,
      DEFAULT_SETTINGS.rangeRingStepNm,
    );
    normalized.rangeRingCount = rangeRingCount;
    normalized.rangeRingStepNm = rangeRingStepNm;
    normalized.rangeRingIntervals = this.buildRangeIntervals(rangeRingCount, rangeRingStepNm);
    normalized.weatherOpacity = this.clampNumber(saved.weatherOpacity, DEFAULT_SETTINGS.weatherOpacity, 0, 1);
    normalized.ownVesselIconScale = this.clampNumber(saved.ownVesselIconScale, DEFAULT_SETTINGS.ownVesselIconScale, 0.5, 2.5);
    normalized.aisTargetIconScale = this.clampNumber(saved.aisTargetIconScale, DEFAULT_SETTINGS.aisTargetIconScale, 0.4, 2.0);
    normalized.headingLineMinutes = this.clampNumber(saved.headingLineMinutes, DEFAULT_SETTINGS.headingLineMinutes, 1, 120);
    normalized.cogLineMinutes = this.clampNumber(saved.cogLineMinutes, DEFAULT_SETTINGS.cogLineMinutes, 1, 120);
    normalized.laylineAngleDeg = this.clampNumber(saved.laylineAngleDeg, DEFAULT_SETTINGS.laylineAngleDeg, 10, 80);
    normalized.windTrackMinZoom = this.clampNumber(saved.windTrackMinZoom, DEFAULT_SETTINGS.windTrackMinZoom, 0, 24);
    normalized.rangeRingsMinZoom = this.clampNumber(saved.rangeRingsMinZoom, DEFAULT_SETTINGS.rangeRingsMinZoom, 0, 24);
    normalized.aisInactiveAfterMinutes = this.clampNumber(saved.aisInactiveAfterMinutes, DEFAULT_SETTINGS.aisInactiveAfterMinutes, 1, 120);
    normalized.aisRemoveAfterMinutes = this.clampNumber(saved.aisRemoveAfterMinutes, DEFAULT_SETTINGS.aisRemoveAfterMinutes, 1, 240);
    normalized.fixedLocationLat = this.toNullableClamped(saved.fixedLocationLat, -90, 90);
    normalized.fixedLocationLon = this.toNullableClamped(saved.fixedLocationLon, -180, 180);
    normalized.windVectorSource =
      saved.windVectorSource === 'apparent' || saved.windVectorSource === 'true'
        ? saved.windVectorSource
        : DEFAULT_SETTINGS.windVectorSource;
    normalized.showTrueWind = this.toBoolean(saved.showTrueWind, DEFAULT_SETTINGS.showTrueWind);
    normalized.showApparentWind = this.toBoolean(saved.showApparentWind, DEFAULT_SETTINGS.showApparentWind);
    normalized.showHeadingLine = this.toBoolean(saved.showHeadingLine, DEFAULT_SETTINGS.showHeadingLine);
    normalized.showLaylines = this.toBoolean(saved.showLaylines, DEFAULT_SETTINGS.showLaylines);
    normalized.showAisTracks = this.toBoolean(saved.showAisTracks, DEFAULT_SETTINGS.showAisTracks);
    normalized.safetyDepth = this.clampNumber(saved.safetyDepth, DEFAULT_SETTINGS.safetyDepth, 0.5, 20);
    normalized.encLayers = this.hydrateEncLayers(saved.encLayers);
    normalized.hideMooredTargets = this.toBoolean(saved.hideMooredTargets, DEFAULT_SETTINGS.hideMooredTargets);
    normalized.hideAnchoredTargets = this.toBoolean(saved.hideAnchoredTargets, DEFAULT_SETTINGS.hideAnchoredTargets);
    normalized.fixedLocationMode = this.toBoolean(saved.fixedLocationMode, DEFAULT_SETTINGS.fixedLocationMode);
    normalized.enableVesselEnrichment = this.toBoolean(
      saved.enableVesselEnrichment,
      DEFAULT_SETTINGS.enableVesselEnrichment,
    );
    normalized.showSavedTracks = this.toBoolean(saved.showSavedTracks, DEFAULT_SETTINGS.showSavedTracks);

    return normalized;
  }

  private hydrateVesselTypeColors(
    savedColors: Partial<Record<VesselTypeFilter, unknown>> | undefined,
  ): VesselTypeColors {
    const next: VesselTypeColors = { ...DEFAULT_VESSEL_TYPE_COLORS };
    if (!savedColors || typeof savedColors !== 'object') {
      return next;
    }

    for (const key of VESSEL_TYPE_KEYS) {
      const candidate = savedColors[key];
      next[key] = normalizeHexColor(candidate, DEFAULT_VESSEL_TYPE_COLORS[key]);
    }
    return next;
  }

  private hydrateEncLayers(saved: Partial<Record<keyof EncLayerConfig, unknown>> | undefined): EncLayerConfig {
    const defaults = DEFAULT_SETTINGS.encLayers;
    if (!saved || typeof saved !== 'object') {
      return { ...defaults };
    }

    return {
      showDepthAreas: this.toBoolean(saved.showDepthAreas, defaults.showDepthAreas),
      showDepthContours: this.toBoolean(saved.showDepthContours, defaults.showDepthContours),
      showBuoys: this.toBoolean(saved.showBuoys, defaults.showBuoys),
      showHazards: this.toBoolean(saved.showHazards, defaults.showHazards),
      showAnchorages: this.toBoolean(saved.showAnchorages, defaults.showAnchorages),
      showTSS: this.toBoolean(saved.showTSS, defaults.showTSS),
      showLights: this.toBoolean(saved.showLights, defaults.showLights),
    };
  }

  private isVesselTypeFilter(value: unknown): value is VesselTypeFilter {
    return typeof value === 'string' && VESSEL_TYPE_KEYS.includes(value as VesselTypeFilter);
  }

  private buildRangeIntervals(count: number, stepNm: number): number[] {
    const safeCount = Math.max(1, Math.min(12, Math.round(count)));
    const safeStep = this.positiveOr(stepNm, 0.25);
    return Array.from({ length: safeCount }, (_, index) => Number(((index + 1) * safeStep).toFixed(3)));
  }

  private clampNumber(value: unknown, fallback: number, min: number, max: number): number {
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  private toNullableClamped(value: unknown, min: number, max: number): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    return Math.min(max, Math.max(min, value));
  }

  private coerceInteger(value: unknown, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  private positiveOr(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }
}
