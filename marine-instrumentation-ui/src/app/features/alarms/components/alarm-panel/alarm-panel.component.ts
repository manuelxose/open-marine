import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmsFacadeService } from '../../services/alarms-facade.service';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AnchorWatchComponent } from '../anchor-watch/anchor-watch.component';
import { AlarmState } from '../../../../state/alarms/alarm.models';

@Component({
  selector: 'app-alarm-panel',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AnchorWatchComponent],
  templateUrl: './alarm-panel.component.html',
  styleUrls: ['./alarm-panel.component.scss']
})
export class AlarmPanelComponent {
  private facade = inject(AlarmsFacadeService);
  
  alarms$ = this.facade.alarms$;
  activeAlarms$ = this.facade.activeAlarms$;

  readonly AlarmState = AlarmState; // make enum available to template

  acknowledge(id: string): void {
    this.facade.acknowledgeAlarm(id);
  }

  silence(id: string): void {
    this.facade.silenceAlarm(id);
  }

  clear(id: string): void {
    this.facade.clearAlarm(id);
  }
}
