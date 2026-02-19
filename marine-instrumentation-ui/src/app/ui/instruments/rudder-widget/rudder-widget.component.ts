import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

const radToDeg = (r: number) => (r * 180) / Math.PI;

interface RudderView {
  angleDegrees: number; // Negativo = Port, Positivo = Stbd
  absAngle: number;
  side: 'PORT' | 'STBD' | 'CENTER';
  quality: DataQuality;
  source: string;
  age: number | null;
}

@Component({
  selector: 'app-rudder-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rudder-widget.component.html',
  styleUrls: ['./rudder-widget.component.scss']
})
export class RudderWidgetComponent {
  private store = inject(DatapointStoreService);

  private rudder$ = this.store.observe<number>(PATHS.steering.rudderAngle);

  view = toSignal(
    this.rudder$.pipe(
      map(point => {
        if (!point || typeof point.value !== 'number') {
          return {
             angleDegrees: 0, absAngle: 0, side: 'CENTER', quality: 'bad', age: null, source: '' 
          } as RudderView;
        }

        const now = Date.now();
        const age = (now - point.timestamp) / 1000;
        const quality: DataQuality = age < 5 ? 'good' : 'warn';

        const deg = radToDeg(point.value);
        const side = Math.abs(deg) < 0.5 ? 'CENTER' : (deg < 0 ? 'PORT' : 'STBD');

        return {
          angleDegrees: deg,
          absAngle: Math.abs(deg),
          side,
          quality,
          source: point.source,
          age
        } as RudderView;
      })
    ),
    {
      initialValue: { angleDegrees: 0, absAngle: 0, side: 'CENTER', quality: 'bad', age: null, source: '' } as RudderView
    }
  );

  getRotationTransform(degrees: number): string {
    const visualAngle = Math.max(-50, Math.min(50, degrees));
    return `rotate(${visualAngle}, 100, 110)`;
  }
}
