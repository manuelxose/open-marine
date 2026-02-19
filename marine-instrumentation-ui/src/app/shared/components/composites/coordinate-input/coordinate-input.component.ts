import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconButtonComponent } from '../../app-icon-button/app-icon-button.component';

export interface Coordinate {
  lat: number;
  lon: number;
}

type CardinalLat = 'N' | 'S';
type CardinalLon = 'E' | 'W';

@Component({
  selector: 'app-coordinate-input',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconButtonComponent],
  templateUrl: './coordinate-input.component.html',
  styleUrls: ['./coordinate-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoordinateInputComponent implements OnChanges {
  @Input() lat: number = 0;
  @Input() lon: number = 0;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() showMapButton = true;
  @Input() label = 'Position';

  @Output() coordinateChange = new EventEmitter<Coordinate>();
  @Output() mapSelect = new EventEmitter<void>();

  // Internal state for form controls (D M Cardinal)
  latDeg = signal<number>(0);
  latMin = signal<number>(0);
  latCard = signal<CardinalLat>('N');

  lonDeg = signal<number>(0);
  lonMin = signal<number>(0);
  lonCard = signal<CardinalLon>('E');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lat'] || changes['lon']) {
      this.updateInternalState();
    }
  }

  private updateInternalState() {
    // Latitude
    const latAbs = Math.abs(this.lat);
    this.latDeg.set(Math.floor(latAbs));
    this.latMin.set(parseFloat(((latAbs - Math.floor(latAbs)) * 60).toFixed(3)));
    this.latCard.set(this.lat >= 0 ? 'N' : 'S');

    // Longitude
    const lonAbs = Math.abs(this.lon);
    this.lonDeg.set(Math.floor(lonAbs));
    this.lonMin.set(parseFloat(((lonAbs - Math.floor(lonAbs)) * 60).toFixed(3)));
    this.lonCard.set(this.lon >= 0 ? 'E' : 'W');
  }

  onLatChange() {
    const val = this.latDeg() + (this.latMin() / 60);
    const signed = this.latCard() === 'N' ? val : -val;
    this.emitChange(signed, this.getLonFromState());
  }

  onLonChange() {
    const val = this.lonDeg() + (this.lonMin() / 60);
    const signed = this.lonCard() === 'E' ? val : -val;
    this.emitChange(this.getLatFromState(), signed);
  }

  toggleLatCard() {
    if (this.disabled || this.readonly) return;
    this.latCard.set(this.latCard() === 'N' ? 'S' : 'N');
    this.onLatChange();
  }

  toggleLonCard() {
    if (this.disabled || this.readonly) return;
    this.lonCard.set(this.lonCard() === 'E' ? 'W' : 'E');
    this.onLonChange();
  }

  private getLatFromState(): number {
    const val = (this.latDeg() || 0) + ((this.latMin() || 0) / 60);
    return this.latCard() === 'N' ? val : -val;
  }

  private getLonFromState(): number {
    const val = (this.lonDeg() || 0) + ((this.lonMin() || 0) / 60);
    return this.lonCard() === 'E' ? val : -val;
  }

  private emitChange(newLat: number, newLon: number) {
    this.coordinateChange.emit({ lat: newLat, lon: newLon });
  }

  onMapClick() {
    this.mapSelect.emit();
  }
}
