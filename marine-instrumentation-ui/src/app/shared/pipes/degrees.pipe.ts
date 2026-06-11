import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'degrees',
  standalone: true
})
export class DegreesPipe implements PipeTransform {

  transform(value: number | null | undefined, digits: number = 0): string {
    if (value === null || value === undefined) {
      return '---';
    }
    const degrees = value * (180 / Math.PI);
    return degrees.toFixed(digits);
  }

}
