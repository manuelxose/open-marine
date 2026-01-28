import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { SparklineComponent } from '../../../../../shared/components/sparkline/sparkline.component';
import type { WindPanelVm } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-wind-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wind-panel.component.html',
  styleUrls: ['./wind-panel.component.css'],
})
export class WindPanelComponent {
  @Input({ required: true }) vm!: WindPanelVm;

  trackByMetric(index: number, item: WindPanelVm['metrics'][number]): string {
    return item.label;
  }
}
