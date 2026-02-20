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
import { AppModalComponent } from '../../shared/components/app-modal/app-modal.component';

@Component({
  selector: 'app-alarms-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AnchorWatchComponent, AppModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alarms-page">
      <!-- Toolbar -->
      <div class="alarms-toolbar">
        <h1>{{ 'alarms.page.title' | translate }}</h1>
        <span class="toolbar-spacer"></span>
        <span class="alarms-toolbar__status" [class.active]="vm()?.hasActiveAlarm">
          {{ vm()?.hasActiveAlarm ? vm()!.alarms.length + ' active' : 'All clear' }}
        </span>
        <button class="alarms-toolbar__btn" (click)="showSettings = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Config
        </button>
      </div>

      <!-- Alarm list -->
      @if (vm()?.hasActiveAlarm) {
        <div class="alarms-list">
          @for (alarm of vm()!.alarms; track alarm.id) {
            <div class="alarm-row" [attr.data-severity]="alarm.severity"
                 [attr.data-state]="alarm.acknowledged ? 'acknowledged' : 'active'">
              <div class="alarm-row__severity-icon">
                @if (alarm.severity === 'critical' || alarm.severity === 'emergency') {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                }
              </div>
              <div class="alarm-row__body">
                <div class="alarm-name">{{ alarm.message }}</div>
                <div class="alarm-meta">
                  {{ alarm.severity | uppercase }}
                  @if (alarm.acknowledged) { · Acknowledged }
                </div>
              </div>
              <div class="alarm-row__actions">
                @if (!alarm.acknowledged) {
                  <button class="alarm-row__ack-btn" (click)="onAcknowledge(alarm.id)">ACK</button>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="alarms-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h3>All Clear</h3>
          <p>No active alarms or warnings</p>
        </div>
      }

      <!-- Settings modal -->
      <app-modal
        [isOpen]="showSettings"
        title="Alarm Configuration"
        size="lg"
        [showFooter]="false"
        (close)="showSettings = false"
      >
        <div class="settings-section-title">ALARM THRESHOLDS</div>
        <div class="settings-grid">
          <div class="settings-group">
            <div class="settings-group__title">Shallow Water</div>
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Threshold</div>
                <div class="settings-row__desc">Alarm below this depth (m)</div>
              </div>
              <div class="settings-row__control">
                <input
                  type="number" min="0.5" max="50" step="0.1"
                  [ngModel]="settings().shallowDepthThreshold"
                  (ngModelChange)="updateSetting('shallowDepthThreshold', $event, 0.5, 50, 1)"
                />
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group__title">Battery Low</div>
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Threshold</div>
                <div class="settings-row__desc">Alarm below this voltage (V)</div>
              </div>
              <div class="settings-row__control">
                <input
                  type="number" min="9" max="14" step="0.1"
                  [ngModel]="settings().lowBatteryThreshold"
                  (ngModelChange)="updateSetting('lowBatteryThreshold', $event, 9, 14, 1)"
                />
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group__title">CPA Warning</div>
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Distance (NM)</div>
                <div class="settings-row__desc">Closest point of approach</div>
              </div>
              <div class="settings-row__control">
                <input
                  type="number" min="0.1" max="5" step="0.1"
                  [ngModel]="settings().cpaThresholdNm"
                  (ngModelChange)="updateSetting('cpaThresholdNm', $event, 0.1, 5, 2)"
                />
              </div>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row__label">TCPA (min)</div>
                <div class="settings-row__desc">Time to closest point of approach</div>
              </div>
              <div class="settings-row__control">
                <input
                  type="number" min="1" max="60" step="1"
                  [ngModel]="settings().cpaTcpaMinutes"
                  (ngModelChange)="updateSetting('cpaTcpaMinutes', $event, 1, 60, 0)"
                />
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group__title">GPS Lost</div>
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Timeout (s)</div>
                <div class="settings-row__desc">No GPS fix for this long</div>
              </div>
              <div class="settings-row__control">
                <input
                  type="number" min="5" max="180" step="1"
                  [ngModel]="settings().gpsLostSeconds"
                  (ngModelChange)="updateSetting('gpsLostSeconds', $event, 5, 180, 0)"
                />
              </div>
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

    /* ── Page shell ───────────────────────────────── */
    .alarms-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--gb-bg-canvas);
    }

    /* ── Toolbar ──────────────────────────────────── */
    .alarms-toolbar {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      padding: var(--space-3, 12px) var(--space-5, 24px);
      border-bottom: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-bezel);
      flex-shrink: 0;
    }

    .alarms-toolbar h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--gb-text-muted);
      margin: 0;
    }

    .toolbar-spacer { flex: 1; }

    .alarms-toolbar__status {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--gb-text-muted);
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--gb-bg-panel);
    }

    .alarms-toolbar__status.active {
      color: var(--gb-alarm-critical-border);
      background: var(--gb-alarm-critical-bg);
    }

    .alarms-toolbar__btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid var(--gb-border-panel);
      border-radius: 10px;
      background: var(--gb-bg-panel);
      color: var(--gb-text-muted);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .alarms-toolbar__btn:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.04));
      color: var(--gb-text-value);
    }

    .alarms-toolbar__btn svg {
      width: 16px;
      height: 16px;
    }

    /* ── Alarm list ───────────────────────────────── */
    .alarms-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-3, 12px) var(--space-5, 24px);
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
    }

    /* ── Alarm row ────────────────────────────────── */
    .alarm-row {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border-radius: 12px;
      border: 1px solid;
      transition: border-color 300ms ease, background 300ms ease;
    }

    .alarm-row[data-severity="emergency"] {
      background: var(--gb-alarm-emergency-bg);
      border-color: var(--gb-alarm-emergency-border);
      animation: gb-alarm-beat 0.8s ease-in-out infinite;
    }

    .alarm-row[data-severity="critical"] {
      background: var(--gb-alarm-critical-bg);
      border-color: var(--gb-alarm-critical-border);
    }

    .alarm-row[data-severity="warning"] {
      background: var(--gb-alarm-warning-bg);
      border-color: var(--gb-alarm-warning-border);
    }

    .alarm-row[data-state="resolved"] {
      opacity: 0.5;
      animation: none;
    }

    @keyframes gb-alarm-beat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.01); }
    }

    /* ── Severity icon ────────────────────────────── */
    .alarm-row__severity-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .alarm-row[data-severity="emergency"] .alarm-row__severity-icon,
    .alarm-row[data-severity="critical"] .alarm-row__severity-icon {
      color: var(--gb-alarm-critical-border);
    }

    .alarm-row[data-severity="warning"] .alarm-row__severity-icon {
      color: var(--gb-alarm-warning-border);
    }

    /* ── Body ─────────────────────────────────────── */
    .alarm-row__body {
      flex: 1;
      min-width: 0;
    }

    .alarm-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--gb-text-value);
    }

    .alarm-meta {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      color: var(--gb-text-muted);
      margin-top: 4px;
    }

    /* ── Actions ──────────────────────────────────── */
    .alarm-row__actions {
      display: flex;
      gap: var(--space-2, 8px);
      flex-shrink: 0;
    }

    .alarm-row__ack-btn {
      padding: 6px 16px;
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      background: var(--gb-bg-panel);
      color: var(--gb-text-value);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .alarm-row__ack-btn:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.06));
    }

    /* ── Empty state ──────────────────────────────── */
    .alarms-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3, 12px);
    }

    .alarms-empty svg {
      color: var(--gb-text-muted);
      opacity: 0.5;
    }

    .alarms-empty h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--gb-text-value);
      margin: 0;
    }

    .alarms-empty p {
      font-size: 0.8rem;
      color: var(--gb-text-muted);
      margin: 0;
    }

    /* ── Settings (inside modal) ──────────────────── */
    .settings-section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--gb-text-muted);
      margin-bottom: var(--space-4, 16px);
    }

    .settings-grid {
      display: grid;
      gap: var(--space-4, 16px);
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      align-items: start;
    }

    .settings-group {
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 14px;
      overflow: hidden;
    }

    .settings-group__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--gb-text-muted);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border-bottom: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-bezel);
    }

    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      gap: var(--space-4, 16px);
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .settings-row:last-child { border-bottom: none; }

    .settings-row__label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gb-text-value);
    }

    .settings-row__desc {
      font-size: 0.75rem;
      color: var(--gb-text-muted);
      margin-top: 2px;
    }

    .settings-row__control {
      flex-shrink: 0;
    }

    .settings-row__control input {
      width: 100px;
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      padding: 6px 8px;
      color: var(--gb-text-value);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      text-align: right;
    }

    .settings-anchor {
      grid-column: 1 / -1;
    }

    @media (max-width: 640px) {
      .alarms-toolbar {
        padding: var(--space-2, 8px) var(--space-3, 12px);
        flex-wrap: wrap;
      }
      .alarms-list {
        padding: var(--space-2, 8px) var(--space-3, 12px);
      }
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
            threshold: alarm.data?.['threshold'] ?? null,
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
