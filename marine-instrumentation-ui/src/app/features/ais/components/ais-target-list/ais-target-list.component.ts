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
        <h3>AIS Targets ({{ filteredTargets.length }})</h3>
        <div class="ais-header-controls">
          <select [ngModel]="filterType" (ngModelChange)="onFilterChange($event)" class="ais-filter-select" title="Filter by vessel type">
            <option value="all">All Types</option>
            <option value="cargo">Cargo</option>
            <option value="passenger">Passenger</option>
            <option value="fishing">Fishing</option>
            <option value="pleasure">Pleasure</option>
            <option value="tug">Tug</option>
            <option value="sailing">Sailing</option>
          </select>
          <select [ngModel]="sortBy" (ngModelChange)="sortChange.emit($event)" class="ais-sort-select">
            <option value="cpa">Sort by CPA</option>
            <option value="distance">Sort by Distance</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </header>

      <!-- Follow bar -->
      <div class="ais-follow-bar" *ngIf="selectedMmsi">
        <span class="ais-follow-label">{{ getSelectedName() }}</span>
        <button class="ais-follow-btn" (click)="followTarget.emit(selectedMmsi!)" title="Follow vessel on chart">
          <app-icon name="crosshair" [size]="14" />
          <span>Follow</span>
        </button>
      </div>
      
      <div class="ais-list-scroll">
        <app-ais-target-item
          *ngFor="let target of filteredTargets; trackBy: trackByMmsi"
          [target]="target"
          [selected]="selectedMmsi === target.mmsi"
          (clicked)="selectTarget.emit(target.mmsi)"
        />
      </div>
      
      <div class="ais-empty" *ngIf="filteredTargets.length === 0">
        <app-icon name="target" [size]="48" class="text-tertiary"></app-icon>
        <p>{{ targets.length === 0 ? 'No AIS targets in range' : 'No matches for filter' }}</p>
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

    .ais-header-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .ais-filter-select,
    .ais-sort-select {
      background: var(--surface-2);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .ais-follow-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
    }

    .ais-follow-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ais-follow-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid var(--primary);
      border-radius: 6px;
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: var(--primary);
      cursor: pointer;
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .ais-follow-btn:hover {
      background: color-mix(in srgb, var(--primary) 30%, transparent);
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
  @Output() followTarget = new EventEmitter<string>();

  filterType = 'all';

  get filteredTargets(): AisTarget[] {
    if (this.filterType === 'all') return this.targets;
    return this.targets.filter(t => {
      const type = (t.vesselType ?? '').toLowerCase();
      return type.includes(this.filterType);
    });
  }

  getSelectedName(): string {
    if (!this.selectedMmsi) return '';
    const t = this.targets.find(t => t.mmsi === this.selectedMmsi);
    return t?.name ?? t?.mmsi ?? '';
  }

  onFilterChange(value: string): void {
    this.filterType = value;
  }

  trackByMmsi(index: number, target: AisTarget): string {
    return target.mmsi || String(index);
  }
}
