import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { SignalKClientService } from '../../../../data-access/signalk/signalk-client.service';
import { NetworkStatusService } from '../../../../core/services/network-status.service';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

@Component({
  selector: 'app-connection-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2>Signal K Connection</h2>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Server URL</span>
          <span class="setting-description">
            WebSocket URL of your Signal K server.
            Typically <code>ws://[hostname]:3000</code>.
          </span>
        </div>
        <div class="input-action-group">
          <input
            type="url"
            class="setting-input setting-input--wide"
            [(ngModel)]="serverUrl"
            placeholder="ws://localhost:3000"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="button"
            class="action-btn"
            (click)="testConnection()"
            [disabled]="(testStatus$ | async) === 'testing'"
          >
            {{ (testStatus$ | async) === 'testing' ? 'Testing…' : 'Test' }}
          </button>
        </div>
      </div>

      <!-- Connection status -->
      <div
        class="connection-status"
        [attr.data-status]="(connected$ | async) ? 'connected' : (online$ | async) ? 'disconnected' : 'offline'"
      >
        <span class="status-dot"></span>
        <span class="status-text" *ngIf="connected$ | async">Connected</span>
        <span class="status-text" *ngIf="!(connected$ | async) && (online$ | async)">Disconnected</span>
        <span class="status-text" *ngIf="!(online$ | async)">Offline</span>
      </div>

      <!-- Test result -->
      <div
        class="test-result"
        *ngIf="(testStatus$ | async) !== 'idle'"
        [attr.data-status]="testStatus$ | async"
      >
        <span class="test-dot"></span>
        <span>{{ testMessage$ | async }}</span>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Auto Reconnect</span>
          <span class="setting-description">Automatically reconnect if connection drops.</span>
        </div>
        <span class="status-badge status-badge--on">Enabled</span>
      </div>

      <div class="settings-divider"></div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Demo Mode</span>
          <span class="setting-description">
            Use built-in simulator for testing. Real Signal K connection will be disabled.
          </span>
        </div>
        <button type="button" class="action-btn action-btn--secondary">
          Enable Demo Mode
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-section h2 {
      margin: 0 0 var(--space-4) 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-default);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .setting-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .setting-description {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .setting-description code {
      padding: 1px 4px;
      font-size: 0.7rem;
      background: var(--bg-elevated, var(--bg-surface));
      border-radius: 3px;
      color: var(--accent, #88c0d0);
    }

    .input-action-group {
      display: flex;
      gap: var(--space-2);
    }

    .setting-input {
      height: 36px;
      padding: 0 var(--space-2);
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--bg-base);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 6px);
      outline: none;
      font-family: monospace;
    }

    .setting-input--wide { width: 280px; }

    .setting-input:focus { border-color: var(--accent, #88c0d0); }

    .action-btn {
      height: 36px;
      padding: 0 var(--space-3);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--bg-elevated, var(--bg-surface));
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 6px);
      cursor: pointer;
      white-space: nowrap;
    }

    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .action-btn--secondary {
      color: var(--text-secondary);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      margin: var(--space-2) 0;
      font-size: 0.8125rem;
      border-radius: var(--radius-md, 6px);
      background: var(--bg-base);
    }

    .status-dot, .test-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    [data-status='connected'] .status-dot { background: var(--success, #a3be8c); }
    [data-status='disconnected'] .status-dot { background: var(--warn, #ebcb8b); }
    [data-status='offline'] .status-dot { background: var(--danger, #bf616a); }

    .status-text { color: var(--text-secondary); }

    .status-badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: var(--radius-full, 999px);
    }
    .status-badge--on {
      color: var(--success, #a3be8c);
      background: color-mix(in srgb, var(--success, #a3be8c) 15%, transparent);
    }

    .test-result {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-2);
      font-size: 0.8125rem;
      color: var(--text-secondary);
      border-radius: var(--radius-md, 6px);
      background: var(--bg-base);
    }

    [data-status='testing'] .test-dot { background: var(--warn, #ebcb8b); }
    [data-status='success'] .test-dot { background: var(--success, #a3be8c); }
    [data-status='error']   .test-dot { background: var(--danger, #bf616a); }

    .settings-divider {
      height: 1px;
      background: var(--border-default);
      margin: var(--space-4) 0;
    }
  `],
})
export class ConnectionSettingsComponent {
  private readonly signalK = inject(SignalKClientService);
  private readonly networkStatus = inject(NetworkStatusService);

  readonly connected$ = this.signalK.connected$;
  readonly online$ = this.networkStatus.online$;

  serverUrl = 'ws://localhost:3000';

  readonly testStatus$ = new BehaviorSubject<TestStatus>('idle');
  readonly testMessage$ = new BehaviorSubject<string>('');

  testConnection(): void {
    if (this.testStatus$.value === 'testing') return;

    this.testStatus$.next('testing');
    this.testMessage$.next('Connecting…');

    const url = this.serverUrl.replace(/\/+$/, '') + '/signalk/v1/stream?subscribe=none';
    let ws: WebSocket | null = null;

    const timeout = setTimeout(() => {
      ws?.close();
      this.testStatus$.next('error');
      this.testMessage$.next('Connection timed out after 5 seconds.');
    }, 5000);

    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        clearTimeout(timeout);
        this.testStatus$.next('success');
        this.testMessage$.next('Connected successfully.');
        ws?.close();
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        this.testStatus$.next('error');
        this.testMessage$.next('Unable to connect. Check the URL and try again.');
      };
    } catch {
      clearTimeout(timeout);
      this.testStatus$.next('error');
      this.testMessage$.next('Invalid URL format.');
    }
  }
}
