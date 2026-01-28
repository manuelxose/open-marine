import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstrumentTileComponent } from '../../../../shared/components/instrument-tile/instrument-tile.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { CriticalStripVm } from '../../types/dashboard-vm';

@Component({
  selector: 'app-dashboard-critical-strip',
  standalone: true,
  imports: [CommonModule, InstrumentTileComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './critical-strip.component.html',
  styleUrls: ['./critical-strip.component.css'],
})
export class CriticalStripComponent {
  @Input({ required: true }) vm!: CriticalStripVm;

  readonly placeholders = Array.from({ length: 6 });

  trackByLabel(index: number, item: CriticalStripVm['items'][number]): string {
    return item.label;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
