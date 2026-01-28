import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartHudVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-hud',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-hud.component.html',
  styleUrls: ['./chart-hud.component.css'],
})
export class ChartHudComponent {
  @Input({ required: true }) vm!: ChartHudVm;
}
