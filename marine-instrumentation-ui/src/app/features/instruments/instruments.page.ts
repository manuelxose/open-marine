import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SogInstrumentComponent } from '../../ui/instruments/sog/sog-instrument.component';
import { HeadingInstrumentComponent } from '../../ui/instruments/heading/heading-instrument.component';
import { DepthInstrumentComponent } from '../../ui/instruments/depth/depth-instrument.component';

@Component({
  selector: 'app-instruments-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe, SogInstrumentComponent, HeadingInstrumentComponent, DepthInstrumentComponent],
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
    </div>
  `,
  styles: [`
    .instruments-page {
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
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
    }

    @media (min-width: 768px) {
      .instruments-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      }
    }
  `]
})
export class InstrumentsPage {}
