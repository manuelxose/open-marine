import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alarms-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alarms-page">
      <div class="page-header">
        <h1>Alarms</h1>
        <p class="subtitle">No active alarms</p>
      </div>

      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h3>All Clear</h3>
        <p>No active alarms or warnings at this time</p>
      </div>
    </div>
  `,
  styles: [`
    .alarms-page {
      padding: 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--fg);
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--success);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .empty-state svg {
      color: var(--muted);
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--fg);
      margin: 0;
    }

    .empty-state p {
      color: var(--muted);
      margin: 0;
    }
  `]
})
export class AlarmsPage {}
