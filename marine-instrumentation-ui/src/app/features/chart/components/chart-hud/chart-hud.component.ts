import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChartHudVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-hud',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-hud.component.html',
  styleUrls: ['./chart-hud.component.css'],
})
export class ChartHudComponent {
  @Input({ required: true }) vm!: ChartHudVm;
}
