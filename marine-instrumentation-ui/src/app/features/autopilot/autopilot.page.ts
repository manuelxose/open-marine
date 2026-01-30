import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutopilotConsoleComponent } from './components/autopilot-console/autopilot-console.component';

@Component({
  selector: 'app-autopilot-page',
  standalone: true,
  imports: [CommonModule, AutopilotConsoleComponent],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Autopilot</h1>
      </header>
      
      <div class="page-content">
        <div class="console-wrapper">
            <app-autopilot-console></app-autopilot-console>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: var(--layout-gap);
        gap: var(--layout-gap);
    }
    .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-primary);
    }
    .page-content {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: flex-start;
    }
    .console-wrapper {
        width: 100%;
        max-width: 500px;
        aspect-ratio: 4/5;
    }
  `]
})
export class AutopilotPage {}
