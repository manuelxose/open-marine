import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-alarm-banner',
  standalone: true,
  template: `
    <div class="alarm-banner">
      <span class="text-muted">No active alarms</span>
    </div>
  `,
  styles: [`
    .alarm-banner {
      height: 32px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      padding: 0 1rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlarmBannerComponent {}
