import { Pipe, PipeTransform } from '@angular/core';
import { METERS_PER_NM } from '../../state/calculations/navigation';

@Pipe({
  name: 'distance',
  standalone: true,
})
export class DistancePipe implements PipeTransform {
  transform(value: number | null | undefined, unit: 'nm' | 'm' = 'nm'): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '--';
    }

    if (unit === 'm') {
      return `${value.toFixed(0)} m`;
    }

    const nm = value / METERS_PER_NM;
    if (nm >= 10) return `${nm.toFixed(1)} nm`;
    return `${nm.toFixed(2)} nm`;
  }
}
