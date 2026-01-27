import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstrumentCardComponent } from '../../components/instrument-card/instrument-card.component';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { map } from 'rxjs';

@Component({
  selector: 'app-wind-card',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent, SparklineComponent],
  template: `
    <app-instrument-card title="Wind" [value]="'--'" [quality]="(quality$ | async) || 'bad'">
        <div class="grid grid-cols-2 gap-4 h-full">
            <div class="flex flex-col justify-center">
                <span class="text-xs text-muted font-bold uppercase">AWS</span>
                <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-bold tabular-nums">{{ (aws$ | async)?.value | number:'1.1-1' }}</span>
                    <span class="text-sm font-semibold text-muted">kn</span>
                </div>
                 <div class="h-8 w-full mt-2">
                    <app-sparkline [data]="(awsHistory$ | async) || []" colorClass="text-blue-400"></app-sparkline>
                 </div>
            </div>

            <div class="flex flex-col justify-center items-end">
                <span class="text-xs text-muted font-bold uppercase">AWA</span>
                <div class="flex items-baseline gap-1">
                    <span class="text-3xl font-bold tabular-nums">{{ (awa$ | async)?.value | number:'1.0-0' }}</span>
                    <span class="text-sm font-semibold text-muted">°</span>
                </div>
                 <!-- Visual Angle Indicator could go here -->
                 <div class="text-xs text-muted mt-2">Apparent</div>
            </div>
            
            <div class="col-span-2 border-t border-white/10 pt-2 grid grid-cols-2 gap-4 text-center">
                 <div>
                    <span class="text-[10px] text-muted uppercase block">Gust (60s)</span>
                     <!-- Placeholder logic for gust, using current max for now or compute in component -->
                    <span class="font-mono text-sm">--</span> 
                 </div>
                 <div>
                    <span class="text-[10px] text-muted uppercase block">Avg (60s)</span>
                    <span class="font-mono text-sm">--</span>
                 </div>
            </div>
        </div>
    </app-instrument-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WindCardComponent {
    private store = inject(DatapointStoreService);
    
    aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent);
    awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent);

    awsHistory$ = this.store.observeHistory(PATHS.environment.wind.speedApparent);
    
    quality$ = this.aws$.pipe(
        map(p => {
             if (!p) return 'bad';
             const age =( Date.now() - p.timestamp ) / 1000;
             if (age < 2) return 'good';
             if (age < 5) return 'warn';
             return 'bad';
        })
    );
}
