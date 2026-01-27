import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstrumentCardComponent } from '../../components/instrument-card/instrument-card.component';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { map } from 'rxjs';

@Component({
  selector: 'app-depth-card',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent, SparklineComponent],
  template: `
    <app-instrument-card title="Depth" [value]="'--'" [quality]="(quality$ | async) || 'bad'">
         <div class="flex flex-col h-full justify-between">
            <div class="flex-grow flex flex-col justify-center items-center relative">
                 <div class="flex items-baseline gap-1">
                    <span class="text-5xl font-bold tabular-nums tracking-tighter">{{ (depth$ | async)?.value | number:'1.1-1' }}</span>
                    <span class="text-lg font-medium text-muted">m</span>
                </div>
                <div class="absolute right-0 top-1/2 -translate-y-1/2">
                   <!-- Trend Arrow Placeholder -->
                   <!-- Logical trend calculation needed -->
                </div>
            </div>

            <div class="h-10 w-full mb-1">
                 <app-sparkline [data]="(history$ | async) || []" colorClass="text-blue-500"></app-sparkline>
            </div>
         </div>
    </app-instrument-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepthCardComponent {
    private store = inject(DatapointStoreService);
    
    depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);
    history$ = this.store.observeHistory(PATHS.environment.depth.belowTransducer);
    
     quality$ = this.depth$.pipe(
        map(p => {
             if (!p) return 'bad';
             const age =( Date.now() - p.timestamp ) / 1000;
             if (age < 2) return 'good';
             if (age < 5) return 'warn';
             return 'bad';
        })
    );
}
