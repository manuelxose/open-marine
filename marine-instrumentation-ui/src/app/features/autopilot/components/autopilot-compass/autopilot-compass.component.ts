import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { AutopilotFacadeService } from '../../autopilot.facade';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';
import { AutopilotCompassWidgetComponent } from '../../../../ui/instruments/autopilot-compass-widget/autopilot-compass-widget.component';

const HEADING_PATH = PATHS.navigation?.headingTrue ?? 'navigation.headingTrue';

/**
 * Autopilot-page container for the heading dial. Owns the Signal K / facade data
 * wiring and feeds the reusable, presentational {@link AutopilotCompassWidgetComponent}.
 * All heading/degree/rotation geometry lives in the widget — this component only
 * converts radians → degrees and selects the mode.
 */
@Component({
  selector: 'app-autopilot-compass',
  standalone: true,
  imports: [AutopilotCompassWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-autopilot-compass-widget
      [headingDeg]="headingDeg()"
      [targetDeg]="targetDeg()"
      [rudderDeg]="rudderDeg()"
      [mode]="mode()"
    />
  `,
})
export class AutopilotCompassComponent {
  private readonly facade = inject(AutopilotFacadeService);
  private readonly store = inject(DatapointStoreService);

  readonly mode = toSignal(this.facade.state$, { initialValue: 'standby' as const });

  private readonly headingRad = toSignal(
    this.store.observe<number>(HEADING_PATH).pipe(map((dp) => dp?.value)),
    { initialValue: undefined },
  );
  private readonly targetRad = toSignal(this.facade.targetHeadingTrue$, { initialValue: undefined });
  private readonly rudderRad = toSignal(this.facade.rudderAngle$, { initialValue: undefined });

  readonly headingDeg = computed(() => this.toDeg(this.headingRad()));
  readonly targetDeg = computed(() => this.toDeg(this.targetRad()));
  readonly rudderDeg = computed(() => {
    const d = this.rudderRad();
    return d === undefined ? null : (d * 180) / Math.PI;
  });

  private toDeg(rad: number | undefined): number | null {
    if (rad === undefined) {
      return null;
    }
    let deg = (rad * 180) / Math.PI;
    deg %= 360;
    if (deg < 0) {
      deg += 360;
    }
    return deg;
  }
}
