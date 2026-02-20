import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type AisDisplayAge = '1h' | '24h';
export type TrackDuration = '1d' | '7d' | '90d';
export type VesselTypeFilter =
  | 'cargo'
  | 'tanker'
  | 'passenger'
  | 'fishing'
  | 'sailing'
  | 'pleasure'
  | 'tug'
  | 'military'
  | 'hsc'
  | 'other';

export interface ChartSettings {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
  showRangeRings: boolean;
  rangeRingIntervals: number[];
  showOpenSeaMap: boolean;
  showAisTargets: boolean;
  showAisLabels: boolean;
  showCpaLines: boolean;
  // AIS Settings
  aisDisplayAge: AisDisplayAge;
  visibleVesselTypes: VesselTypeFilter[];
  // Track Settings
  trackDuration: TrackDuration;
  // Weather Overlays
  showTemperature: boolean;
  showWindSpeed: boolean;
  showWaves: boolean;
}

const ALL_VESSEL_TYPES: VesselTypeFilter[] = [
  'cargo', 'tanker', 'passenger', 'fishing', 'sailing',
  'pleasure', 'tug', 'military', 'hsc', 'other',
];

const DEFAULT_SETTINGS: ChartSettings = {
  autoCenter: true,
  showTrack: true,
  showVector: true,
  showTrueWind: false,
  showRangeRings: false,
  rangeRingIntervals: [0.25, 0.5, 1.0],
  showOpenSeaMap: false,
  showAisTargets: true,
  showAisLabels: true,
  showCpaLines: true,
  aisDisplayAge: '24h',
  visibleVesselTypes: [...ALL_VESSEL_TYPES],
  trackDuration: '1d',
  showTemperature: false,
  showWindSpeed: false,
  showWaves: false,
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
          this.settingsSubject.next({ ...DEFAULT_SETTINGS, ...parsed });
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

  toggleOpenSeaMap(): void {
    this.update({ showOpenSeaMap: !this.settingsSubject.value.showOpenSeaMap });
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
    this.update({ visibleVesselTypes: visible ? [...ALL_VESSEL_TYPES] : [] });
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

  update(partial: Partial<ChartSettings>): void {
    this.settingsSubject.next({ ...this.settingsSubject.value, ...partial });
  }
}
