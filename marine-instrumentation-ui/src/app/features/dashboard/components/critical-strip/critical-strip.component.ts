import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppInstrumentCardComponent, InstrumentStatus } from '../../../../shared/components/app-instrument-card/app-instrument-card.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { CriticalStripVm, StatusTone } from '../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-critical-strip',
  standalone: true,
  imports: [CommonModule, AppInstrumentCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './critical-strip.component.html',
  styleUrls: ['./critical-strip.component.css'],
})
export class CriticalStripComponent {
  @Input({ required: true }) vm!: CriticalStripVm;

  readonly placeholders = Array.from({ length: 6 });

  trackByLabel(_index: number, item: CriticalStripVm['items'][number]): string {
    return item.label;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getCardStatus(tone: StatusTone): InstrumentStatus {
    switch (tone) {
      case 'alert': return 'error';
      case 'warn': return 'warning';
      case 'ok': return 'success';
      case 'neutral': return 'neutral';
      default: return 'neutral';
    }
  }
}
