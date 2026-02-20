import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type DensityMode = 'comfortable' | 'compact';
export type SpeedUnit = 'kn' | 'm/s' | 'km/h';
export type DepthUnit = 'm' | 'ft';
export type ThemeMode = 'day' | 'night';

export interface UserPreferences {
  density: DensityMode;
  speedUnit: SpeedUnit;
  depthUnit: DepthUnit;
  shallowThreshold: number;
  theme: ThemeMode;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  density: 'comfortable',
  speedUnit: 'kn',
  depthUnit: 'm',
  shallowThreshold: 3.0,
  theme: 'night',
};

const STORAGE_KEY = 'omi-preferences';
const LEGACY_THEME_KEY = 'omi-theme';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly _preferences = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  public readonly preferences$ = this._preferences.asObservable();
  public readonly prefs$ = this.preferences$;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<UserPreferences>;
          this._preferences.next({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch {
          // Ignore corrupt data
        }
      }
    }

    this.preferences$.subscribe((prefs) => {
      this.applyPreferences(prefs);
    });
  }

  get snapshot(): UserPreferences {
    return this._preferences.value;
  }

  getSnapshot(): UserPreferences {
    return this._preferences.value;
  }

  setDensity(mode: DensityMode): void {
    this._preferences.next({ ...this._preferences.value, density: mode });
  }

  toggleDensity(): void {
    const current = this._preferences.value.density;
    this.setDensity(current === 'comfortable' ? 'compact' : 'comfortable');
  }

  setSpeedUnit(unit: SpeedUnit): void {
    this._preferences.next({ ...this._preferences.value, speedUnit: unit });
  }

  setDepthUnit(unit: DepthUnit): void {
    this._preferences.next({ ...this._preferences.value, depthUnit: unit });
  }

  setShallowThreshold(meters: number): void {
    this._preferences.next({ ...this._preferences.value, shallowThreshold: meters });
  }

  setTheme(theme: ThemeMode): void {
    this._preferences.next({ ...this._preferences.value, theme });
  }

  toggleTheme(): void {
    const next = this._preferences.value.theme === 'day' ? 'night' : 'day';
    this.setTheme(next);
  }

  reset(): void {
    this._preferences.next(DEFAULT_PREFERENCES);
  }

  private applyPreferences(prefs: UserPreferences): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    localStorage.setItem(LEGACY_THEME_KEY, prefs.theme);
    document.body.classList.toggle('compact-mode', prefs.density === 'compact');
    document.documentElement.setAttribute('data-theme', prefs.theme);
    document.body.setAttribute('data-theme', prefs.theme);
  }
}
