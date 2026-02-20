import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a heading value (radians) to a 3-digit degrees string (000–360).
 * Returns '---' for null/undefined/NaN values.
 *
 * Usage: {{ headingRadians | heading }}
 */
@Pipe({
  name: 'heading',
  standalone: true,
})
export class HeadingPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '---';
    }
    let degrees = value * (180 / Math.PI);
    degrees = ((degrees % 360) + 360) % 360;
    return degrees.toFixed(0).padStart(3, '0') + '°';
  }
}
