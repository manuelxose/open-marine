import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../app-icon/app-icon.component';
import { SparklineComponent } from '../sparkline/sparkline.component';
import { HistoryPoint } from '../../../state/datapoints/datapoint.models';

export type InstrumentStatus = 'neutral' | 'success' | 'warning' | 'error' | 'off';

@Component({
  selector: 'app-instrument-card',
  standalone: true,
  imports: [CommonModule, AppIconComponent, SparklineComponent],
  templateUrl: './app-instrument-card.component.html',
  styleUrls: ['./app-instrument-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppInstrumentCardComponent {
  @Input() label = '';
  @Input() value: string | number = '--';
  @Input() unit = '';
  @Input() icon?: IconName;
  @Input() status: InstrumentStatus = 'neutral';
  
  // Secondary data
  @Input() secondaryLabel?: string;
  @Input() secondaryValue?: string | number;
  
  // Visualization
  @Input() showSparkline = false;
  @Input() historyData: HistoryPoint[] = [];

  get statusClass(): string {
    return `status-${this.status}`;
  }
}
