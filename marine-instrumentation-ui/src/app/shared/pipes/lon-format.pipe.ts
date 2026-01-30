import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lonFormat',
  standalone: true,
})
export class LonFormatPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 4): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '--';
    const hemi = value >= 0 ? 'E' : 'W';
    const abs = Math.abs(value).toFixed(digits);
    return `${abs}° ${hemi}`;
  }
}
