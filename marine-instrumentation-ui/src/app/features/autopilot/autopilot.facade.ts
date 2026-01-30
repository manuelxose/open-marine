import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AUTOPILOT_PATHS, AutopilotStoreService, AutopilotState } from '../../state/autopilot/autopilot-store.service';
import { SignalKAutopilotService } from '../../data-access/signalk/autopilot/signalk-autopilot.service';

@Injectable({
  providedIn: 'root'
})
export class AutopilotFacadeService {
  private store = inject(AutopilotStoreService);
  private api = inject(SignalKAutopilotService);

  // State exposure
  public readonly state$ = this.store.state$;
  public readonly targetHeadingTrue$ = this.store.targetHeadingTrue$;
  public readonly targetHeadingMagnetic$ = this.store.targetHeadingMagnetic$;
  public readonly targetWindAngle$ = this.store.targetWindAngle$;
  public readonly isConnected$ = this.store.isConnected$;

  // Commands
  
  public setState(state: AutopilotState): void {
    this.api.setState(state).subscribe();
  }

  public engageAuto(): void {
    this.api.engage('auto').subscribe();
  }

  public engageWind(): void {
    this.api.engage('wind').subscribe();
  }

  public engageRoute(): void {
    this.api.engage('route').subscribe();
  }

  public standby(): void {
    this.api.standby().subscribe();
  }

  public adjustTarget(deltaDegrees: number): void {
    const currentState = this.store.getSnapshot<string>(AUTOPILOT_PATHS.state) as AutopilotState;
    const deltaRadians = deltaDegrees * (Math.PI / 180);

    if (currentState === 'auto') {
      const currentHeading = this.store.getSnapshot<number>(AUTOPILOT_PATHS.targetHeadingTrue);
      if (currentHeading !== undefined) {
        this.api.setTargetHeading(currentHeading + deltaRadians).subscribe();
      }
    } else if (currentState === 'wind') {
      const currentWindIdx = this.store.getSnapshot<number>(AUTOPILOT_PATHS.targetWindAngleApparent);
      if (currentWindIdx !== undefined) {
        this.api.setTargetWindAngle(currentWindIdx + deltaRadians).subscribe();
      }
    }
  }
}
