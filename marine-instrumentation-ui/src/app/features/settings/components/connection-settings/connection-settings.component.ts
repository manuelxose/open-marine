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
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--gb-text-value);
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--gb-border-panel);
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .setting-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gb-text-value);
    }

    .setting-description {
      font-size: 0.75rem;
      color: var(--gb-text-muted);
    }

    .setting-description code {
      padding: 1px 4px;
      font-size: 0.7rem;
      font-family: 'JetBrains Mono', monospace;
      background: var(--gb-bg-glass, rgba(255,255,255,0.03));
      border-radius: 3px;
      color: var(--gb-needle-secondary, #4a90d9);
    }

    .input-action-group {
      display: flex;
      gap: var(--space-2);
    }

    .setting-input {
      height: 34px;
      padding: 0 var(--space-2);
      font-size: 0.85rem;
      color: var(--gb-text-value);
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      outline: none;
      font-family: 'JetBrains Mono', monospace;
      transition: border-color 150ms ease;
    }

    .setting-input--wide { width: 280px; }

    .setting-input:focus { border-color: var(--gb-border-active, rgba(82, 152, 220, 0.6)); }

    .action-btn {
      height: 34px;
      padding: 0 var(--space-3);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gb-text-value);
      background: var(--gb-bg-glass, rgba(255,255,255,0.03));
      border: 1px solid var(--gb-border-panel);
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 150ms ease;
    }

    .action-btn:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.06));
      border-color: var(--gb-border-active, rgba(82, 152, 220, 0.6));
    }

    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .action-btn--secondary {
      color: var(--gb-text-muted);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      margin: var(--space-2) 0;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      border-radius: 8px;
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
    }

    .status-dot, .test-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    [data-status='connected'] .status-dot { background: var(--gb-data-good); }
    [data-status='disconnected'] .status-dot { background: var(--gb-data-warn); }
    [data-status='offline'] .status-dot { background: var(--gb-data-stale); }

    .status-text { color: var(--gb-text-muted); }

    .status-badge {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .status-badge--on {
      color: var(--gb-data-good);
      background: rgba(var(--gb-data-good-rgb), 0.15);
    }

    .test-result {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-2);
      font-size: 0.8rem;
      color: var(--gb-text-muted);
      border-radius: 8px;
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
    }

    [data-status='testing'] .test-dot { background: var(--gb-data-warn); }
    [data-status='success'] .test-dot { background: var(--gb-data-good); }
    [data-status='error']   .test-dot { background: var(--gb-data-stale); }

    .settings-divider {
      height: 1px;
      background: var(--gb-border-panel);
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
