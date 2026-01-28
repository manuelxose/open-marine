import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartWaypointListVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-waypoint-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-waypoint-list.component.html',
  styleUrls: ['./chart-waypoint-list.component.css'],
})
export class ChartWaypointListComponent {
  @Input({ required: true }) vm!: ChartWaypointListVm;

  @Output() selectWaypoint = new EventEmitter<string>();
  @Output() renameWaypoint = new EventEmitter<{ id: string; name: string }>();
  @Output() deleteWaypoint = new EventEmitter<string>();
  @Output() clearActive = new EventEmitter<void>();

  onSelect(id: string): void {
    this.selectWaypoint.emit(id);
  }

  onRename(id: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const name = target?.value ?? '';
    this.renameWaypoint.emit({ id, name });
  }

  onDelete(id: string): void {
    this.deleteWaypoint.emit(id);
  }

  onClearActive(): void {
    this.clearActive.emit();
  }
}
