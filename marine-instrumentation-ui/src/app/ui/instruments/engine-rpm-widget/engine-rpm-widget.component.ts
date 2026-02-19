import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface RpmView {
  rpm: number;
  quality: DataQuality;
  source: string;
  age: number | null;
}

@Component({
  selector: 'app-engine-rpm-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './engine-rpm-widget.component.html',
  styleUrls: ['./engine-rpm-widget.component.scss']
})
export class EngineRpmWidgetComponent {
  private store = inject(DatapointStoreService);
  
  readonly MAX_RPM = 4000;
  readonly ARC_LENGTH = 377; 

  private hz$ = this.store.observe<number>(PATHS.propulsion.main.revolutions);

  view = toSignal(
    this.hz$.pipe(
      map(point => {
        if (!point || typeof point.value !== 'number') {
           return { rpm: 0, quality: 'bad', source: '', age: null } as RpmView;
        }
        
        const now = Date.now();
        const age = (now - point.timestamp) / 1000;
        const quality: DataQuality = age < 2 ? 'good' : age < 5 ? 'warn' : 'bad';
        
        const rpm = point.value * 60;
        
        return {
          rpm,
          quality,
          source: point.source,
          age
        } as RpmView;
      })
    ),
    { initialValue: { rpm: 0, quality: 'bad', source: '', age: null } as RpmView }
  );

  getDashOffset(rpm: number): number {
    const clamped = Math.max(0, Math.min(rpm, this.MAX_RPM));
    const percentage = clamped / this.MAX_RPM;
    return this.ARC_LENGTH * (1 - percentage);
  }

  getNeedleRotation(rpm: number): string {
    const clamped = Math.max(0, Math.min(rpm, this.MAX_RPM));
    const degrees = (clamped / this.MAX_RPM) * 270 - 135;
    return `rotate(${degrees}deg, 100, 100)`;
  }
}
