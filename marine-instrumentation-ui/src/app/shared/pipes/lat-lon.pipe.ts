import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats coordinates in nautical DMS style: DD°MM.MMM' N/S (or E/W).
 *
 * Usage:
 *   {{ position | latLon:'lat' }}   → 41°23.456'N
 *   {{ position | latLon:'lon' }}   → 002°11.234'E
 */
@Pipe({
  name: 'latLon',
  standalone: true,
})
export class LatLonPipe implements PipeTransform {
  transform(
    value: { lat: number; lon: number } | null | undefined,
    axis: 'lat' | 'lon' = 'lat'
  ): string {
    if (!value) return '---';

    const coord = axis === 'lat' ? value.lat : value.lon;
    if (coord === null || coord === undefined || !Number.isFinite(coord)) {
      return '---';
    }

    const isLat = axis === 'lat';
    const hemi = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    const absVal = Math.abs(coord);
    const deg = Math.floor(absVal);
    const min = (absVal - deg) * 60;

    const degStr = isLat
      ? deg.toString().padStart(2, '0')
      : deg.toString().padStart(3, '0');

    return `${degStr}°${min.toFixed(3)}'${hemi}`;
  }
}
