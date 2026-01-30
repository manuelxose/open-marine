import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlarmStoreService } from '../../../../state/alarms/alarm-store.service';
import { DatapointStoreService } from '../../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { AlarmSeverity, AlarmState } from '../../../../state/alarms/alarm.models';
import { haversineDistanceMeters } from '../../../../state/calculations/navigation';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppSliderComponent } from '../../../../shared/components/app-slider/app-slider.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-anchor-watch',
  standalone: true,
  imports: [CommonModule, FormsModule, AppButtonComponent, AppSliderComponent],
  templateUrl: './anchor-watch.component.html',
  styleUrls: ['./anchor-watch.component.scss']
})
export class AnchorWatchComponent implements OnInit, OnDestroy {
  readonly radiusMin = 10;
  readonly radiusMax = 500;
  readonly radiusStep = 5;
  radius = 40; // Default radius in meters
  currentDistance = 0;
  isSet = false;
  anchorSetAt: number | null = null;
  
  anchorPosition: { lat: number, lon: number } | null = null;
  private currentPosition: { lat: number, lon: number } | null = null;
  private sub = new Subscription();

  constructor(
    private alarmStore: AlarmStoreService,
    private datapointStore: DatapointStoreService
  ) {}

  ngOnInit(): void {
    // Check if anchor watch is already active from store
    this.sub.add(
      this.alarmStore.alarms$.subscribe(alarms => {
        const anchorAlarm = alarms.find(a => a.type === 'anchor-watch');
        if (anchorAlarm && anchorAlarm.data && (anchorAlarm.state !== AlarmState.Cleared && anchorAlarm.state !== AlarmState.Inactive)) {
          this.isSet = true;
          this.anchorPosition = anchorAlarm.data.anchorPosition;
          this.radius = anchorAlarm.data.radius || 40;
          this.anchorSetAt = anchorAlarm.data.setAt ?? anchorAlarm.timestamp;
          this.updateDistance();
        } else {
            // Only reset if we think it should be cleared externally
            // But usually this component CONTROLS the state.
            // Let's assume input persistence logic later.
        }
      })
    );

    // Track position to calculate distance
    this.sub.add(
      this.datapointStore.observe<{latitude: number; longitude: number}>(PATHS.navigation.position)
        .subscribe(pt => {
          if (pt?.value) {
            this.currentPosition = { lat: pt.value.latitude, lon: pt.value.longitude };
            this.updateDistance();
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  dropAnchor(): void {
    this.setAnchorHere();
  }

  setAnchorHere(): void {
    if (!this.currentPosition) return;

    this.anchorPosition = { ...this.currentPosition };
    this.isSet = true;
    this.anchorSetAt = Date.now();
    this.updateDistance(); // Initial distance ~0

    this.updateAlarmState();
  }

  raiseAnchor(): void {
    this.isSet = false;
    this.anchorPosition = null;
    this.anchorSetAt = null;
    this.currentDistance = 0;
    
    // Clear alarm
    this.alarmStore.clearAlarm('anchor-watch');
  }

  onRadiusChange(value: number): void {
    this.radius = this.clampRadius(value);
    if (this.isSet) {
      this.updateAlarmState();
    }
  }

  private updateDistance(): void {
    if (this.anchorPosition && this.currentPosition) {
       this.currentDistance = haversineDistanceMeters(this.anchorPosition, this.currentPosition);
       // Logic to TRIGGER alarm if distance > radius is handled in M4.7 (next task), 
       // but we can update the Distance metadata here or let the logic loop handle it.
       // For now, this component is configuration. The actual check should probably be a background process 
       // or part of the store logic. 
       // To satisfy M4.7, we'll likely add a check loop here or in a service.
       // For M4.6 (UI), we just display it.
    }
  }
  private updateAlarmState(): void {
     if (!this.anchorPosition) {
       return;
     }
     // We store the CONFIGURATION in the alarm data even if not yet triggered (warning vs active)
     // Actually, Anchor Watch is 'Active' monitoring state. 
     // If distance < radius, it's 'Active' (monitoring) but Severity might be 'Info'?
     // The spec says 'Triggered' -> 'Critical'.
     // So we can have an 'anchor-config' separate from 'anchor-alarm'?
     // Simpler: We create an alarm 'anchor-watch' with state 'Active' (monitoring) if supported, or just keep config local.
     // To allow the next task M4.7 to work easily, let's store configuration in the AlarmStore 
     // with a special state or just use a service.
     
     // PROPOSAL: Use AlarmStore to store the 'Active Watch' state.
     // Severity = Info (Monitoring) or Critical (Drifting).
     
     // For now, let's just trigger it with severity=Warning if we drifted?
     // No, we need to persist "I am watching".
     // Let's invoke the store to say "Watch is set".
     
     this.alarmStore.triggerAlarm(
        'anchor-watch',
        'anchor-watch',
        this.currentDistance > this.radius ? AlarmSeverity.Critical : AlarmSeverity.Warning, // Warning used as 'Monitoring' status? Or maybe strictly Critical when triggered.
        this.currentDistance > this.radius ? 'ANCHOR DRAG DETECTED' : 'Anchor Watch Active',
        {
            anchorPosition: this.anchorPosition,
            radius: this.radius,
            currentDistance: this.currentDistance,
            setAt: this.anchorSetAt ?? Date.now()
        }
     );
     
     // Note: M4.7 will implement the actual logic to check this periodically and update severity. 
     // This component sets up the initial state.
  }

  private clampRadius(value: number): number {
    if (!Number.isFinite(value)) {
      return this.radius;
    }
    return Math.min(this.radiusMax, Math.max(this.radiusMin, value));
  }
}

