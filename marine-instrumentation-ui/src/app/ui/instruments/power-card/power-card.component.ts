import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstrumentCardComponent } from '../../components/instrument-card/instrument-card.component';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { map } from 'rxjs';

@Component({
  selector: 'app-power-card',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent, SparklineComponent],
  template: `
    <app-instrument-card title="Power" [value]="'--'" [quality]="(quality$ | async) || 'bad'">
        <div class="flex flex-col h-full gap-2">
            <div class="flex justify-between items-end">
                 <div class="flex flex-col">
                    <span class="text-[10px] text-muted uppercase">Volts</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-bold tabular-nums">{{ (volts$ | async)?.value | number:'1.2-2' }}</span>
                        <span class="text-sm text-muted">V</span>
                    </div>
                 </div>
                 <div class="flex flex-col items-end">
                    <span class="text-[10px] text-muted uppercase">Current</span>
                    <div class="flex items-baseline gap-1">
                         <span class="text-2xl font-bold tabular-nums">{{ (amps$ | async)?.value | number:'1.1-1' }}</span>
                         <span class="text-sm text-muted">A</span>
                    </div>
                 </div>
            </div>
            
             <div class="h-8 w-full mt-auto">
                 <app-sparkline [data]="(history$ | async) || []" colorClass="text-yellow-500"></app-sparkline>
            </div>
        </div>
    </app-instrument-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PowerCardComponent {
    private store = inject(DatapointStoreService);
    
    volts$ = this.store.observe<number>(PATHS.electrical.batteries.house.voltage);
    amps$ = this.store.observe<number>(PATHS.electrical.batteries.house.current);
    
    history$ = this.store.observeHistory(PATHS.electrical.batteries.house.voltage);
    
     quality$ = this.volts$.pipe(
        map(p => {
             if (!p) return 'bad';
             const age =( Date.now() - p.timestamp ) / 1000;
             if (age < 2) return 'good';
             if (age < 5) return 'warn';
             return 'bad';
        })
    );
}
