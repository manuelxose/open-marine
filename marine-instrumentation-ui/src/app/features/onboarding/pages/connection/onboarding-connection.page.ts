import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

@Component({
  selector: 'app-onboarding-connection',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="onboarding-page">
      <div class="onboarding-card">
        <a class="back-link" routerLink="/onboarding/welcome">&larr; Back</a>

        <h1 class="onboarding-title">Connect to Signal K</h1>
        <p class="onboarding-subtitle">Step 1 of 2</p>

        <p class="onboarding-description">
          Enter the WebSocket URL of your Signal&nbsp;K server.
          If you're running OpenPlotter, the default is usually
          <code>ws://openplotter.local:3000</code>.
        </p>

        <div class="field">
          <label class="field-label" for="sk-url">Server URL</label>
          <div class="field-row">
            <input
              id="sk-url"
              type="url"
              class="field-input"
              [(ngModel)]="serverUrl"
              placeholder="ws://localhost:3000"
              autocomplete="off"
              spellcheck="false"
            />
            <button
              class="field-action"
              type="button"
              (click)="testConnection()"
              [disabled]="(testStatus$ | async) === 'testing'"
            >
              {{ (testStatus$ | async) === 'testing' ? 'Testing…' : 'Test' }}
            </button>
          </div>
        </div>

        <!-- Status indicator -->
        <div
          class="connection-status"
          *ngIf="(testStatus$ | async) !== 'idle'"
          [attr.data-status]="testStatus$ | async"
        >
          <span class="status-dot"></span>
          <span class="status-text">{{ statusMessage$ | async }}</span>
        </div>

        <div class="actions">
          <a
            class="onboarding-btn onboarding-btn--primary"
            routerLink="/onboarding/vessel"
            [class.disabled]="(testStatus$ | async) !== 'success'"
          >
            Continue
          </a>
          <button
            class="onboarding-btn onboarding-btn--ghost"
            type="button"
            (click)="skipWithDemo()"
          >
            Use Demo Mode
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .onboarding-page {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--space-4);
      background: var(--bg-base);
    }

    .onboarding-card {
      width: 100%;
      max-width: 480px;
      padding: var(--space-8);
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl, 12px);
    }

    .back-link {
      display: inline-block;
      margin-bottom: var(--space-4);
      font-size: 0.8125rem;
      color: var(--text-secondary);
      text-decoration: none;
    }
    .back-link:hover { color: var(--text-primary); }

    .onboarding-title {
      margin: 0 0 var(--space-1) 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .onboarding-subtitle {
      margin: 0 0 var(--space-4) 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .onboarding-description {
      margin: 0 0 var(--space-6) 0;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    .onboarding-description code {
      padding: 2px 6px;
      font-size: 0.8125rem;
      background: var(--bg-elevated, var(--bg-surface));
      border-radius: var(--radius-sm, 4px);
      color: var(--accent, #88c0d0);
    }

    .field { margin-bottom: var(--space-4); }

    .field-label {
      display: block;
      margin-bottom: var(--space-1);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .field-row {
      display: flex;
      gap: var(--space-2);
    }

    .field-input {
      flex: 1;
      height: 44px;
      padding: 0 var(--space-3);
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--bg-base);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 8px);
      outline: none;
      font-family: monospace;
    }

    .field-input:focus {
      border-color: var(--accent, #88c0d0);
    }

    .field-action {
      height: 44px;
      padding: 0 var(--space-4);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--bg-elevated, var(--bg-surface));
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      white-space: nowrap;
    }

    .field-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3);
      margin-bottom: var(--space-4);
      font-size: 0.8125rem;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-default);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    [data-status='testing'] .status-dot { background: var(--warn, #ebcb8b); }
    [data-status='success'] .status-dot { background: var(--success, #a3be8c); }
    [data-status='error']   .status-dot { background: var(--danger, #bf616a); }

    .status-text { color: var(--text-secondary); }

    .actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-6);
    }

    .onboarding-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      padding: 0 var(--space-6);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: var(--radius-md, 8px);
      border: none;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }

    .onboarding-btn:hover { opacity: 0.9; }

    .onboarding-btn--primary {
      color: var(--bg-base, #0b1116);
      background: var(--accent, #88c0d0);
      text-align: center;
    }

    .onboarding-btn--primary.disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    .onboarding-btn--ghost {
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid var(--border-default);
    }
  `],
})
export class OnboardingConnectionPage {
  private readonly router = inject(Router);

  serverUrl = 'ws://localhost:3000';

  readonly testStatus$ = new BehaviorSubject<TestStatus>('idle');
  readonly statusMessage$ = new BehaviorSubject<string>('');

  testConnection(): void {
    if (this.testStatus$.value === 'testing') return;

    this.testStatus$.next('testing');
    this.statusMessage$.next('Connecting…');

    const url = this.buildWsUrl(this.serverUrl);
    let ws: WebSocket | null = null;

    const timeout = setTimeout(() => {
      ws?.close();
      this.testStatus$.next('error');
      this.statusMessage$.next('Connection timed out after 5 seconds.');
    }, 5000);

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.testStatus$.next('success');
        this.statusMessage$.next('Connected to Signal K server.');
        ws?.close();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        this.testStatus$.next('error');
        this.statusMessage$.next('Unable to connect. Check the URL and try again.');
      };
    } catch {
      clearTimeout(timeout);
      this.testStatus$.next('error');
      this.statusMessage$.next('Invalid URL format.');
    }
  }

  skipWithDemo(): void {
    // Go to vessel page in demo mode
    this.router.navigate(['/onboarding/vessel'], {
      queryParams: { demo: true },
    });
  }

  private buildWsUrl(raw: string): string {
    const base = raw.replace(/\/+$/, '');
    if (base.includes('/signalk/')) return base;
    return `${base}/signalk/v1/stream?subscribe=none`;
  }
}
