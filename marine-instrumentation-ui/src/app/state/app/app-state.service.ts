import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, map, distinctUntilChanged, shareReplay } from 'rxjs';
import { AlarmStoreService } from '../alarms/alarm-store.service';

export interface AppState {
  isOnboarded: boolean;
  currentTheme: 'day' | 'night';
  isFullscreen: boolean;
  isOffline: boolean;
  activeAlertCount: number;
  lastError: AppError | null;
}

export interface AppError {
  code: string;
  message: string;
  timestamp: number;
}

const ONBOARDED_KEY = 'omi-onboarded';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly alarmStore = inject(AlarmStoreService);

  private readonly _isOnboarded = new BehaviorSubject<boolean>(false);
  private readonly _isFullscreen = new BehaviorSubject<boolean>(false);
  private readonly _lastError = new BehaviorSubject<AppError | null>(null);

  readonly isOnboarded$ = this._isOnboarded.asObservable();
  readonly isFullscreen$ = this._isFullscreen.asObservable();
  readonly lastError$ = this._lastError.asObservable();

  readonly activeAlertCount$ = this.alarmStore.activeAlarms$.pipe(
    map((alarms) => alarms.length),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const onboarded = localStorage.getItem(ONBOARDED_KEY);
      this._isOnboarded.next(onboarded === 'true');
    }
  }

  isOnboarded(): boolean {
    return this._isOnboarded.value;
  }

  completeOnboarding(): void {
    this._isOnboarded.next(true);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    }
  }

  resetOnboarding(): void {
    this._isOnboarded.next(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(ONBOARDED_KEY);
    }
  }

  setFullscreen(value: boolean): void {
    this._isFullscreen.next(value);
  }

  setError(error: AppError | null): void {
    this._lastError.next(error);
  }

  reportError(code: string, message: string): void {
    this._lastError.next({ code, message, timestamp: Date.now() });
  }

  clearError(): void {
    this._lastError.next(null);
  }
}
