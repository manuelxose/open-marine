import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { bearingDistanceNm, type GeoPoint } from '../../../state/calculations/navigation';

export interface MeasurementState {
  /** Whether measurement mode is active */
  active: boolean;
  /** First point (start) */
  pointA: [number, number] | null; // [lng, lat]
  /** Second point (end) */
  pointB: [number, number] | null; // [lng, lat]
  /** Computed bearing in degrees */
  bearingDeg: number | null;
  /** Computed distance in nautical miles */
  distanceNm: number | null;
}

const INITIAL_STATE: MeasurementState = {
  active: false,
  pointA: null,
  pointB: null,
  bearingDeg: null,
  distanceNm: null,
};

@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private readonly state = new BehaviorSubject<MeasurementState>(INITIAL_STATE);
  readonly state$ = this.state.asObservable();

  get snapshot(): MeasurementState {
    return this.state.value;
  }

  /** Toggle measurement mode on/off. Clears points when turning off. */
  toggle(): void {
    const current = this.state.value;
    if (current.active) {
      this.state.next(INITIAL_STATE);
    } else {
      this.state.next({ ...INITIAL_STATE, active: true });
    }
  }

  /** Add a point. First click sets A, second sets B and computes. Third click resets to new A. */
  addPoint(lngLat: [number, number]): void {
    const current = this.state.value;
    if (!current.active) return;

    if (current.pointA === null) {
      // Set first point
      this.state.next({ ...current, pointA: lngLat, pointB: null, bearingDeg: null, distanceNm: null });
    } else if (current.pointB === null) {
      // Set second point and compute
      const from: GeoPoint = { lat: current.pointA[1], lon: current.pointA[0] };
      const to: GeoPoint = { lat: lngLat[1], lon: lngLat[0] };
      const result = bearingDistanceNm(from, to);
      this.state.next({
        ...current,
        pointB: lngLat,
        bearingDeg: result.bearingDeg,
        distanceNm: result.distanceNm,
      });
    } else {
      // Both points set — start over with new pointA
      this.state.next({
        ...current,
        pointA: lngLat,
        pointB: null,
        bearingDeg: null,
        distanceNm: null,
      });
    }
  }

  /** Clear measurement without leaving mode */
  clear(): void {
    const current = this.state.value;
    if (!current.active) return;
    this.state.next({ ...INITIAL_STATE, active: true });
  }
}
