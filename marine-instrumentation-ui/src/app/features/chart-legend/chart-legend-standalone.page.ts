import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Location } from '@angular/common';
import { ChartLegendComponent } from './chart-legend.component';

@Component({
  selector: 'app-chart-legend-standalone',
  standalone: true,
  imports: [ChartLegendComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-chart-legend [isOpen]="true" (close)="goBack()" />
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }
  `],
})
export class ChartLegendStandalonePage {
  private readonly location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
