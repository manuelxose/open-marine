import { Injectable, inject, OnDestroy } from '@angular/core';
import { pairwise, Subscription } from 'rxjs';
import { AppToastService } from '../../shared/components/app-toast/app-toast.service';
import { ConnectivityService } from '../../state/connectivity/connectivity.service';

/**
 * Central notification bus for the entire application.
 *
 * Wraps {@link AppToastService} with semantic methods. Also auto-subscribes
 * to connectivity changes so the user always sees when Signal K goes down
 * or comes back.
 *
 * Usage from any service/component:
 * ```ts
 * notification.error('autopilot engine unreachable', 'Autopilot');
 * notification.success('route uploaded', 'Navigation');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly toast = inject(AppToastService);
  private readonly connectivity = inject(ConnectivityService);
  private sub?: Subscription;

  constructor() {
    this._wireConnectivity();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /** Critical failure (8 s). */
  error(message: string, source?: string): void {
    this.toast.show({
      message: source ? `[${source}] ${message}` : message,
      type: 'error',
      duration: 8000,
    });
  }

  /** Non-critical warning (5 s). */
  warn(message: string, source?: string): void {
    this.toast.show({
      message: source ? `[${source}] ${message}` : message,
      type: 'warning',
      duration: 5000,
    });
  }

  /** Informational (4 s). */
  info(message: string, source?: string): void {
    this.toast.show({
      message: source ? `[${source}] ${message}` : message,
      type: 'info',
      duration: 4000,
    });
  }

  /** Positive confirmation (3 s). */
  success(message: string, source?: string): void {
    this.toast.show({
      message: source ? `[${source}] ${message}` : message,
      type: 'success',
      duration: 3000,
    });
  }

  // ── Domain helpers ─────────────────────────────────────────────────────

  connectivityLost(host?: string): void {
    this.warn(
      host ? `Signal K connection lost to ${host}` : 'Signal K connection lost',
      'Connectivity',
    );
  }

  connectivityRestored(host?: string): void {
    this.success(host ? `Reconnected to ${host}` : 'Signal K reconnected', 'Connectivity');
  }

  autopilotUnreachable(): void {
    this.error(
      'Autopilot engine unreachable — verify the Raspberry Pi is running omi-autopilot.service',
      'Autopilot',
    );
  }

  // ── Internal wiring ────────────────────────────────────────────────────

  private _wireConnectivity(): void {
    this.sub = this.connectivity.state$.pipe(pairwise()).subscribe(([prev, curr]) => {
      if (prev.isConnected && !curr.isConnected) {
        this.connectivityLost();
      }
      if (!prev.isConnected && curr.isConnected) {
        this.connectivityRestored();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
