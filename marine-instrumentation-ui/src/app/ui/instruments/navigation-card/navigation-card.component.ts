import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstrumentCardComponent } from '../../components/instrument-card/instrument-card.component';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { map } from 'rxjs';

interface PositionValue {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-navigation-card',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent, SparklineComponent],
  template: `
    <app-instrument-card title="Navigation" [value]="'--'" [quality]="(quality$ | async) || 'bad'">
        <div class="grid grid-cols-2 gap-4 h-full">
            <!-- Primary SOG -->
            <div class="flex flex-col justify-center">
                <span class="text-xs text-muted font-bold uppercase">SOG</span>
                <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-bold tabular-nums">{{ (sog$ | async)?.value | number:'1.1-1' }}</span>
                    <span class="text-sm font-semibold text-muted">kn</span>
                </div>
                <!-- Sparkline for SOG -->
                <div class="h-8 w-full mt-2">
                    <app-sparkline [data]="(sogHistory$ | async) || []"></app-sparkline>
                </div>
            </div>

            <!-- HDG & COG -->
            <div class="flex flex-col justify-between">
                <div>
                   <span class="text-xs text-muted font-bold uppercase">HDG (T)</span>
                   <div class="flex items-baseline gap-1">
                        <span class="text-2xl font-bold tabular-nums">{{ ((hdg$ | async)?.value | number:'1.0-0') || '--' }}</span>
                        <span class="text-xs text-muted">°</span>
                   </div>
                </div>
                <div>
                   <span class="text-xs text-muted font-bold uppercase">COG (T)</span>
                   <div class="flex items-baseline gap-1">
                        <span class="text-2xl font-bold tabular-nums">{{ ((cog$ | async)?.value | number:'1.0-0') || '--' }}</span>
                        <span class="text-xs text-muted">°</span>
                   </div>
                </div>
            </div>
            
            <!-- Position (Full width bottom) -->
            <div class="col-span-2 border-t border-white/10 pt-2 flex justify-between items-center text-xs text-muted">
                <span class="font-mono">{{ (pos$ | async) || 'No Fix' }}</span>
                <span>GPS</span>
            </div>
        </div>
    </app-instrument-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationCardComponent {
    private store = inject(DatapointStoreService);
    
    sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround);
    cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue);
    hdg$ = this.store.observe<number>(PATHS.navigation.headingTrue);
    
    // Position is special, usually an object {latitude, longitude}
    pos$ = this.store.observe<PositionValue>(PATHS.navigation.position).pipe(
        map(p => {
            if (!p?.value) return null;
            const { latitude, longitude } = p.value;
            const latDir = latitude >= 0 ? 'N' : 'S';
            const lonDir = longitude >= 0 ? 'E' : 'W';
            return `${Math.abs(latitude).toFixed(4)}°${latDir}  ${Math.abs(longitude).toFixed(4)}°${lonDir}`;
        })
    );

    sogHistory$ = this.store.observeHistory(PATHS.navigation.speedOverGround);
    
    quality$ = this.sog$.pipe(
        map(p => {
             if (!p) return 'bad';
             const age =( Date.now() - p.timestamp ) / 1000;
             if (age < 2) return 'good';
             if (age < 5) return 'warn';
             return 'bad';
        })
    );
}
