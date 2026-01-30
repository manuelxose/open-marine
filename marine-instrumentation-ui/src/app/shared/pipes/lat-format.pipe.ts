import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'latFormat',
  standalone: true,
})
export class LatFormatPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 4): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '--';
    const hemi = value >= 0 ? 'N' : 'S';
    const abs = Math.abs(value).toFixed(digits);
    return `${abs}° ${hemi}`;
  }
}
