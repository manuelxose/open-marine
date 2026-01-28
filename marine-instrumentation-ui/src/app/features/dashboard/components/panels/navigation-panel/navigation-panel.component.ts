import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { SparklineComponent } from '../../../../../shared/components/sparkline/sparkline.component';
import type { NavigationPanelVm } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-navigation-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navigation-panel.component.html',
  styleUrls: ['./navigation-panel.component.css'],
})
export class NavigationPanelComponent {
  @Input({ required: true }) vm!: NavigationPanelVm;

  trackByMetric(index: number, item: NavigationPanelVm['metrics'][number]): string {
    return item.label;
  }
}
