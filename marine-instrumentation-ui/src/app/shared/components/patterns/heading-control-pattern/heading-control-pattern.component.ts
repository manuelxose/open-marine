import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-heading-control-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="heading-control-pattern" [class.heading-control-pattern--adjusting]="adjusting">
      <header class="heading-control-pattern__header">
        <div class="heading-control-pattern__title-wrap">
          <span class="heading-control-pattern__icon-wrap">
            <app-icon name="compass" size="18"></app-icon>
          </span>
          <div class="heading-control-pattern__title-content">
            <p class="heading-control-pattern__title">Heading Control</p>
            <p class="heading-control-pattern__subtitle">
              Delta {{ targetDeltaLabel() }}
            </p>
          </div>
        </div>
      </header>

      <dl class="heading-control-pattern__readings">
        <div class="heading-control-pattern__reading">
          <dt class="heading-control-pattern__reading-label">Target</dt>
          <dd class="heading-control-pattern__reading-value">{{ formatHeading(target) }}</dd>
        </div>
        <div class="heading-control-pattern__reading">
          <dt class="heading-control-pattern__reading-label">Current</dt>
          <dd class="heading-control-pattern__reading-value">{{ formatHeading(current) }}</dd>
        </div>
      </dl>

      <div class="heading-control-pattern__controls">
        <div class="heading-control-pattern__group">
          <button
            type="button"
            class="heading-control-pattern__btn"
            [disabled]="disabled || target === null"
            (click)="adjust(-10)"
            aria-label="Decrease heading 10 degrees"
          >
            -10
          </button>
          <button
            type="button"
            class="heading-control-pattern__btn"
            [disabled]="disabled || target === null"
            (click)="adjust(-1)"
            aria-label="Decrease heading 1 degree"
          >
            -1
          </button>
        </div>

        <div class="heading-control-pattern__group">
          <button
            type="button"
            class="heading-control-pattern__btn"
            [disabled]="disabled || target === null"
            (click)="adjust(1)"
            aria-label="Increase heading 1 degree"
          >
            +1
          </button>
          <button
            type="button"
            class="heading-control-pattern__btn"
            [disabled]="disabled || target === null"
            (click)="adjust(10)"
            aria-label="Increase heading 10 degrees"
          >
            +10
          </button>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./heading-control-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeadingControlPatternComponent implements OnDestroy {
  @Input() target: number | null = null;
  @Input() current: number | null = null;
  @Input() disabled = false;

  @Output() onAdjust = new EventEmitter<number>();

  adjusting = false;
  private adjustTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.adjustTimer) {
      clearTimeout(this.adjustTimer);
      this.adjustTimer = null;
    }
  }

  adjust(delta: number): void {
    if (this.disabled || this.target === null) {
      return;
    }

    this.onAdjust.emit(delta);
    this.adjusting = true;

    if (this.adjustTimer) {
      clearTimeout(this.adjustTimer);
    }
    this.adjustTimer = setTimeout(() => {
      this.adjusting = false;
      this.adjustTimer = null;
    }, 450);
  }

  formatHeading(value: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }
    const normalized = this.normalizeHeading(value);
    return `${normalized.toString().padStart(3, '0')}deg`;
  }

  targetDeltaLabel(): string {
    if (this.target === null || this.current === null) {
      return '--';
    }

    const target = this.normalizeHeading(this.target);
    const current = this.normalizeHeading(this.current);
    let delta = target - current;
    while (delta > 180) {
      delta -= 360;
    }
    while (delta < -180) {
      delta += 360;
    }

    const rounded = Math.round(delta);
    return `${rounded > 0 ? '+' : ''}${rounded}deg`;
  }

  private normalizeHeading(value: number): number {
    return ((Math.round(value) % 360) + 360) % 360;
  }
}

