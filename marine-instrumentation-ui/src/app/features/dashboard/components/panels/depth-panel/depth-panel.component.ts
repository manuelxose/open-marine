import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { GbInstrumentBezelComponent } from '../../../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { SparklineComponent } from '../../../../../shared/components/sparkline/sparkline.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { DataQualityService, type DataQuality } from '../../../../../shared/services/data-quality.service';
import type { DepthPanelVm } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-depth-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, GbInstrumentBezelComponent, SparklineComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './depth-panel.component.html',
  styleUrls: ['./depth-panel.component.css'],
})
export class DepthPanelComponent {
  private readonly qualityService = inject(DataQualityService);

  @Input({ required: true }) vm!: DepthPanelVm;

  trackByMetric(_index: number, item: DepthPanelVm['metrics'][number]): string {
    return item.label;
  }

  get panelQuality(): DataQuality {
    if (!this.vm) {
      return 'missing';
    }
    if (this.vm.error) {
      return 'stale';
    }
    if (this.vm.isLoading) {
      return 'warn';
    }
    if (this.vm.metrics.length === 0) {
      return 'missing';
    }
    return this.qualityService.getQuality(this.vm.updatedAt ?? null);
  }

  get isUnavailable(): boolean {
    return this.panelQuality === 'stale' || this.panelQuality === 'missing';
  }

  displayValue(value: string): string {
    return this.isUnavailable ? '---' : value;
  }

  showUnit(value: string): boolean {
    if (this.isUnavailable) {
      return false;
    }
    return value !== '--' && value !== '---';
  }
}
