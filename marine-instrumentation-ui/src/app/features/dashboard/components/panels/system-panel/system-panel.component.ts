import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelCardComponent } from '../../../../../shared/components/panel-card/panel-card.component';
import { GbInstrumentBezelComponent } from '../../../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import type { DataQuality } from '../../../../../shared/services/data-quality.service';
import type { SystemPanelVm, SystemPanelLine, StatusTone } from '../../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-system-panel',
  standalone: true,
  imports: [CommonModule, PanelCardComponent, GbInstrumentBezelComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-panel.component.html',
  styleUrls: ['./system-panel.component.css'],
})
export class SystemPanelComponent {
  @Input({ required: true }) vm!: SystemPanelVm;

  trackByLine(_index: number, line: SystemPanelLine): string {
    return line.labelKey;
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
