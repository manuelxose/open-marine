import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { PreferencesService as CorePreferencesService } from '../core/preferences/preferences.service';

export type SpeedUnit = 'kn' | 'm/s' | 'km/h';
export type DepthUnit = 'm' | 'ft';
export type ThemeMode = 'day' | 'night';

export interface UserPreferences {
  speedUnit: SpeedUnit;
  depthUnit: DepthUnit;
  units: {
    speed: SpeedUnit;
    depth: DepthUnit;
  };
  shallowThreshold: number;
  theme: ThemeMode;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  speedUnit: 'kn',
  depthUnit: 'm',
  units: {
    speed: 'kn',
    depth: 'm',
  },
  shallowThreshold: 3.0,
  theme: 'night',
};

const STORAGE_KEY = 'omi-preferences';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly _preferences = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  public readonly preferences$ = this._preferences.asObservable();
  public readonly prefs$ = this.preferences$;

  // Canonical theme owner. This service keeps unit/threshold preferences but no
  // longer owns the document theme — that would fight the canonical service and
  // flip `data-theme` whenever a page lazily constructs this singleton.
  private readonly core = inject(CorePreferencesService);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<UserPreferences>;
          this._preferences.next(this.normalizePreferences(parsed));
        } catch {
          // Ignore corrupt data
        }
      }
    }

    // Persist unit/threshold changes (never touches the DOM theme).
    this.preferences$.subscribe((prefs) => {
      this.persist(prefs);
    });

    // Mirror the canonical theme so this service's `theme` reads stay correct
    // for its consumers, without ever applying it to the DOM itself.
    this.core.preferences$.subscribe((corePrefs) => {
      if (corePrefs.theme !== this._preferences.value.theme) {
        this._preferences.next({ ...this._preferences.value, theme: corePrefs.theme });
      }
    });
  }

  get snapshot(): UserPreferences {
    return this._preferences.value;
  }

  getSnapshot(): UserPreferences {
    return this._preferences.value;
  }

  setSpeedUnit(unit: SpeedUnit): void {
    this._preferences.next({
      ...this._preferences.value,
      speedUnit: unit,
      units: { ...this._preferences.value.units, speed: unit },
    });
  }

  setDepthUnit(unit: DepthUnit): void {
    this._preferences.next({
      ...this._preferences.value,
      depthUnit: unit,
      units: { ...this._preferences.value.units, depth: unit },
    });
  }

  setShallowThreshold(meters: number): void {
    this._preferences.next({ ...this._preferences.value, shallowThreshold: meters });
  }

  setTheme(theme: ThemeMode): void {
    // Delegate to the canonical owner; the mirror subscription updates our copy.
    this.core.setTheme(theme);
  }

  toggleTheme(): void {
    this.core.toggleTheme();
  }

  reset(): void {
    this._preferences.next({ ...DEFAULT_PREFERENCES, theme: this._preferences.value.theme });
  }

  private persist(prefs: UserPreferences): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  private normalizePreferences(parsed: Partial<UserPreferences>): UserPreferences {
    const speed = parsed.units?.speed ?? parsed.speedUnit ?? DEFAULT_PREFERENCES.units.speed;
    const depth = parsed.units?.depth ?? parsed.depthUnit ?? DEFAULT_PREFERENCES.units.depth;

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      speedUnit: speed,
      depthUnit: depth,
      units: { speed, depth },
    };
  }
}
