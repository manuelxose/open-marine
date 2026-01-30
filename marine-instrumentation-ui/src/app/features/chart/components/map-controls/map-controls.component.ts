import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-controls.component.html',
  styleUrls: ['./map-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapControlsComponent {
  @Input() orientation: 'north-up' | 'course-up' = 'north-up';
  @Input() canCenter = false;
  @Input() vertical = true;

  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() centerOnVessel = new EventEmitter<void>();
  @Output() toggleOrientation = new EventEmitter<void>();
  @Output() toggleLayers = new EventEmitter<void>();
}
