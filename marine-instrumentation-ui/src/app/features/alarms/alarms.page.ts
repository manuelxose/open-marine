import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AlarmsFacadeService } from './services/alarms-facade.service';
import { AlarmSeverity, AlarmState } from '../../state/alarms/alarm.models';
import { map } from 'rxjs';
import { AlarmSettingsService, AlarmSettings } from '../../state/alarms/alarm-settings.service';
import { AnchorWatchComponent } from './components/anchor-watch/anchor-watch.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppModalComponent } from '../../shared/components/app-modal/app-modal.component';

@Component({
  selector: 'app-alarms-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AnchorWatchComponent, AppButtonComponent, AppModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alarms-page">
      <div class="page-header">
        <div>
          <h1>{{ 'alarms.page.title' | translate }}</h1>
          <p class="subtitle" [class.has-alarm]="vm()?.hasActiveAlarm">
            {{ (vm()?.hasActiveAlarm ? 'alarms.page.active' : 'alarms.page.no_active') | translate }}
          </p>
        </div>
        <div class="header-actions">
          <app-button variant="secondary" [iconLeft]="'settings'" (click)="showSettings = true">
            Configurar
          </app-button>
        </div>
      </div>

      @if (vm()?.hasActiveAlarm) {
        <div class="active-alarms-list">
          @for (alarm of vm()!.alarms; track alarm.id) {
            <div class="alarm-card" [class]="alarm.severityClass">
              <div class="alarm-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div class="alarm-content">
                <div class="alarm-severity">{{ alarm.severity | uppercase }}</div>
                <div class="alarm-message">{{ alarm.message }}</div>
                @if (alarm.acknowledged) {
                  <div class="alarm-ack-badge">Acknowledged</div>
                }
              </div>
              @if (!alarm.acknowledged) {
                <button class="ack-button" (click)="onAcknowledge(alarm.id)">
                  Acknowledge
                </button>
              }
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3>All Clear</h3>
          <p>No active alarms or warnings at this time</p>
        </div>
      }

      <app-modal
        [isOpen]="showSettings"
        title="Configuracion de alarmas"
        size="lg"
        [showFooter]="false"
        (close)="showSettings = false"
      >
        <div class="settings-header">
          <h2>CONFIGURACION DE ALARMAS</h2>
          <p>Ajusta umbrales y sensibilidad de las alertas activas.</p>
        </div>
        <div class="settings-grid">
          <div class="settings-card">
            <h3>Shallow Water</h3>
            <div class="settings-row">
              <label>Threshold (m)</label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.1"
                [ngModel]="settings().shallowDepthThreshold"
                (ngModelChange)="updateSetting('shallowDepthThreshold', $event, 0.5, 50, 1)"
              />
            </div>
          </div>

          <div class="settings-card">
            <h3>Battery Low</h3>
            <div class="settings-row">
              <label>Threshold (V)</label>
              <input
                type="number"
                min="9"
                max="14"
                step="0.1"
                [ngModel]="settings().lowBatteryThreshold"
                (ngModelChange)="updateSetting('lowBatteryThreshold', $event, 9, 14, 1)"
              />
            </div>
          </div>

          <div class="settings-card">
            <h3>CPA Warning</h3>
            <div class="settings-row">
              <label>Distance (NM)</label>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                [ngModel]="settings().cpaThresholdNm"
                (ngModelChange)="updateSetting('cpaThresholdNm', $event, 0.1, 5, 2)"
              />
            </div>
            <div class="settings-row">
              <label>TCPA (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                step="1"
                [ngModel]="settings().cpaTcpaMinutes"
                (ngModelChange)="updateSetting('cpaTcpaMinutes', $event, 1, 60, 0)"
              />
            </div>
          </div>

          <div class="settings-card">
            <h3>GPS Lost</h3>
            <div class="settings-row">
              <label>Timeout (s)</label>
              <input
                type="number"
                min="5"
                max="180"
                step="1"
                [ngModel]="settings().gpsLostSeconds"
                (ngModelChange)="updateSetting('gpsLostSeconds', $event, 5, 180, 0)"
              />
            </div>
          </div>

          <app-anchor-watch class="settings-anchor"></app-anchor-watch>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .alarms-page {
      padding: 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      overflow-y: auto;
      min-height: 0;
    }

    .page-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--fg);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--success);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .subtitle.has-alarm {
      color: var(--danger);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .alarm-card {
      background: var(--card-bg);
      border: 2px solid var(--card-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 0.75rem;
    }

    .alarm-card.alarm-warning {
      border-color: var(--warn);
      background: rgba(245, 158, 11, 0.1);
    }

    .alarm-card.alarm-critical {
      border-color: var(--danger);
      background: rgba(239, 68, 68, 0.1);
    }

    .alarm-icon {
      flex-shrink: 0;
    }

    .alarm-warning .alarm-icon {
      color: var(--warn);
    }

    .alarm-critical .alarm-icon {
      color: var(--danger);
    }

    .alarm-content {
      flex: 1;
    }

    .alarm-severity {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .alarm-warning .alarm-severity {
      color: var(--warn);
    }

    .alarm-critical .alarm-severity {
      color: var(--danger);
    }

    .alarm-message {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--fg);
    }

    .alarm-ack-badge {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: var(--muted);
      color: white;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .ack-button {
      flex-shrink: 0;
      padding: 0.75rem 1.5rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .ack-button:hover {
      background: color-mix(in srgb, var(--accent), black 10%);
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .empty-state svg {
      color: var(--success);
      opacity: 0.7;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--fg);
      margin: 0;
    }

    .empty-state p {
      color: var(--muted);
      margin: 0;
    }

    .settings-header h2 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .settings-header p {
      margin: 0.35rem 0 0;
      font-size: 0.85rem;
      color: var(--muted);
    }

    .settings-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      align-items: start;
    }

    .settings-card {
      background: var(--surface-1);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      box-shadow: var(--shadow);
    }

    .settings-card h3 {
      margin: 0;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-2, var(--muted));
      font-weight: 700;
    }

    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .settings-row label {
      font-size: 0.8rem;
      color: var(--text-1, var(--fg));
    }

    .settings-row input {
      width: 120px;
      background: var(--surface-2);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.4rem 0.5rem;
      color: var(--text-1, var(--fg));
      font-family: var(--font-mono);
      font-size: 0.85rem;
      text-align: right;
    }

    .settings-anchor {
      width: 100%;
    }
  `],
})
export class AlarmsPage {
  private readonly facade = inject(AlarmsFacadeService);
  private readonly settingsService = inject(AlarmSettingsService);
  showSettings = false;

  readonly vm = toSignal(
    this.facade.activeAlarms$.pipe(
      map((alarms) => {
        const items = alarms.map((alarm) => {
          const severity =
            alarm.severity === AlarmSeverity.Critical || alarm.severity === AlarmSeverity.Emergency
              ? 'critical'
              : 'warning';

          return {
            id: alarm.id,
            acknowledged: alarm.state !== AlarmState.Active,
            severity,
            message: alarm.message,
            threshold: alarm.data?.threshold ?? null,
            severityClass: severity === 'critical' ? 'alarm-critical' : 'alarm-warning',
          };
        });

        return {
          hasActiveAlarm: items.length > 0,
          alarms: items,
        };
      })
    )
  );

  readonly settings = toSignal(this.settingsService.settings$, {
    initialValue: this.settingsService.snapshot,
  });

  onAcknowledge(id?: string): void {
    if (!id) return;
    this.facade.acknowledgeAlarm(id);
  }

  updateSetting(
    key: keyof AlarmSettings,
    value: number,
    min: number,
    max: number,
    decimals: number
  ): void {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    const clamped = Math.min(max, Math.max(min, numeric));
    const rounded = decimals >= 0 ? Number(clamped.toFixed(decimals)) : clamped;
    this.settingsService.update({ [key]: rounded } as Partial<AlarmSettings>);
  }
}
