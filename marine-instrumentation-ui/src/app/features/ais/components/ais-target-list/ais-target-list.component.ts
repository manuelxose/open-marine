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
      background: var(--gb-bg-canvas);
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
      border-bottom: 1px solid var(--gb-border-panel);
      background: var(--gb-bg-bezel);
    }

    .ais-list-header h3 {
      margin: 0;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--gb-text-value);
    }

    .ais-header-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .ais-filter-select,
    .ais-sort-select {
      appearance: none;
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      color: var(--gb-text-muted);
      padding: 5px 28px 5px 10px;
      border-radius: 8px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color 150ms ease;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7a8d' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
    }

    .ais-filter-select:focus,
    .ais-sort-select:focus {
      outline: none;
      border-color: var(--gb-border-active);
    }

    .ais-follow-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: rgba(74, 144, 217, 0.08);
      border-bottom: 1px solid rgba(74, 144, 217, 0.2);
    }

    .ais-follow-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--gb-text-value);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ais-follow-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid var(--gb-needle-secondary);
      border-radius: 8px;
      background: rgba(74, 144, 217, 0.12);
      color: var(--gb-needle-secondary);
      cursor: pointer;
      transition: background 150ms ease;
      flex-shrink: 0;
    }

    .ais-follow-btn:hover {
      background: rgba(74, 144, 217, 0.25);
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
      color: var(--gb-text-muted);
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
