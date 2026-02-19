import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AisTargetItemComponent } from '../ais-target-item/ais-target-item.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { AisTarget } from '../../../../core/models/ais.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ais-target-list',
  standalone: true,
  imports: [CommonModule, AisTargetItemComponent, AppIconComponent, FormsModule],
  template: `
    <div class="ais-list">
      <header class="ais-list-header">
        <h3>AIS Targets ({{ targets.length }})</h3>
        <select [ngModel]="sortBy" (ngModelChange)="sortChange.emit($event)" class="ais-sort-select">
          <option value="cpa">Sort by CPA</option>
          <option value="distance">Sort by Distance</option>
          <option value="name">Sort by Name</option>
        </select>
      </header>
      
      <div class="ais-list-scroll">
        <app-ais-target-item
          *ngFor="let target of targets; trackBy: trackByMmsi"
          [target]="target"
          [selected]="selectedMmsi === target.mmsi"
          (clicked)="selectTarget.emit(target.mmsi)"
        />
      </div>
      
      <div class="ais-empty" *ngIf="targets.length === 0">
        <app-icon name="target" [size]="48" class="text-tertiary"></app-icon>
        <p>No AIS targets in range</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--surface-0);
    }

    .ais-list {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .ais-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
      background: var(--surface-1);
    }

    .ais-list-header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .ais-sort-select {
      background: var(--surface-2);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .ais-list-scroll {
      flex: 1;
      overflow-y: auto;
    }

    .ais-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      gap: 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AisTargetListComponent {
  @Input() targets: AisTarget[] = [];
  @Input() selectedMmsi: string | null = null;
  @Input() sortBy: string = 'distance';
  
  @Output() selectTarget = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<string>();

  trackByMmsi(index: number, target: AisTarget): string {
    return target.mmsi || String(index);
  }
}
