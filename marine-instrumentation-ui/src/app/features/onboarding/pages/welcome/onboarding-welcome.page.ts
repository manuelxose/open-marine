import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding-welcome',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="onboarding-page">
      <div class="onboarding-card">
        <div class="onboarding-logo" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2v20"/>
            <path d="M2 12h20"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/>
            <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10"/>
          </svg>
        </div>

        <h1 class="onboarding-title">Open Marine Instrumentation</h1>
        <p class="onboarding-subtitle">Professional Marine Navigation</p>

        <p class="onboarding-description">
          Chart plotting, live instruments, alarm management and autopilot control —
          all in one open&#8209;source Glass Bridge application powered by Signal&nbsp;K.
        </p>

        <div class="onboarding-features">
          <div class="feature-chip">
            <span class="feature-icon">🗺️</span>
            <span>Chart Plotter</span>
          </div>
          <div class="feature-chip">
            <span class="feature-icon">📡</span>
            <span>Live Instruments</span>
          </div>
          <div class="feature-chip">
            <span class="feature-icon">🔔</span>
            <span>Smart Alarms</span>
          </div>
          <div class="feature-chip">
            <span class="feature-icon">⚓</span>
            <span>Anchor Watch</span>
          </div>
        </div>

        <a class="onboarding-btn onboarding-btn--primary" routerLink="/onboarding/connection">
          Get Started
        </a>
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
      background: var(--gb-bg-canvas);
    }

    .onboarding-card {
      width: 100%;
      max-width: 480px;
      padding: var(--space-8);
      text-align: center;
      background: var(--gb-bg-panel);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl, 12px);
    }

    .onboarding-logo {
      color: var(--accent, #88c0d0);
      margin-bottom: var(--space-4);
    }

    .onboarding-title {
      margin: 0 0 var(--space-1) 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--gb-text-value);
      letter-spacing: -0.02em;
    }

    .onboarding-subtitle {
      margin: 0 0 var(--space-4) 0;
      font-size: 0.875rem;
      color: var(--gb-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .onboarding-description {
      margin: 0 0 var(--space-6) 0;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--gb-text-muted);
    }

    .onboarding-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      justify-content: center;
      margin-bottom: var(--space-6);
    }

    .feature-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      font-size: 0.8125rem;
      color: var(--gb-text-muted);
      background: var(--bg-elevated, var(--gb-bg-panel));
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full, 999px);
    }

    .feature-icon { font-size: 1rem; }

    .onboarding-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 200px;
      height: 44px;
      padding: 0 var(--space-6);
      font-size: 0.9375rem;
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
    }
  `],
})
export class OnboardingWelcomePage {}
