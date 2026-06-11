import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { AppInstrumentCardComponent } from '../../../shared/components/app-instrument-card/app-instrument-card.component';

function formatCoord(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const suffix = isLat
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';
  const pad = isLat ? 2 : 3;
  return `${String(deg).padStart(pad, '0')}° ${min.toFixed(3)}' ${suffix}`;
}

@Component({
  selector: 'app-position-instrument',
  standalone: true,
  imports: [CommonModule, AppInstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      label="Position"
      [value]="display().lat"
      icon="compass"
      [status]="display().status"
      secondaryLabel="Lon"
      [secondaryValue]="display().lon"
    />
  `,
  styles: [
    `
    :host { display: block; }
    `,
  ],
})
export class PositionInstrumentComponent {
  private readonly store = inject(DatapointStoreService);

  private readonly position = toSignal(
    this.store.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
    { initialValue: null },
  );

  readonly display = computed(() => {
    const point = this.position();
    if (!point) return { lat: '--', lon: '--', status: 'neutral' as const };

    const val = point.value;
    if (!val || typeof val.latitude !== 'number' || typeof val.longitude !== 'number') {
      return { lat: '--', lon: '--', status: 'neutral' as const };
    }

    const age = (Date.now() - point.timestamp) / 1000;
    const status = age > 5 ? ('warning' as const) : ('success' as const);

    return {
      lat: formatCoord(val.latitude, true),
      lon: formatCoord(val.longitude, false),
      status,
    };
  });
}
