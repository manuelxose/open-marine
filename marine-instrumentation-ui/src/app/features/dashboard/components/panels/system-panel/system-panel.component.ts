import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import type { SystemPanelVm } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-system-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-panel.component.html',
  styleUrls: ['./system-panel.component.css'],
})
export class SystemPanelComponent {
  @Input({ required: true }) vm!: SystemPanelVm;
}
