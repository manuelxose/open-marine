import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SogInstrumentComponent } from '../../ui/instruments/sog/sog-instrument.component';
import { HeadingInstrumentComponent } from '../../ui/instruments/heading/heading-instrument.component';
import { DepthInstrumentComponent } from '../../ui/instruments/depth/depth-instrument.component';
import { AisTargetListComponent } from '../ais/components/ais-target-list/ais-target-list.component';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { haversineDistanceMeters } from '../../state/calculations/navigation';

@Component({
  selector: 'app-instruments-page',
  standalone: true,
  imports: [
    CommonModule, 
    TranslatePipe, 
    SogInstrumentComponent, 
    HeadingInstrumentComponent, 
    DepthInstrumentComponent,
    AisTargetListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="instruments-page">
      <div class="page-header">
        <h1>{{ 'instruments.page.title' | translate }}</h1>
        <p class="subtitle">{{ 'instruments.page.subtitle' | translate }}</p>
      </div>

      <div class="instruments-grid">
        <app-sog-instrument></app-sog-instrument>
        <app-heading-instrument></app-heading-instrument>
        <app-depth-instrument></app-depth-instrument>
      </div>
      
      <div class="ais-section">
        <app-ais-target-list
          [targets]="sortedTargets()"
          [sortBy]="sortBy()"
          (sortChange)="handleSortChange($event)"
        ></app-ais-target-list>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }

    .instruments-page {
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
      min-height: 0;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--fg);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--muted);
      font-size: 0.875rem;
    }

    .instruments-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      margin-bottom: 2rem;
    }
    
    .ais-section {
      width: 100%;
      background: var(--surface-1);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      height: 400px;
      overflow: hidden;
    }
    
    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--fg);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }

    @media (min-width: 768px) {
      .instruments-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      }
    }
  `]
})
export class InstrumentsPage {
  private aisStore = inject(AisStoreService);
  private store = inject(DatapointStoreService);
  
  private ownPosition = toSignal(this.store.observe<{latitude: number; longitude: number}>(PATHS.navigation.position));

  protected sortBy = signal<'distance' | 'cpa' | 'name'>('distance');

  protected sortedTargets = computed(() => {
    const targets = Array.from(this.aisStore.targets().values());
    if (targets.length === 0) return [];

    const sort = this.sortBy();
    const pos = this.ownPosition()?.value;

    return targets.sort((a, b) => {
      if (sort === 'name') {
        const nameA = a.name || a.mmsi || '';
        const nameB = b.name || b.mmsi || '';
        return nameA.localeCompare(nameB);
      }
      
      if (sort === 'cpa') {
        const cpaA = a.cpa ?? Number.MAX_VALUE;
        const cpaB = b.cpa ?? Number.MAX_VALUE;
        return cpaA - cpaB;
      }
      
      if (pos) {
        const own = { lat: pos.latitude, lon: pos.longitude };
        const distA = haversineDistanceMeters(own, { lat: a.latitude, lon: a.longitude });
        const distB = haversineDistanceMeters(own, { lat: b.latitude, lon: b.longitude });
        return distA - distB;
      }
      
      return 0;
    });
  });

  protected handleSortChange(sort: string): void {
    this.sortBy.set(sort as any);
  }
}
