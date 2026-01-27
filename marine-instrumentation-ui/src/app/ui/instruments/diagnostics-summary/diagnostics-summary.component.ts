import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstrumentCardComponent } from '../../components/instrument-card/instrument-card.component';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';

@Component({
  selector: 'app-diagnostics-summary',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  template: `
    <app-instrument-card title="System" value="--" [quality]="(connected$ | async) ? 'good' : 'bad'">
        <div class="flex flex-col gap-2 overflow-hidden h-full justify-center text-xs">
            <div class="flex justify-between items-center border-b border-white/10 pb-1">
                 <span class="text-muted">Status</span>
                 <span class="font-bold" [class.text-green-400]="connected$ | async" [class.text-red-400]="!(connected$ | async)">
                    {{ (connected$ | async) ? 'ONLINE' : 'OFFLINE' }}
                 </span>
            </div>
            
            <div class="flex justify-between items-center">
                 <span class="text-muted">Updates</span>
                 <span class="font-mono">{{ updates$ | async | number }}</span>
            </div>
            
             <div class="flex justify-between items-center">
                 <span class="text-muted">Last Msg</span>
                 <span class="font-mono text-[10px] opacity-70">Now</span>
            </div>
        </div>
    </app-instrument-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagnosticsSummaryComponent {
   private sk = inject(SignalKClientService);
   private store = inject(DatapointStoreService);

   connected$ = this.sk.connected$;
   updates$ = this.store.updatesProcessed$;
}
