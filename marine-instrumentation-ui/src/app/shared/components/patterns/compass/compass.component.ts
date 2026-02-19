import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compass.component.html',
  styleUrls: ['./compass.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompassComponent {
  /** Vessel Heading in degrees (0-360) */
  @Input() heading: number = 0;
  
  /** Course Over Ground in degrees (optional) */
  @Input() cog?: number;
  
  /** Bearing to Waypoint in degrees (optional) */
  @Input() bearingTo?: number;
  
  /** Size in pixels */
  @Input() size: number = 300;
  
  /** Whether the compass can be dragged/rotated (not implemented yet for MVP) */
  @Input() interactive: boolean = false;

  readonly ticks = Array.from({ length: 72 }, (_, i) => i * 5); // Every 5 degrees
}
