import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ScaleBarUnit = 'metric' | 'nautical';

interface ScaleBarStep {
  label: string;
  meters: number;
}

interface ScaleBarResolution {
  px: number;
  label: string;
}

@Component({
  selector: 'app-scale-bar-pattern',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="scale-bar-pattern">
      <header class="scale-bar-pattern__header">
        <p class="scale-bar-pattern__title">Scale Bar</p>
      </header>

      <div class="scale-bar-pattern__canvas" aria-hidden="true">
        <span class="scale-bar-pattern__line" [style.width.px]="resolution().px"></span>
        <span class="scale-bar-pattern__tick scale-bar-pattern__tick--start"></span>
        <span class="scale-bar-pattern__tick scale-bar-pattern__tick--end" [style.left.px]="resolution().px"></span>
      </div>

      <div class="scale-bar-pattern__labels">
        <span class="scale-bar-pattern__label">0</span>
        <span class="scale-bar-pattern__label">{{ resolution().label }}</span>
      </div>
    </section>
  `,
  styleUrls: ['./scale-bar-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScaleBarPatternComponent {
  @Input() metersPerPixel = 4;
  @Input() unit: ScaleBarUnit = 'metric';

  resolution(): ScaleBarResolution {
    const safeMpp = this.sanitizedMetersPerPixel();
    const targetPixels = 100;
    const targetMeters = safeMpp * targetPixels;

    const step = this.pickStep(targetMeters);
    const px = Math.max(24, Math.min(170, step.meters / safeMpp));

    return {
      px: Math.round(px),
      label: step.label
    };
  }

  private sanitizedMetersPerPixel(): number {
    if (!Number.isFinite(this.metersPerPixel) || this.metersPerPixel <= 0) {
      return 1;
    }
    return this.metersPerPixel;
  }

  private pickStep(targetMeters: number): ScaleBarStep {
    const metricSteps: ScaleBarStep[] = [
      { meters: 5, label: '5 m' },
      { meters: 10, label: '10 m' },
      { meters: 20, label: '20 m' },
      { meters: 50, label: '50 m' },
      { meters: 100, label: '100 m' },
      { meters: 200, label: '200 m' },
      { meters: 500, label: '500 m' },
      { meters: 1000, label: '1 km' },
      { meters: 2000, label: '2 km' },
      { meters: 5000, label: '5 km' },
      { meters: 10000, label: '10 km' }
    ];

    const nauticalSteps: ScaleBarStep[] = [
      { meters: 18.52, label: '0.01 nm' },
      { meters: 92.6, label: '0.05 nm' },
      { meters: 185.2, label: '0.1 nm' },
      { meters: 370.4, label: '0.2 nm' },
      { meters: 926, label: '0.5 nm' },
      { meters: 1852, label: '1 nm' },
      { meters: 3704, label: '2 nm' },
      { meters: 9260, label: '5 nm' },
      { meters: 18520, label: '10 nm' }
    ];

    const steps = this.unit === 'nautical' ? nauticalSteps : metricSteps;

    for (const step of steps) {
      if (step.meters >= targetMeters) {
        return step;
      }
    }

    return steps[steps.length - 1] ?? {
      meters: targetMeters,
      label: `${Math.max(1, Math.round(targetMeters))} m`
    };
  }
}
