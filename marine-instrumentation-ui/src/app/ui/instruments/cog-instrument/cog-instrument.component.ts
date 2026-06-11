import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { AppInstrumentCardComponent } from '../../../shared/components/app-instrument-card/app-instrument-card.component';

@Component({
  selector: 'app-cog-instrument',
  standalone: true,
  imports: [CommonModule, AppInstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      label="COG"
      [value]="display().value"
      unit="°"
      icon="compass"
      [status]="display().status"
    />
  `,
  styles: [
    `
    :host { display: block; }
    `,
  ],
})
export class CogInstrumentComponent {
  private readonly store = inject(DatapointStoreService);

  private readonly cog = toSignal(
    this.store.observe<number>(PATHS.navigation.courseOverGroundTrue),
    { initialValue: null },
  );

  readonly display = computed(() => {
    const point = this.cog();
    if (!point) return { value: '--', status: 'neutral' as const };

    const raw = point.value;
    if (raw == null || typeof raw !== 'number') return { value: '--', status: 'neutral' as const };

    const degrees = raw * (180 / Math.PI);
    const normalized = ((degrees % 360) + 360) % 360;

    const age = (Date.now() - point.timestamp) / 1000;
    const status = age > 5 ? ('warning' as const) : ('success' as const);

    return {
      value: normalized.toFixed(1),
      status,
    };
  });
}
