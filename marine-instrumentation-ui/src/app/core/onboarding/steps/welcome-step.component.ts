import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-welcome-step',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="welcome-step">
      <div class="welcome-logo">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
          <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="1" opacity="0.2"/>
          <line x1="32" y1="2" x2="32" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="32" y1="54" x2="32" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="2" y1="32" x2="10" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="54" y1="32" x2="62" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="10.8" y1="10.8" x2="15.5" y2="15.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          <line x1="48.5" y1="48.5" x2="53.2" y2="53.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          <line x1="53.2" y1="10.8" x2="48.5" y2="15.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          <line x1="15.5" y1="48.5" x2="10.8" y2="53.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          <polygon points="32,12 35,30 32,28 29,30" fill="currentColor" opacity="0.9"/>
          <polygon points="32,52 35,34 32,36 29,34" fill="currentColor" opacity="0.35"/>
          <circle cx="32" cy="32" r="2.5" fill="currentColor"/>
          <text x="32" y="9" text-anchor="middle" font-size="5" font-weight="700" fill="currentColor" font-family="Space Grotesk, sans-serif">N</text>
        </svg>
      </div>

      <h1 class="welcome-title">Open Marine Instrumentation</h1>
      <p class="welcome-desc">{{ 'onboarding.welcome.desc' | translate }}</p>

      <ul class="feature-list">
        <li>
          <span class="feature-icon">📊</span>
          <span>{{ 'onboarding.welcome.feature1' | translate }}</span>
        </li>
        <li>
          <span class="feature-icon">🗺️</span>
          <span>{{ 'onboarding.welcome.feature2' | translate }}</span>
        </li>
        <li>
          <span class="feature-icon">🔔</span>
          <span>{{ 'onboarding.welcome.feature3' | translate }}</span>
        </li>
        <li>
          <span class="feature-icon">⚓</span>
          <span>{{ 'onboarding.welcome.feature4' | translate }}</span>
        </li>
      </ul>

      <div class="wizard-nav">
        <button class="btn-primary" (click)="next.emit()">
          {{ 'onboarding.welcome.getStarted' | translate }} →
        </button>
      </div>

      <button class="skip-link" (click)="skip.emit()">
        {{ 'onboarding.welcome.skipSetup' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .welcome-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem;
    }

    .welcome-logo {
      width: 100px;
      height: 100px;
      color: var(--gb-accent, #4a90d9);
      animation: logo-enter 0.8s ease-out;
    }

    .welcome-logo svg {
      width: 100%;
      height: 100%;
    }

    .welcome-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--gb-text-value, #eceff4);
      margin-top: 1.25rem;
      letter-spacing: 0.05em;
    }

    .welcome-desc {
      font-size: 0.875rem;
      color: var(--gb-text-muted, #7b88a0);
      margin-top: 0.5rem;
      line-height: 1.5;
      max-width: 380px;
    }

    .feature-list {
      list-style: none;
      padding: 0;
      margin: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      text-align: left;
    }

    .feature-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: var(--gb-text-value, #eceff4);
    }

    .feature-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .wizard-nav {
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

    .skip-link {
      margin-top: 1rem;
      background: none;
      border: none;
      color: var(--gb-text-muted, #7b88a0);
      font-size: 0.8rem;
      cursor: pointer;
      opacity: 0.6;
      font-family: 'Space Grotesk', sans-serif;
    }

    .skip-link:hover {
      opacity: 1;
      text-decoration: underline;
    }

    @keyframes logo-enter {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 640px), (max-height: 720px) {
      .welcome-step {
        box-sizing: border-box;
        width: 100%;
        padding: var(--space-2) 0;
      }

      .welcome-logo {
        width: 72px;
        height: 72px;
      }

      .welcome-title {
        margin: var(--space-3) 0 0;
        font-size: 1.15rem;
      }

      .welcome-desc {
        margin-top: var(--space-2);
      }

      .feature-list {
        margin: var(--space-4) 0;
        gap: var(--space-2);
      }

      .wizard-nav,
      .skip-link {
        margin-top: var(--space-2);
      }

      .btn-primary {
        width: min(100%, 320px);
      }
    }
  `],
})
export class WelcomeStepComponent {
  next = output();
  skip = output();
}
