import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-tour-step',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tour-step">
      <h2 class="step-title">🗺️ {{ 'onboarding.tour.title' | translate }}</h2>
      <p class="step-desc">{{ 'onboarding.tour.desc' | translate }}</p>

      <ul class="tour-preview-list">
        <li><span class="tour-icon">📊</span> <strong>Dashboard</strong> — {{ 'onboarding.tour.preview.dashboard' | translate }}</li>
        <li><span class="tour-icon">🗺️</span> <strong>Chart</strong> — {{ 'onboarding.tour.preview.chart' | translate }}</li>
        <li><span class="tour-icon">⚓</span> <strong>Instruments</strong> — {{ 'onboarding.tour.preview.instruments' | translate }}</li>
        <li><span class="tour-icon">🔔</span> <strong>Alarms</strong> — {{ 'onboarding.tour.preview.alarms' | translate }}</li>
        <li><span class="tour-icon">⚙️</span> <strong>Settings</strong> — {{ 'onboarding.tour.preview.settings' | translate }}</li>
      </ul>

      <p class="tour-time">{{ 'onboarding.tour.time' | translate }}</p>

      <div class="wizard-nav">
        <button class="btn-primary" (click)="startTour.emit()">
          {{ 'onboarding.tour.startButton' | translate }} 🎯
        </button>
      </div>

      <button class="skip-link" (click)="skip.emit()">
        {{ 'onboarding.tour.skipButton' | translate }} →
      </button>
    </div>
  `,
  styles: [`
    .tour-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 100%;
      max-width: 420px;
    }

    .step-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gb-text-value, #eceff4);
      margin-bottom: 0.5rem;
    }

    .step-desc {
      font-size: 0.875rem;
      color: var(--gb-text-muted, #7b88a0);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .tour-preview-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1.25rem 0;
      text-align: left;
      width: 100%;
    }

    .tour-preview-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      font-size: 0.85rem;
      color: var(--gb-text-value, #eceff4);
      border-bottom: 1px solid var(--gb-border-panel, rgba(255, 255, 255, 0.06));
    }

    .tour-preview-list li:last-child {
      border-bottom: none;
    }

    .tour-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .tour-preview-list strong {
      color: var(--gb-accent, #4a90d9);
    }

    .tour-time {
      font-size: 0.8rem;
      color: var(--gb-text-muted, #7b88a0);
      margin-bottom: 1rem;
    }

    .wizard-nav {
      margin-top: 0.5rem;
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
  `],
})
export class TourStepComponent {
  startTour = output();
  skip = output();
}
