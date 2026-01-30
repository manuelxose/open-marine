import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { DegreesPipe } from '../../../../shared/pipes/degrees.pipe';

@Component({
  selector: 'app-autopilot-console',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, DegreesPipe],
  template: `
    <div class="ap-console-wrapper">
      <div class="disconnected-overlay" *ngIf="!(facade.isConnected$ | async)">
          <span class="icon">⚠️</span>
          <span class="text">AUTOPILOT DISCONNECTED</span>
      </div>
      
      <div class="ap-console" *ngIf="facade.state$ | async as state" [class.disabled]="!(facade.isConnected$ | async)">
      <!-- Header / Status -->
      <div class="ap-status" [class.engaged]="state !== 'standby'">
        <div class="status-indicator"></div>
        <div class="status-text">
            <span class="label">STATUS</span>
            <span class="value">{{ state | uppercase }}</span>
        </div>
      </div>

      <!-- Main Data Display -->
      <div class="ap-display">
          <div class="data-box target">
              <span class="label">TARGET</span>
              <ng-container [ngSwitch]="state">
                  <span *ngSwitchCase="'wind'" class="value">
                      {{ (facade.targetWindAngle$ | async) | degrees }}°
                  </span>
                  <span *ngSwitchDefault class="value">
                      {{ (facade.targetHeadingTrue$ | async) | degrees }}°
                  </span>
              </ng-container>
          </div>
          <!-- Current Heading would ideally come from nav store, 
               but for now let's focus on AP internals or nothing -->
      </div>

      <!-- Controls -->
      <div class="ap-controls">
        <!-- Standby / Disengage -->
        <app-button 
            *ngIf="state !== 'standby'"
            variant="danger" 
            class="engage-btn"
            (click)="facade.standby()"
        >
            STANDBY
        </app-button>

        <!-- Mode Selectors -->
        <div class="mode-selector">
             <button 
                class="mode-btn" 
                [class.active]="state === 'auto'"
                (click)="facade.engageAuto()"
             >
                AUTO
             </button>
             <button 
                class="mode-btn" 
                [class.active]="state === 'wind'"
                (click)="facade.engageWind()"
             >
                WIND
             </button>
             <button 
                class="mode-btn" 
                [class.active]="state === 'route'"
                (click)="facade.engageRoute()"
             >
                ROUTE
             </button>
        </div>
      </div>
      
      <!-- Adjustments (Only visible when engaged in Auto/Wind) -->
      <div class="ap-adjust" *ngIf="state === 'auto' || state === 'wind'">
          <div class="adjust-group left">
              <button class="adjust-btn" (click)="facade.adjustTarget(-10)">-10</button>
              <button class="adjust-btn" (click)="facade.adjustTarget(-1)">-1</button>
          </div>
          <div class="adjust-group right">
              <button class="adjust-btn" (click)="facade.adjustTarget(1)">+1</button>
              <button class="adjust-btn" (click)="facade.adjustTarget(10)">+10</button>
          </div>
      </div>
      </div> <!-- Close ap-console -->
    </div> <!-- Close ap-console-wrapper -->
  `,
  styles: [`
    .ap-console-wrapper {
        position: relative;
        height: 100%;
        overflow: hidden;
        border-radius: 12px; 
    }
    .disconnected-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(4px);
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--warn); /* Yellow/Orange usually better for attention on dark bg */
        font-weight: bold;
        gap: 1rem;
        text-align: center;
    }
    .disconnected-overlay .icon {
        font-size: 3rem;
    }
    .ap-console {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background: var(--surface-1);
        border-radius: 12px;
        height: 100%;
        transition: filter 0.3s;
    }
    .ap-console.disabled {
        pointer-events: none;
        filter: grayscale(0.8) opacity(0.5);
    }
    .ap-status {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: var(--surface-2);
        border-radius: 8px;
        border-left: 4px solid var(--text-tertiary);
    }
    .ap-status.engaged {
        border-left-color: var(--success);
        background: rgba(var(--success-rgb), 0.1);
    }
    .status-text {
        display: flex;
        flex-direction: column;
    }
    .status-text .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    .status-text .value {
        font-weight: bold;
        font-size: 1.25rem;
        color: var(--text-primary);
    }
    
    .ap-display {
        display: flex;
        justify-content: center;
        padding: 1rem;
    }
    .data-box {
        text-align: center;
    }
    .data-box .value {
        font-size: 3rem;
        font-family: var(--font-mono);
        font-weight: bold;
        display: block;
        line-height: 1;
    }

    .ap-controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .engage-btn {
        width: 100%;
        height: 3.5rem;
        font-weight: bold;
        font-size: 1.1rem;
    }
    .mode-selector {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0.5rem;
        background: var(--surface-2);
        padding: 0.25rem;
        border-radius: 8px;
    }
    .mode-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        padding: 0.75rem 0.5rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    .mode-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
    }
    .mode-btn.active {
        background: var(--primary);
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .ap-adjust {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem; /* Space between left/right groups */
        margin-top: auto;
    }
    .adjust-group {
        display: flex;
        gap: 0.25rem;
    }
    .adjust-group.left { justify-content: flex-end; }
    .adjust-group.right { justify-content: flex-start; }
    
    .adjust-btn {
        background: var(--surface-3);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-weight: bold;
        padding: 0.75rem 0.5rem;
        border-radius: 6px;
        flex: 1;
        cursor: pointer;
        touch-action: manipulation;
    }
    .adjust-btn:active {
        background: var(--primary);
        color: white;
    }
  `]
})
export class AutopilotConsoleComponent {
  public facade = inject(AutopilotFacadeService);
}
