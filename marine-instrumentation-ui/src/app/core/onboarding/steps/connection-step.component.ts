import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';

@Component({
  selector: 'app-connection-step',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="connection-step">
      <h2 class="step-title">🔗 {{ 'onboarding.connection.title' | translate }}</h2>

      <!-- Server URL -->
      <div class="conn-group">
        <label class="conn-label">{{ 'onboarding.connection.serverUrl' | translate }}</label>
        <input
          type="url"
          class="conn-input"
          [value]="serverUrl()"
          (input)="onUrlChange($event)"
          placeholder="http://localhost:3000"
        />
      </div>

      <!-- Connection status -->
      <div class="conn-status">
        <div class="status-row">
          <span class="conn-label">{{ 'onboarding.connection.status' | translate }}:</span>
          <span class="status-indicator" [class.connected]="isConnected()">
            <span class="status-dot"></span>
            {{ isConnected()
              ? ('onboarding.connection.connected' | translate)
              : ('onboarding.connection.disconnected' | translate) }}
          </span>
        </div>
      </div>

      <p class="conn-hint">
        ℹ️ {{ 'onboarding.connection.hint' | translate }}
      </p>

      <div class="wizard-nav">
        <button class="btn-secondary" (click)="back.emit()">
          ← {{ 'onboarding.back' | translate }}
        </button>
        <button class="btn-primary" (click)="next.emit()">
          {{ 'onboarding.next' | translate }} →
        </button>
      </div>
    </div>
  `,
  styles: [`
    .connection-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 420px;
    }

    .step-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gb-text-value, #eceff4);
      margin-bottom: 1.5rem;
    }

    .conn-group {
      width: 100%;
      margin-bottom: 1.25rem;
    }

    .conn-label {
      display: block;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--gb-text-muted, #7b88a0);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }

    .conn-input {
      width: 100%;
      background: var(--gb-bg-bezel, #1e2231);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      color: var(--gb-text-value, #eceff4);
      padding: 0.6rem 1rem;
      border-radius: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      min-height: 44px;
      box-sizing: border-box;
    }

    .conn-input:focus {
      outline: none;
      border-color: var(--gb-accent, #4a90d9);
    }

    .conn-status {
      width: 100%;
      background: var(--gb-bg-panel, #1e2231);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #f06352;
    }

    .status-indicator.connected {
      color: #22c55e;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f06352;
    }

    .status-indicator.connected .status-dot {
      background: #22c55e;
    }

    .conn-hint {
      font-size: 0.8rem;
      color: var(--gb-text-muted, #7b88a0);
      text-align: center;
      line-height: 1.4;
      margin-bottom: 1rem;
    }

    .wizard-nav {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .btn-primary {
      background: var(--gb-accent, #4a90d9);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      min-height: 44px;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: transparent;
      color: var(--gb-text-muted, #7b88a0);
      border: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.08));
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
    }

    .btn-secondary:hover {
      border-color: var(--gb-text-muted, #7b88a0);
      color: var(--gb-text-value, #eceff4);
    }
  `],
})
export class ConnectionStepComponent implements OnInit, OnDestroy {
  next = output();
  back = output();

  private readonly signalK = inject(SignalKClientService);
  private sub?: Subscription;

  serverUrl = signal('http://localhost:3000');
  isConnected = signal(false);

  ngOnInit(): void {
    this.sub = this.signalK.connected$.subscribe(connected => {
      this.isConnected.set(connected);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onUrlChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.serverUrl.set(value);
  }
}
