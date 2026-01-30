import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: number | string | Date | null | undefined): string {
    if (value === null || value === undefined) {
      return '--';
    }

    const ts =
      value instanceof Date
        ? value.getTime()
        : typeof value === 'string'
          ? Date.parse(value)
          : value;

    if (!Number.isFinite(ts)) {
      return '--';
    }

    const diffMs = Date.now() - ts;
    if (diffMs < 0) return 'just now';

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
