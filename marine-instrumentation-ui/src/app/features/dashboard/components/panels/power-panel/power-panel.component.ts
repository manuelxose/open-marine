import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { SparklineComponent } from '../../../../../shared/components/sparkline/sparkline.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { PowerPanelVm } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-power-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, SparklineComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './power-panel.component.html',
  styleUrls: ['./power-panel.component.css'],
})
export class PowerPanelComponent {
  @Input({ required: true }) vm!: PowerPanelVm;

  trackByMetric(_index: number, item: PowerPanelVm['metrics'][number]): string {
    return item.label;
  }
}
