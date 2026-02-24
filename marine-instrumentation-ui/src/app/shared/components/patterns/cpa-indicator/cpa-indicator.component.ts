import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';

export type CPAIndicatorStatus = 'safe' | 'warning' | 'danger';

export interface CPAIndicatorThreshold {
  cpa: number; // nm
  tcpa: number; // seconds
  dangerCpa?: number; // nm
  dangerTcpa?: number; // seconds
}

@Component({
  selector: 'app-cpa-indicator',
  standalone: true,
  imports: [CommonModule, AppBoxComponent, AppStackComponent, AppTextComponent],
  template: `
    <app-box class="cpa-indicator" padding="3">
      <app-stack spacing="sm">
        <div class="header">
          <div>
            <app-text variant="overline">CPA / TCPA</app-text>
            <app-text variant="caption" class="text-muted">{{ subtitle() }}</app-text>
          </div>
          <span class="status-pill" [ngClass]="statusClass()">
            <app-text variant="overline">{{ statusLabel() }}</app-text>
          </span>
        </div>

        <div class="metrics">
          <div class="metric">
            <app-text variant="caption" class="text-muted">CPA</app-text>
            <app-text variant="value" size="xl">{{ formatCpa(cpa) }}</app-text>
          </div>
          <div class="metric">
            <app-text variant="caption" class="text-muted">TCPA</app-text>
            <app-text variant="value" size="xl">{{ formatTcpa(tcpa) }}</app-text>
          </div>
        </div>
      </app-stack>
    </app-box>
  `,
  styleUrls: ['./cpa-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CPAIndicatorComponent {
  @Input() cpa?: number; // nm
  @Input() tcpa?: number; // seconds
  @Input() threshold: CPAIndicatorThreshold | number = { cpa: 0.5, tcpa: 900 };

  statusLabel(): string {
    const status = this.status();
    if (status === 'danger') return 'Danger';
    if (status === 'warning') return 'Warning';
    return 'Safe';
  }

  statusClass(): string {
    return `status-${this.status()}`;
  }

  subtitle(): string {
    if (this.cpa === undefined && this.tcpa === undefined) return 'No collision data';
    return 'Closest point approach';
  }

  formatCpa(value?: number): string {
    if (value === undefined || value === null) return '-- nm';
    return `${value.toFixed(2)} nm`;
  }

  formatTcpa(value?: number): string {
    if (value === undefined || value === null) return '-- min';
    const mins = Math.max(0, Math.round(value / 60));
    return `${mins} min`;
  }

  private status(): CPAIndicatorStatus {
    if (this.cpa === undefined && this.tcpa === undefined) return 'safe';
    const threshold = this.normalizeThreshold();
    const cpaDanger = threshold.dangerCpa ?? threshold.cpa / 2;
    const tcpaDanger = threshold.dangerTcpa ?? threshold.tcpa / 2;

    if ((this.cpa !== undefined && this.cpa <= cpaDanger) ||
        (this.tcpa !== undefined && this.tcpa <= tcpaDanger)) {
      return 'danger';
    }

    if ((this.cpa !== undefined && this.cpa <= threshold.cpa) ||
        (this.tcpa !== undefined && this.tcpa <= threshold.tcpa)) {
      return 'warning';
    }

    return 'safe';
  }

  private normalizeThreshold(): CPAIndicatorThreshold {
    if (typeof this.threshold === 'number') {
      return { cpa: this.threshold, tcpa: 900 };
    }
    return this.threshold;
  }
}
