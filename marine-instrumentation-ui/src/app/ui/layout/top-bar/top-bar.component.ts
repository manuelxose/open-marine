import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top-bar">
      <div class="left">
        <div class="brand">OMI</div>
        <div class="connection-pill" [class.connected]="connected">
          {{ connected ? 'ONLINE' : 'OFFLINE' }}
        </div>
      </div>
      
      <div class="right">
        <a routerLink="/diagnostics" class="icon-btn text-muted" title="Diagnostics">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </a>
        <button (click)="toggleTheme.emit()" class="theme-btn text-muted">
          {{ isNight ? '🌙' : '☀️' }}
        </button>
      </div>
    </header>
  `,
  styles: [`
    .top-bar {
      height: 64px;
      padding: 0 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      background: var(--card-bg);
    }
    .left, .right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .brand {
      font-weight: 700;
      font-size: 1.25rem;
      letter-spacing: -0.025em;
    }
    .connection-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      background: var(--muted);
      color: white;
      border-radius: 999px;
      transition: background 0.3s;
    }
    .connection-pill.connected {
      background: var(--success);
    }
    .icon-btn, .theme-btn {
      background: none;
      border: none;
      padding: 0.5rem;
      border-radius: 50%;
    }
    .icon-btn:hover, .theme-btn:hover {
      background: var(--bg);
      color: var(--accent);
    }
  `]
})
export class TopBarComponent {
  @Input() connected: boolean = false;
  @Input() isNight: boolean | null = false;
  @Output() toggleTheme = new EventEmitter<void>();
}
