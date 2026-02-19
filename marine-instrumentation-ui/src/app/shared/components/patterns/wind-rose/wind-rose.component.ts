import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wind-rose',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wind-rose.component.html',
  styleUrls: ['./wind-rose.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WindRoseComponent {
  /** Apparent Wind Angle (-180 to 180 or 0-360) rel to bow */
  @Input() awa: number = 0;
  
  /** Apparent Wind Speed */
  @Input() aws: number = 0;
  
  /** True Wind Angle (optional) */
  @Input() twa?: number;
  
  /** True Wind Speed (optional) */
  @Input() tws?: number;
  
  /** Component size in pixels */
  @Input() size: number = 300;

  // Generate ticks for 0-360 degrees
  readonly ticks = Array.from({ length: 36 }, (_, i) => i * 10);
}
