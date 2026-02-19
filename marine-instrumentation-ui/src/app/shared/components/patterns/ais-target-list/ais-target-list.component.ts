import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppListItemComponent } from '../../composites/app-list-item/app-list-item.component';
import { AppSpinnerComponent } from '../../app-spinner/app-spinner.component';

export type AISTargetStatus = 'safe' | 'warning' | 'danger';
export type AISTargetSort = 'distance' | 'tcpa' | 'cpa' | 'name' | 'status';

export interface AISTargetListItem {
  id: string;
  name?: string;
  mmsi: string;
  distance?: number; // nm
  bearing?: number; // degrees
  cpa?: number; // nm
  tcpa?: number; // seconds
  status?: AISTargetStatus;
}

@Component({
  selector: 'app-ais-target-list',
  standalone: true,
  imports: [CommonModule, AppBoxComponent, AppStackComponent, AppTextComponent, AppListItemComponent, AppSpinnerComponent],
  template: `
    <app-box class="ais-target-list" padding="4">
      <app-stack spacing="md">
        <div class="list-header">
          <div>
            <app-text variant="overline">AIS TARGETS</app-text>
            <app-text variant="caption" class="text-muted">{{ headerSubtitle() }}</app-text>
          </div>
          <div class="header-meta">
            <app-text variant="caption" class="text-muted">Sort: {{ sortLabel() }}</app-text>
            <app-text variant="caption" class="text-muted" *ngIf="filterLabel()">
              Filter: {{ filterLabel() }}
            </app-text>
          </div>
        </div>

        <div class="list-body" *ngIf="loading">
          <div class="list-state">
            <app-spinner size="sm"></app-spinner>
            <app-text variant="caption" class="text-muted">Scanning AIS targets...</app-text>
          </div>
        </div>

        <ng-container *ngIf="!loading">
          <div class="list-body" *ngIf="visibleTargets.length === 0">
            <div class="list-state empty">
              <app-text variant="caption" class="text-muted">No AIS targets detected.</app-text>
            </div>
          </div>

          <div class="list-body" *ngIf="visibleTargets.length > 0">
            <app-list-item
              *ngFor="let target of visibleTargets; let last = last; trackBy: trackById"
              [hoverable]="true"
              [selected]="target.id === selectedId"
              [divider]="!last"
              (clicked)="selectTarget(target)">
              <span leading class="status-dot" [ngClass]="statusClass(target.status)"></span>

              <div primary class="primary">
                <app-text variant="body" weight="medium" class="truncate">{{ target.name || 'Unknown' }}</app-text>
                <app-text variant="caption" class="mmsi">MMSI {{ target.mmsi }}</app-text>
              </div>

              <div secondary class="secondary">
                <app-text variant="caption" class="meta-text">{{ formatMeta(target) }}</app-text>
              </div>

              <div trailing class="trailing">
                <app-text variant="caption" class="meta-text">{{ formatCpa(target) }}</app-text>
                <app-text variant="caption" class="meta-text">{{ formatTcpa(target) }}</app-text>
              </div>
            </app-list-item>
          </div>
        </ng-container>
      </app-stack>
    </app-box>
  `,
  styleUrls: ['./ais-target-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AISTargetListComponent {
  @Input() targets: AISTargetListItem[] = [];
  @Input() sortBy: AISTargetSort = 'distance';
  @Input() filter: string = 'all';
  @Input() loading = false;
  @Input() selectedId?: string;

  @Output() onSelect = new EventEmitter<AISTargetListItem>();

  get visibleTargets(): AISTargetListItem[] {
    let list = [...(this.targets || [])];
    const normalizedFilter = (this.filter || '').trim().toLowerCase();

    if (normalizedFilter && normalizedFilter !== 'all') {
      if (normalizedFilter === 'safe' || normalizedFilter === 'warning' || normalizedFilter === 'danger') {
        list = list.filter((t) => (t.status || 'safe') === normalizedFilter);
      } else {
        list = list.filter((t) =>
          (t.name || '').toLowerCase().includes(normalizedFilter) ||
          t.mmsi.toLowerCase().includes(normalizedFilter)
        );
      }
    }

    list.sort((a, b) => this.sortComparator(a, b));
    return list;
  }

  trackById = (_index: number, item: AISTargetListItem) => item.id;

  selectTarget(target: AISTargetListItem): void {
    this.onSelect.emit(target);
  }

  headerSubtitle(): string {
    if (this.loading) return 'Scanning for nearby vessels';
    const count = this.visibleTargets.length;
    if (count === 0) return 'No targets in range';
    return `${count} target${count === 1 ? '' : 's'} detected`;
  }

  sortLabel(): string {
    switch (this.sortBy) {
      case 'tcpa':
        return 'TCPA';
      case 'cpa':
        return 'CPA';
      case 'name':
        return 'Name';
      case 'status':
        return 'Risk';
      default:
        return 'Distance';
    }
  }

  filterLabel(): string | null {
    const normalized = (this.filter || '').trim();
    if (!normalized || normalized.toLowerCase() === 'all') return null;
    return normalized.toUpperCase();
  }

  statusClass(status?: AISTargetStatus): string {
    return `status-${status || 'safe'}`;
  }

  formatMeta(target: AISTargetListItem): string {
    const bearing = this.formatBearing(target.bearing);
    const distance = this.formatDistance(target.distance);
    return `BRG ${bearing} \u00b7 DST ${distance}`;
  }

  formatDistance(distance?: number): string {
    if (distance === undefined || distance === null) return '-- nm';
    return `${distance.toFixed(1)} nm`;
  }

  formatBearing(bearing?: number): string {
    if (bearing === undefined || bearing === null) return `---\u00b0`;
    const value = Math.round(bearing).toString().padStart(3, '0');
    return `${value}\u00b0`;
  }

  formatCpa(target: AISTargetListItem): string {
    if (target.cpa === undefined || target.cpa === null) return 'CPA --';
    return `CPA ${target.cpa.toFixed(1)} nm`;
  }

  formatTcpa(target: AISTargetListItem): string {
    if (target.tcpa === undefined || target.tcpa === null) return 'TCPA --';
    const mins = Math.max(0, Math.round(target.tcpa / 60));
    return `TCPA ${mins} min`;
  }

  private sortComparator(a: AISTargetListItem, b: AISTargetListItem): number {
    switch (this.sortBy) {
      case 'tcpa':
        return (a.tcpa ?? Number.MAX_SAFE_INTEGER) - (b.tcpa ?? Number.MAX_SAFE_INTEGER);
      case 'cpa':
        return (a.cpa ?? Number.MAX_SAFE_INTEGER) - (b.cpa ?? Number.MAX_SAFE_INTEGER);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'status':
        return this.statusRank(a.status) - this.statusRank(b.status);
      default:
        return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
    }
  }

  private statusRank(status?: AISTargetStatus): number {
    switch (status) {
      case 'danger':
        return 0;
      case 'warning':
        return 1;
      default:
        return 2;
    }
  }
}
