import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { 
  UserPreferences, 
  DEFAULT_PREFERENCES, 
  ThemeMode, 
  DensityMode,
  SpeedUnit,
  DepthUnit
} from './preferences.schema';
import { migratePreferences } from './migrations';

const STORAGE_KEY = 'omi-preferences-v2';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly _prefs$ = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  
  /**
   * Observe all preferences
   */
  public readonly preferences$ = this._prefs$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.load();
  }

  /**
   * Strict getter for current snapshot
   */
  get snapshot(): UserPreferences {
    return this._prefs$.value;
  }

  /**
   * Observe a specific slice of preferences
   */
  select<T>(selector: (p: UserPreferences) => T): Observable<T> {
    return this.preferences$.pipe(
      map(selector),
      distinctUntilChanged()
    );
  }

  update(patch: Partial<UserPreferences> | ((current: UserPreferences) => UserPreferences)): void {
    const current = this._prefs$.value;
    const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch };
    
    // Safety check: ensure version is preserved
    next.version = DEFAULT_PREFERENCES.version;
    
    this._prefs$.next(next);
    this.save(next);
  }

  // Convenience methods
  setTheme(theme: ThemeMode): void {
    this.update({ theme });
    this.applyTheme(theme);
  }

  setDensity(density: DensityMode): void {
    this.update({ density });
    this.applyDensity(density);
  }

  setSpeedUnit(speed: SpeedUnit): void {
    this.update((current) => ({
      ...current,
      units: { ...current.units, speed },
    }));
  }

  setDepthUnit(depth: DepthUnit): void {
    this.update((current) => ({
      ...current,
      units: { ...current.units, depth },
    }));
  }

  setChartAutoCenter(autoCenter: boolean): void {
    this.update((current) => ({
      ...current,
      chart: { ...current.chart, autoCenter },
    }));
  }

  setChartTrackLength(trackLengthMinutes: number): void {
    this.update((current) => ({
      ...current,
      chart: { ...current.chart, trackLengthMinutes },
    }));
  }

  setChartSource(source: 'signalk' | 'mock'): void {
    this.update((current) => ({
      ...current,
      chart: { ...current.chart, source },
    }));
  }

  setMapSourceId(mapSourceId: string): void {
    this.update((current) => ({
      ...current,
      chart: { ...current.chart, mapSourceId },
    }));
  }

  toggleTheme(): void {
    const next = this.snapshot.theme === 'day' ? 'night' : 'day';
    this.setTheme(next);
  }

  toggleDensity(): void {
    const next = this.snapshot.density === 'comfortable' ? 'compact' : 'comfortable';
    this.setDensity(next);
  }

  private load(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migratePreferences(parsed);
        this._prefs$.next(migrated);
        this.applyTheme(migrated.theme);
        this.applyDensity(migrated.density);
      } else {
        // Handle legacy key if v2 doesn't exist
        const legacy = localStorage.getItem('omi-preferences');
        if (legacy) {
           const migrated = migratePreferences(JSON.parse(legacy));
           this._prefs$.next(migrated);
           this.applyTheme(migrated.theme);
           this.applyDensity(migrated.density);
           // Save to new key
           this.save(migrated);
        }
      }
    } catch (e) {
      console.warn('Failed to load preferences, using defaults', e);
    }
  }

  private save(prefs: UserPreferences): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  private applyTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }

  private applyDensity(density: DensityMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.classList.toggle('compact-mode', density === 'compact');
  }
}
