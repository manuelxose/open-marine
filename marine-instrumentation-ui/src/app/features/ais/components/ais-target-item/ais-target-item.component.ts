import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AppIconComponent, IconName } from '../../../../shared/components/app-icon/app-icon.component';
import { AisTarget, AisNavStatus } from '../../../../core/models/ais.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { DistancePipe } from '../../../../shared/pipes/distance.pipe';

@Component({
  selector: 'app-ais-target-item',
  standalone: true,
  imports: [CommonModule, AppIconComponent, DecimalPipe, TimeAgoPipe, DistancePipe],
  template: `
    <div 
      class="ais-item" 
      [class.selected]="selected"
      [class.dangerous]="target.isDangerous"
      (click)="clicked.emit()"
    >
      <div class="ais-icon-col">
        <app-icon 
            [name]="getIconName()" 
            [class.text-danger]="target.isDangerous"
            [class.text-primary]="!target.isDangerous"
            size="24"
        />
      </div>
      
      <div class="ais-info">
        <div class="ais-header">
          <span class="ais-name">{{ target.name || target.mmsi }}</span>
          <span class="ais-badge" *ngIf="target.isDangerous">DANGEROUS</span>
        </div>
        
        <div class="ais-details">
          <span *ngIf="target.cpa !== undefined && target.cpa !== null">CPA: {{ target.cpa | distance }}</span>
          <span *ngIf="target.sog !== undefined">{{ target.sog | number:'1.1-1' }} kn</span>
        </div>
      </div>
      
      <div class="ais-meta">
         <span class="ais-status">{{ getStatusLabel() }}</span>
         <span class="ais-recency">{{ target.lastUpdated | timeAgo }}</span>
      </div>
    </div>
  `,
  styles: [`
    .ais-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      gap: 0.75rem;
      background: var(--surface-1);
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .ais-item:hover {
      background: var(--surface-2);
    }

    .ais-item.selected {
      background: var(--surface-active);
      border-left: 3px solid var(--primary);
    }
    
    .ais-item.dangerous {
      border-left: 3px solid var(--danger);
    }

    .ais-icon-col {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ais-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .ais-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ais-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ais-badge {
      font-size: 0.65rem;
      font-weight: bold;
      background-color: var(--danger);
      color: white;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }

    .ais-details {
      display: flex;
      font-size: 0.8rem;
      color: var(--text-secondary);
      gap: 0.75rem;
    }

    .ais-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      gap: 0.25rem;
    }
    
    .text-danger { color: var(--danger); }
    .text-primary { color: var(--text-primary); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AisTargetItemComponent {
  @Input({ required: true }) target!: AisTarget;
  @Input() selected = false;
  @Output() clicked = new EventEmitter<void>();

  getIconName(): IconName {
    if (this.target.isDangerous) return 'alert-triangle';
    switch (this.target.state) {
      case AisNavStatus.AtAnchor:
      case AisNavStatus.Moored:
        return 'anchor';
      default:
        return 'navigation';
    }
  }

  getStatusLabel(): string {
    if (this.target.state === undefined) return 'Unknown';
    switch (this.target.state) {
      case AisNavStatus.UnderWayUsingEngine: return 'Underway (Eng)';
      case AisNavStatus.AtAnchor: return 'Anchored';
      case AisNavStatus.NotUnderCommand: return 'NUC';
      case AisNavStatus.RestrictedManeuverability: return 'Restricted';
      case AisNavStatus.ConstrainedByDraft: return 'Constrained';
      case AisNavStatus.Moored: return 'Moored';
      case AisNavStatus.Aground: return 'Aground';
      case AisNavStatus.EngagedInFishing: return 'Fishing';
      case AisNavStatus.UnderWaySailing: return 'Sailing';
      default: return AisNavStatus[this.target.state] ?? 'Unknown';
    }
  }
}
