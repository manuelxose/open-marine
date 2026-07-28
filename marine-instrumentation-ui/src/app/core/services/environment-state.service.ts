import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppEnvironment } from '../config/app-environment.token';

/**
 * Reactive holder for the resolved {@link AppEnvironment}.
 *
 * The initial value is seeded by the boot-time {@link APP_ENVIRONMENT} factory.
 * After host auto-detection completes during the splash screen,
 * {@link AppComponent} calls {@link updateEnv} so that HTTP services
 * (autopilot, courses, resources, charts) use the correct URLs.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentStateService {
  private readonly _env = new BehaviorSubject<AppEnvironment | null>(null);

  /** Emits the current environment. Initial `null` until first emission. */
  readonly env$: Observable<AppEnvironment | null> = this._env.asObservable();

  /** Current snapshot (may be `null` before bootstrap completes). */
  get snapshot(): AppEnvironment | null {
    return this._env.value;
  }

  /** Replace the current environment (called after host auto-detection). */
  updateEnv(env: AppEnvironment): void {
    this._env.next(env);
  }
}
