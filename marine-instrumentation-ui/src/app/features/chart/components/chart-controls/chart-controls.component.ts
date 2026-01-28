import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartControlsVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-controls',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-controls.component.html',
  styleUrls: ['./chart-controls.component.css'],
})
export class ChartControlsComponent {
  @Input({ required: true }) vm!: ChartControlsVm;

  @Output() toggleAutoCenter = new EventEmitter<void>();
  @Output() toggleTrack = new EventEmitter<void>();
  @Output() toggleVector = new EventEmitter<void>();
  @Output() toggleTrueWind = new EventEmitter<void>();
  @Output() toggleLayer = new EventEmitter<void>();
  @Output() centerOnBoat = new EventEmitter<void>();

  onToggleAutoCenter(): void {
    this.toggleAutoCenter.emit();
  }

  onToggleTrack(): void {
    this.toggleTrack.emit();
  }

  onToggleVector(): void {
    this.toggleVector.emit();
  }

  onToggleTrueWind(): void {
    this.toggleTrueWind.emit();
  }

  onToggleLayer(): void {
    this.toggleLayer.emit();
  }

  onCenterOnBoat(): void {
    this.centerOnBoat.emit();
  }
}
