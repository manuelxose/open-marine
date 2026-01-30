import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface AlarmSettings {
  shallowDepthThreshold: number;
  shallowDepthHysteresis: number;
  lowBatteryThreshold: number;
  lowBatteryHysteresis: number;
  cpaThresholdNm: number;
  cpaTcpaMinutes: number;
  gpsLostSeconds: number;
  gpsLostHysteresisSeconds: number;
}

const DEFAULT_SETTINGS: AlarmSettings = {
  shallowDepthThreshold: 3.0,
  shallowDepthHysteresis: 0.5,
  lowBatteryThreshold: 11.6,
  lowBatteryHysteresis: 0.3,
  cpaThresholdNm: 0.5,
  cpaTcpaMinutes: 20,
  gpsLostSeconds: 30,
  gpsLostHysteresisSeconds: 5,
};

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
}
