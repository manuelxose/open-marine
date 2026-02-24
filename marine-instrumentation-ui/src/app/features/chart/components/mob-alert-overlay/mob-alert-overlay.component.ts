import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mob-alert-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mob-overlay"
      *ngIf="active"
      role="alertdialog"
      aria-live="assertive"
      aria-label="Man Overboard Alert"
    >
      <div class="mob-overlay__content">
        <h1 class="mob-overlay__title">
          <span class="mob-overlay__icon">🚨</span>
          MAN OVERBOARD
        </h1>

        <div class="mob-overlay__timer">
          <span class="mob-overlay__timer-value">{{ elapsed }}</span>
          <span class="mob-overlay__timer-label">TIME SINCE MOB</span>
        </div>

        <div class="mob-overlay__nav">
          <div class="mob-overlay__datum" *ngIf="distanceNm !== null">
            <span class="mob-overlay__label">DISTANCE</span>
            <span class="mob-overlay__value">{{ distanceNm | number: '1.2-2' }} NM</span>
          </div>
          <div class="mob-overlay__datum" *ngIf="bearingDeg !== null">
            <span class="mob-overlay__label">BEARING</span>
            <span class="mob-overlay__value">{{ bearingDeg }}°</span>
          </div>
        </div>

        <div class="mob-overlay__position" *ngIf="positionText">
          <span class="mob-overlay__label">MOB POSITION</span>
          <span class="mob-overlay__coords">{{ positionText }}</span>
        </div>

        <button
          class="mob-overlay__cancel-btn"
          (click)="cancelMob.emit()"
          aria-label="Cancel MOB alert - False alarm"
        >
          CANCEL / FALSE ALARM
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .mob-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(180, 10, 10, 0.85);
        animation: mob-bg-pulse 1.5s ease-in-out infinite;
        backdrop-filter: blur(4px);
      }

      @keyframes mob-bg-pulse {
        0%,
        100% {
          background: rgba(180, 10, 10, 0.85);
        }
        50% {
          background: rgba(220, 20, 20, 0.95);
        }
      }

      .mob-overlay__content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-6, 1.5rem);
        max-width: 480px;
        padding: var(--space-8, 2rem);
        text-align: center;
        color: #fff;
      }

      .mob-overlay__title {
        display: flex;
        align-items: center;
        gap: var(--space-3, 0.75rem);
        margin: 0;
        font-family: var(--font-sans, 'Space Grotesk', sans-serif);
        font-size: 2.5rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
      }

      .mob-overlay__icon {
        font-size: 3rem;
        animation: mob-icon-shake 0.4s ease-in-out infinite;
      }

      @keyframes mob-icon-shake {
        0%,
        100% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(-8deg);
        }
        75% {
          transform: rotate(8deg);
        }
      }

      .mob-overlay__timer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1, 0.25rem);
      }

      .mob-overlay__timer-value {
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 3rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }

      .mob-overlay__timer-label {
        font-family: var(--font-sans, 'Space Grotesk', sans-serif);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.7;
      }

      .mob-overlay__nav {
        display: flex;
        gap: var(--space-8, 2rem);
      }

      .mob-overlay__datum {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1, 0.25rem);
      }

      .mob-overlay__label {
        font-family: var(--font-sans, 'Space Grotesk', sans-serif);
        font-size: 0.6rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.6;
      }

      .mob-overlay__value {
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 0.04em;
      }

      .mob-overlay__position {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1, 0.25rem);
      }

      .mob-overlay__coords {
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 0.9rem;
        letter-spacing: 0.02em;
        opacity: 0.85;
      }

      .mob-overlay__cancel-btn {
        margin-top: var(--space-4, 1rem);
        padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: var(--radius-lg, 12px);
        color: #fff;
        font-family: var(--font-sans, 'Space Grotesk', sans-serif);
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .mob-overlay__cancel-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.8);
      }

      .mob-overlay__cancel-btn:active {
        transform: scale(0.96);
      }
    `,
  ],
})
export class MobAlertOverlayComponent {
  @Input() active = false;
  @Input() elapsed = '00:00';
  @Input() distanceNm: number | null = null;
  @Input() bearingDeg: number | null = null;
  @Input() positionText: string | null = null;

  @Output() cancelMob = new EventEmitter<void>();
}
