import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDataQuality, ChartTopBarVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-top-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-top-bar.component.html',
  styleUrls: ['./chart-top-bar.component.scss'],
})
export class ChartTopBarComponent {
  @Input({ required: true }) vm!: ChartTopBarVm;

  isUnavailable(quality: ChartDataQuality): boolean {
    return quality === 'stale' || quality === 'missing';
  }
}
