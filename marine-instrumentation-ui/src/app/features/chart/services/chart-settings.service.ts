import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface ChartSettings {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
}

const DEFAULT_SETTINGS: ChartSettings = {
  autoCenter: true,
  showTrack: true,
  showVector: true,
  showTrueWind: false,
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

  private update(partial: Partial<ChartSettings>): void {
    this.settingsSubject.next({ ...this.settingsSubject.value, ...partial });
  }
}
