import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { SparklineComponent } from '../../../../../shared/components/sparkline/sparkline.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { DepthPanelVm } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-depth-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, SparklineComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './depth-panel.component.html',
  styleUrls: ['./depth-panel.component.css'],
})
export class DepthPanelComponent {
  @Input({ required: true }) vm!: DepthPanelVm;

  trackByMetric(_index: number, item: DepthPanelVm['metrics'][number]): string {
    return item.label;
  }
}
