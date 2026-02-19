import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attitude-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attitude-indicator.component.html',
  styleUrls: ['./attitude-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttitudeIndicatorComponent implements OnChanges {
  @Input() pitch: number = 0; // Degrees. Positive = Nose Up (Sky moves down)
  @Input() roll: number = 0;  // Degrees. Positive = Bank Right (Horizon rotates left)
  @Input() size: number = 200;

  // Visual constants
  private readonly PIXELS_PER_DEGREE = 2.5;

  horizonTransform: string = '';

  ngOnChanges(_changes: SimpleChanges): void {
      // Roll rotates the horizon opposite to bank
      // Pitch moves the horizon. Nose UP (positive pitch) means we see more sky (horizon moves DOWN).
      // So negative translation for positive pitch? 
      // If Nose Up (+), horizon line goes DOWN relative to center reticle.
      // So translateY should be positive?
      // Wait. If I look up, the horizon line moves down. Yes.
      // So translateY = pitch * PIXELS_PER_DEGREE.
      
      const translateY = this.pitch * this.PIXELS_PER_DEGREE;
      const rotate = -this.roll; // Horizon tilts left when we bank right

      this.horizonTransform = `rotate(${rotate}deg) translateY(${translateY}px)`;
  }
}
