import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shared-panel-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-card.component.html',
  styleUrls: ['./panel-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() statusLabel = '';
  @Input() statusTone: 'ok' | 'warn' | 'alert' | 'neutral' = 'neutral';
  @Input() loading = false;
  @Input() error?: string;
}
