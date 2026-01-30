import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartHudVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-hud',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-hud.component.html',
  styleUrls: ['./chart-hud.component.css'],
})
export class ChartHudComponent {
  @Input({ required: true }) vm!: ChartHudVm;
  @Output() toggleAutopilot = new EventEmitter<void>();
}
