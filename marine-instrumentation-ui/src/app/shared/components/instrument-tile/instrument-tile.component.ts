import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { StatusTone } from '../../../features/dashboard/types/dashboard-vm';

@Component({
  selector: 'app-shared-instrument-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instrument-tile.component.html',
  styleUrls: ['./instrument-tile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentTileComponent {
  @Input() label = '';
  @Input() value = '--';
  @Input() unit = '';
  @Input() tone: StatusTone = 'neutral';
}
