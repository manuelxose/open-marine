import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmStoreService } from '../../../../state/alarms/alarm-store.service';
import { AlarmSeverity, AlarmType } from '../../../../state/alarms/alarm.models';
import { AudioService } from '../../../../core/services/audio.service';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { interval, map, Subscription, take } from 'rxjs';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-mob-alert',
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  templateUrl: './mob-alert.component.html',
  styleUrls: ['./mob-alert.component.scss']
})
export class MOBAlertComponent implements OnInit, OnDestroy {
  active = false;
  confirming = false;
  elapsedTime = '00:00';
  
  private timerSub?: Subscription;
  private mobTimestamp: number | null = null;
  private currentPosition: { lat: number, lon: number } | null = null;

  constructor(
    private alarmStore: AlarmStoreService,
    private audioService: AudioService,
    private datapointStore: DatapointStoreService
  ) {}

  ngOnInit(): void {
    // Monitor alarm store for MOB active state
    this.alarmStore.activeAlarms$.pipe(
      map(alarms => alarms.find(a => a.type === 'mob'))
    ).subscribe(mobAlarm => {
      // If found active MOB alarm
      if (mobAlarm) {
        this.active = true;
        this.confirming = false; 
        this.mobTimestamp = mobAlarm.timestamp;
        this.startTimer();
      } else {
        // If not found but we were active -> it was cleared
        if (this.active) {
            this.active = false;
            this.stopTimer();
        }
      }
    });

    // Track current position for marking MOB
    this.datapointStore.observe<{latitude: number; longitude: number}>(PATHS.navigation.position)
      .subscribe(pt => {
        if (pt?.value) {
          this.currentPosition = { lat: pt.value.latitude, lon: pt.value.longitude };
        }
      });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startConfirmation(): void {
    this.confirming = true;
  }

  cancelConfirmation(): void {
    this.confirming = false;
  }

  confirmMOB(): void {
    this.confirming = false;
    this.active = true;
    
    // Trigger Alarm
    this.alarmStore.triggerAlarm(
      'mob-manual',
      'mob',
      AlarmSeverity.Emergency,
      'MAN OVERBOARD',
      { position: this.currentPosition }
    );

    // Audio is handled by Facade or Effect usually, but for Emergency we force it here
    this.audioService.playAlarm(AlarmSeverity.Emergency);
  }

  clearMOB(): void {
    this.alarmStore.clearAlarm('mob-manual');
    this.audioService.stop();
    this.active = false;
    this.stopTimer();
  }

  private startTimer(): void {
    if (this.timerSub) return;
    
    this.timerSub = interval(1000).subscribe(() => {
        if (!this.mobTimestamp) return;
        const diff = Date.now() - this.mobTimestamp;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        this.elapsedTime = `${this.pad(mins)}:${this.pad(secs)}`;
    });
  }

  private stopTimer(): void {
    if (this.timerSub) {
        this.timerSub.unsubscribe();
        this.timerSub = undefined;
    }
  }

  private pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }
}
