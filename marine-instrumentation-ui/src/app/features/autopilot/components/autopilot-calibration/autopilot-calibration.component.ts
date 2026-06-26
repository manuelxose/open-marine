import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { AutopilotTuning } from '../../../../data-access/signalk/autopilot/signalk-autopilot.service';

const DEFAULT_TUNING: AutopilotTuning = {
  kp: 1.2, ki: 0.05, kd: 8, deadbandDeg: 1,
  rudderLimitDeg: 35, pwmMin: 0.15, pwmMax: 1, currentLimitA: 10, voltageCutoff: 11.5,
};

interface Field {
  key: keyof AutopilotTuning;
  label: string;
  step: number;
  hint: string;
}

/**
 * Autopilot calibration overlay: PID + limits tuning (persisted in the engine),
 * a dock-side jog test (STANDBY only) and a software E-stop. Gated controls keep
 * the helm safe; the jog test still runs through the engine safety layer.
 */
@Component({
  selector: 'app-autopilot-calibration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal-overlay" (click)="close.emit()">
      <div class="cal" (click)="$event.stopPropagation()" role="dialog" aria-label="Autopilot calibration">
        <header class="cal__head">
          <h2>Calibration</h2>
          <button class="cal__x" (click)="close.emit()" aria-label="Close">✕</button>
        </header>

        <div class="cal__body">
          <section class="cal__group">
            <h3>PID</h3>
            <div class="cal__grid">
              <label *ngFor="let f of pidFields" class="cal__field">
                <span class="cal__label">{{ f.label }}</span>
                <input type="number" [step]="f.step" [(ngModel)]="model[f.key]" />
                <span class="cal__hint">{{ f.hint }}</span>
              </label>
            </div>
          </section>

          <section class="cal__group">
            <h3>Limits</h3>
            <div class="cal__grid">
              <label *ngFor="let f of limitFields" class="cal__field">
                <span class="cal__label">{{ f.label }}</span>
                <input type="number" [step]="f.step" [(ngModel)]="model[f.key]" />
                <span class="cal__hint">{{ f.hint }}</span>
              </label>
            </div>
          </section>

          <section class="cal__group">
            <h3>Dock-side test</h3>
            <p class="cal__note" *ngIf="!isStandby()">⚠ Disengage to STANDBY to jog the helm.</p>
            <div class="cal__jog">
              <button [disabled]="!isStandby()" (click)="facade.driveTest('port', 2)">◀ JOG PORT</button>
              <button [disabled]="!isStandby()" (click)="facade.driveTest('stbd', 2)">JOG STBD ▶</button>
            </div>
          </section>
        </div>

        <footer class="cal__foot">
          <button class="cal__estop" (click)="facade.emergencyStop()">■ EMERGENCY STOP</button>
          <div class="cal__actions">
            <button class="cal__reset" (click)="reset()">Reset defaults</button>
            <button class="cal__save" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Apply' }}</button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .cal-overlay {
      position: fixed; inset: 0; z-index: var(--z-40, 40);
      background: var(--overlay-backdrop, rgba(0,0,0,0.5));
      backdrop-filter: var(--overlay-blur, blur(4px));
      display: flex; align-items: center; justify-content: center; padding: var(--space-4);
    }
    .cal {
      width: 100%; max-width: 560px; max-height: 90vh; overflow: auto;
      background: var(--gb-bg-panel); border: 1px solid var(--gb-border-panel);
      border-radius: var(--radius-lg); box-shadow: var(--chart-overlay-shadow);
    }
    .cal__head {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-4); border-bottom: 1px solid var(--gb-border-panel);
    }
    .cal__head h2 { margin: 0; font-size: 1.1rem; color: var(--gb-text-value); }
    .cal__x { background: transparent; border: none; color: var(--gb-text-muted); font-size: 1.1rem; cursor: pointer; }

    .cal__body { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-5); }
    .cal__group h3 { margin: 0 0 var(--space-2); font-size: 0.7rem; letter-spacing: 0.1em; color: var(--gb-text-muted); text-transform: uppercase; }
    .cal__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-3); }
    .cal__field { display: flex; flex-direction: column; gap: 2px; }
    .cal__label { font-size: 0.72rem; color: var(--gb-text-value); font-weight: 700; }
    .cal__field input {
      background: var(--gb-bg-bezel); border: 1px solid var(--gb-border-panel);
      color: var(--gb-text-value); border-radius: var(--radius-sm); padding: var(--space-2);
      font-family: var(--font-mono, monospace); min-height: 40px;
    }
    .cal__hint { font-size: 0.6rem; color: var(--gb-text-muted); }
    .cal__note { color: var(--gb-data-warn); font-size: 0.78rem; margin: 0 0 var(--space-2); }

    .cal__jog { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .cal__jog button {
      min-height: 48px; border-radius: var(--radius-md); cursor: pointer; font-weight: 800;
      background: var(--gb-bg-glass); border: 1px solid var(--gb-border-active); color: var(--gb-text-value);
    }
    .cal__jog button:disabled { opacity: 0.4; cursor: not-allowed; border-color: var(--gb-border-panel); }

    .cal__foot {
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
      padding: var(--space-4); border-top: 1px solid var(--gb-border-panel); flex-wrap: wrap;
    }
    .cal__estop {
      min-height: 48px; padding: 0 var(--space-4); border-radius: var(--radius-md); cursor: pointer;
      font-weight: 900; letter-spacing: 0.05em; border: none;
      background: var(--gb-data-stale); color: var(--gb-bg-canvas);
    }
    .cal__actions { display: flex; gap: var(--space-2); margin-left: auto; }
    .cal__reset {
      min-height: 44px; padding: 0 var(--space-3); border-radius: var(--radius-md); cursor: pointer;
      background: transparent; border: 1px solid var(--gb-border-panel); color: var(--gb-text-muted);
    }
    .cal__save {
      min-height: 44px; padding: 0 var(--space-5); border-radius: var(--radius-md); cursor: pointer;
      background: var(--gb-tick-reference); color: var(--gb-bg-canvas); border: none; font-weight: 800;
    }
    .cal__save:disabled { opacity: 0.5; cursor: progress; }
  `],
})
export class AutopilotCalibrationComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  public facade = inject(AutopilotFacadeService);

  model: AutopilotTuning = { ...DEFAULT_TUNING };
  readonly saving = signal(false);

  private readonly stateSig = signal<string>('standby');
  isStandby(): boolean {
    return this.stateSig() === 'standby';
  }

  readonly pidFields: Field[] = [
    { key: 'kp', label: 'Kp', step: 0.1, hint: 'proportional' },
    { key: 'ki', label: 'Ki', step: 0.01, hint: 'integral (drift)' },
    { key: 'kd', label: 'Kd', step: 0.5, hint: 'damping' },
    { key: 'deadbandDeg', label: 'Deadband', step: 0.5, hint: '° no-action' },
  ];
  readonly limitFields: Field[] = [
    { key: 'rudderLimitDeg', label: 'Rudder limit', step: 1, hint: '° max helm' },
    { key: 'pwmMin', label: 'PWM min', step: 0.05, hint: '0..1 friction floor' },
    { key: 'pwmMax', label: 'PWM max', step: 0.05, hint: '0..1 cap' },
    { key: 'currentLimitA', label: 'Current limit', step: 0.5, hint: 'A overcurrent' },
    { key: 'voltageCutoff', label: 'Voltage cutoff', step: 0.1, hint: 'V low-batt' },
  ];

  ngOnInit(): void {
    this.facade.state$.subscribe((s) => this.stateSig.set(s));
    this.facade.loadTuning().subscribe({
      next: (res) => {
        if (res?.tuning) {
          this.model = { ...DEFAULT_TUNING, ...res.tuning };
        }
      },
      error: () => {
        /* keep defaults if engine unreachable */
      },
    });
  }

  reset(): void {
    this.model = { ...DEFAULT_TUNING };
  }

  save(): void {
    this.saving.set(true);
    this.facade.saveTuning(this.model).subscribe({
      next: (res) => {
        if (res?.tuning) {
          this.model = { ...this.model, ...res.tuning };
        }
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
