import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AUTOPILOT_PATHS,
  AutopilotStoreService,
  AutopilotState,
} from '../../state/autopilot/autopilot-store.service';
import {
  SignalKAutopilotService,
  AutopilotTuning,
} from '../../data-access/signalk/autopilot/signalk-autopilot.service';
import { NotificationService } from '../../core/services/notification.service';

@Injectable({
  providedIn: 'root',
})
export class AutopilotFacadeService {
  private store = inject(AutopilotStoreService);
  private api = inject(SignalKAutopilotService);
  private notification = inject(NotificationService);
  private readonly commandErrorSubject = new BehaviorSubject<string | null>(null);

  // State exposure
  public readonly state$ = this.store.state$;
  public readonly targetHeadingTrue$ = this.store.targetHeadingTrue$;
  public readonly targetHeadingMagnetic$ = this.store.targetHeadingMagnetic$;
  public readonly targetWindAngle$ = this.store.targetWindAngle$;
  public readonly targetRudderAngle$ = this.store.targetRudderAngle$;
  public readonly motorCurrent$ = this.store.motorCurrent$;
  public readonly rudderAngle$ = this.store.rudderAngle$;
  public readonly batteryVoltage$ = this.store.batteryVoltage$;
  public readonly fault$ = this.store.fault$;
  public readonly windHazard$ = this.store.windHazard$;
  public readonly noGo$ = this.store.noGo$;
  public readonly isConnected$ = this.store.isConnected$;
  public readonly routeActiveLeg$ = this.store.routeActiveLeg$;
  public readonly routeLength$ = this.store.routeLength$;
  public readonly routeComplete$ = this.store.routeComplete$;
  public readonly routeWaypoints$ = this.store.routeWaypoints$;
  public readonly commandError$ = this.commandErrorSubject.asObservable();

  // Commands

  public setState(state: AutopilotState): void {
    this.runCommand(this.api.setState(state));
  }

  public engageAuto(): void {
    this.runCommand(this.api.engage('auto'));
  }

  public engageWind(): void {
    this.runCommand(this.api.engage('wind'));
  }

  public engageRoute(): void {
    this.runCommand(this.api.engage('route'));
  }

  public standby(): void {
    this.runCommand(this.api.standby());
  }

  public engageTrack(): void {
    this.runCommand(this.api.engage('route'));
  }

  public clearFault(): void {
    this.runCommand(this.api.clearFault());
  }

  public emergencyStop(): void {
    this.runCommand(this.api.emergencyStop());
  }

  public driveTest(side: 'port' | 'stbd', seconds = 2): void {
    this.runCommand(this.api.driveTest(side, seconds));
  }

  public loadTuning() {
    return this.api.getTuning();
  }

  public saveTuning(partial: Partial<AutopilotTuning>) {
    return this.api.setTuning(partial);
  }

  public adjustTarget(deltaDegrees: number): void {
    const currentState = this.store.getSnapshot<string>(AUTOPILOT_PATHS.state) as AutopilotState;
    const deltaRadians = deltaDegrees * (Math.PI / 180);

    if (currentState === 'auto') {
      const currentHeading = this.store.getSnapshot<number>(AUTOPILOT_PATHS.targetHeadingTrue);
      if (currentHeading !== undefined) {
        this.runCommand(this.api.setTargetHeading(currentHeading + deltaRadians));
      }
    } else if (currentState === 'wind') {
      const currentWindIdx = this.store.getSnapshot<number>(
        AUTOPILOT_PATHS.targetWindAngleApparent,
      );
      if (currentWindIdx !== undefined) {
        this.runCommand(this.api.setTargetWindAngle(currentWindIdx + deltaRadians));
      }
    }
  }

  private clearErrorTimer?: ReturnType<typeof setTimeout>;

  private runCommand(command: Observable<unknown>): void {
    this.commandErrorSubject.next(null);
    command.subscribe({
      error: (error: unknown) => this.reportError(error),
    });
  }

  private reportError(error: unknown): void {
    const message = this.describeError(error);
    this.commandErrorSubject.next(message);

    // Use the notification system for user-visible feedback.
    if (this.isUnreachableError(error)) {
      this.notification.autopilotUnreachable();
    } else {
      this.notification.error(message, 'Autopilot');
    }

    if (this.clearErrorTimer) {
      clearTimeout(this.clearErrorTimer);
    }
    // Auto-dismiss so a transient refusal does not stick on screen.
    this.clearErrorTimer = setTimeout(() => this.commandErrorSubject.next(null), 5000);
  }

  private isUnreachableError(error: unknown): boolean {
    const err = error as { status?: number };
    return err?.status === 0 || err?.status === undefined;
  }

  /** Prefer the engine's reason from a 409/4xx body (`{ error }`) over the generic HTTP message. */
  private describeError(error: unknown): string {
    const err = error as { error?: { error?: string }; status?: number; message?: string };
    const reason = err?.error?.error;
    if (typeof reason === 'string' && reason.length > 0) {
      return reason;
    }
    if (err?.status === 0) {
      return 'autopilot engine unreachable';
    }
    if (typeof err?.status === 'number') {
      return `autopilot command failed (${err.status})`;
    }
    return 'autopilot command failed';
  }
}
