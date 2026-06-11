import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { GbInstrumentBezelComponent } from '../../../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { SparklineComponent } from '../../../../../shared/components/sparkline/sparkline.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { DataQuality } from '../../../../../shared/services/data-quality.service';
import type { NavigationPanelVm, StatusTone } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-navigation-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, GbInstrumentBezelComponent, SparklineComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navigation-panel.component.html',
  styleUrls: ['./navigation-panel.component.css'],
})
export class NavigationPanelComponent {
  @Input({ required: true }) vm!: NavigationPanelVm;

  trackByMetric(_index: number, item: NavigationPanelVm['metrics'][number]): string {
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
    return this._toneToQuality(this.vm.statusTone);
  }

  private _toneToQuality(tone: StatusTone): DataQuality {
    switch (tone) {
      case 'ok':
        return 'good';
      case 'warn':
        return 'warn';
      case 'alert':
        return 'stale';
      default:
        return 'missing';
    }
  }
}
