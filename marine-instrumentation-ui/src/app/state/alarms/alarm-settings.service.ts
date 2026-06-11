import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type AlarmSettingsPresetId = 'harbor' | 'coastal' | 'offshore' | 'simulation';

export interface AlarmSettings {
  showShallowWaterAlarm: boolean;
  showBatteryLowAlarm: boolean;
  showCpaWarningAlarm: boolean;
  showGpsLostAlarm: boolean;
  showAnchorWatchAlarm: boolean;
  cpaRiskOwnShipMinSpeedMps: number;
  cpaRiskTargetMinSpeedMps: number;
  xteMinSpeedKnots: number;
  gpsOutlierMaxSpeedMps: number;
  gpsOutlierMinJumpDistanceMeters: number;
  gpsOutlierStationarySogMps: number;
  gpsOutlierMaxDriftMeters: number;
  gpsOutlierStationaryWindowSeconds: number;
  shallowDepthThreshold: number;
  shallowDepthHysteresis: number;
  lowBatteryThreshold: number;
  lowBatteryHysteresis: number;
  cpaThresholdNm: number;
  cpaTcpaMinutes: number;
  gpsLostSeconds: number;
  gpsLostHysteresisSeconds: number;
}

export interface AlarmSettingsPreset {
  id: AlarmSettingsPresetId;
  label: string;
  description: string;
  values: Partial<AlarmSettings>;
}

const DEFAULT_SETTINGS: AlarmSettings = {
  showShallowWaterAlarm: true,
  showBatteryLowAlarm: true,
  showCpaWarningAlarm: true,
  showGpsLostAlarm: true,
  showAnchorWatchAlarm: true,
  cpaRiskOwnShipMinSpeedMps: 0.5,
  cpaRiskTargetMinSpeedMps: 0.5,
  xteMinSpeedKnots: 0.5,
  gpsOutlierMaxSpeedMps: 35,
  gpsOutlierMinJumpDistanceMeters: 50,
  gpsOutlierStationarySogMps: 0.7,
  gpsOutlierMaxDriftMeters: 150,
  gpsOutlierStationaryWindowSeconds: 30,
  shallowDepthThreshold: 3.0,
  shallowDepthHysteresis: 0.5,
  lowBatteryThreshold: 11.6,
  lowBatteryHysteresis: 0.3,
  cpaThresholdNm: 0.5,
  cpaTcpaMinutes: 20,
  gpsLostSeconds: 30,
  gpsLostHysteresisSeconds: 5,
};

export const ALARM_SETTINGS_PRESETS: AlarmSettingsPreset[] = [
  {
    id: 'harbor',
    label: 'Harbor',
    description: 'Reduce false positives while moored or in low-speed maneuvering areas.',
    values: {
      cpaThresholdNm: 0.2,
      cpaTcpaMinutes: 8,
      cpaRiskOwnShipMinSpeedMps: 1.2,
      cpaRiskTargetMinSpeedMps: 0.8,
      xteMinSpeedKnots: 2.0,
      gpsOutlierMaxSpeedMps: 22,
      gpsOutlierMinJumpDistanceMeters: 20,
      gpsOutlierStationarySogMps: 1.0,
      gpsOutlierMaxDriftMeters: 60,
      gpsOutlierStationaryWindowSeconds: 45,
      gpsLostSeconds: 45,
      gpsLostHysteresisSeconds: 10,
    },
  },
  {
    id: 'coastal',
    label: 'Coastal',
    description: 'Balanced day-to-day navigation profile for nearshore cruising.',
    values: {
      cpaThresholdNm: 0.5,
      cpaTcpaMinutes: 20,
      cpaRiskOwnShipMinSpeedMps: 0.5,
      cpaRiskTargetMinSpeedMps: 0.5,
      xteMinSpeedKnots: 0.5,
      gpsOutlierMaxSpeedMps: 35,
      gpsOutlierMinJumpDistanceMeters: 50,
      gpsOutlierStationarySogMps: 0.7,
      gpsOutlierMaxDriftMeters: 150,
      gpsOutlierStationaryWindowSeconds: 30,
      gpsLostSeconds: 30,
      gpsLostHysteresisSeconds: 5,
    },
  },
  {
    id: 'offshore',
    label: 'Offshore',
    description: 'Earlier collision awareness and looser GPS jump filter at high speed.',
    values: {
      cpaThresholdNm: 1.0,
      cpaTcpaMinutes: 35,
      cpaRiskOwnShipMinSpeedMps: 0.3,
      cpaRiskTargetMinSpeedMps: 0.3,
      xteMinSpeedKnots: 0.2,
      gpsOutlierMaxSpeedMps: 50,
      gpsOutlierMinJumpDistanceMeters: 80,
      gpsOutlierStationarySogMps: 0.4,
      gpsOutlierMaxDriftMeters: 220,
      gpsOutlierStationaryWindowSeconds: 20,
      gpsLostSeconds: 25,
      gpsLostHysteresisSeconds: 5,
    },
  },
  {
    id: 'simulation',
    label: 'Simulation',
    description: 'Relax filters for replay/test feeds and disable non-critical GPS aging noise.',
    values: {
      showGpsLostAlarm: false,
      cpaThresholdNm: 0.7,
      cpaTcpaMinutes: 25,
      cpaRiskOwnShipMinSpeedMps: 0.2,
      cpaRiskTargetMinSpeedMps: 0.2,
      xteMinSpeedKnots: 0.1,
      gpsOutlierMaxSpeedMps: 120,
      gpsOutlierMinJumpDistanceMeters: 5,
      gpsOutlierStationarySogMps: 2.0,
      gpsOutlierMaxDriftMeters: 1000,
      gpsOutlierStationaryWindowSeconds: 120,
      gpsLostSeconds: 120,
      gpsLostHysteresisSeconds: 15,
    },
  },
];

const STORAGE_KEY = 'omi-alarm-settings';

@Injectable({
  providedIn: 'root',
})
export class AlarmSettingsService {
  private readonly settingsSubject = new BehaviorSubject<AlarmSettings>(DEFAULT_SETTINGS);
  readonly settings$ = this.settingsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<AlarmSettings>;
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

  get snapshot(): AlarmSettings {
    return this.settingsSubject.value;
  }

  update(partial: Partial<AlarmSettings>): void {
    this.settingsSubject.next({ ...this.settingsSubject.value, ...partial });
  }

  applyPreset(presetId: AlarmSettingsPresetId): void {
    const preset = ALARM_SETTINGS_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    this.settingsSubject.next({ ...this.settingsSubject.value, ...preset.values });
  }
}
