import { Injectable, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { AlarmStoreService } from '../../../state/alarms/alarm-store.service';
import { AudioService } from '../../../core/services/audio.service';
import { AlarmSeverity, AlarmState } from '../../../state/alarms/alarm.models';
import { PATHS } from '@omi/marine-data-contract';
import { haversineDistanceMeters } from '../../../state/calculations/navigation';
import { Subscription, combineLatest, debounceTime, distinctUntilChanged, filter, interval, map, startWith } from 'rxjs';
import { AisStoreService } from '../../../state/ais/ais-store.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AlarmSettingsService } from '../../../state/alarms/alarm-settings.service';
import { PlaybackStoreService } from '../../../state/playback/playback-store.service';

const METERS_PER_NM = 1852;
const ANCHOR_STORAGE_KEY = 'omi-anchor-watch';

@Injectable({
  providedIn: 'root'
})
export class AlarmsFacadeService implements OnDestroy {
  private readonly alarmStore = inject(AlarmStoreService);
  private readonly datapointStore = inject(DatapointStoreService);
  private readonly audioService = inject(AudioService);
  private readonly aisStore = inject(AisStoreService);
  private readonly alarmSettings = inject(AlarmSettingsService);
  private readonly playbackStore = inject(PlaybackStoreService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly alarms$ = this.alarmStore.alarms$;
  readonly activeAlarms$ = this.alarmStore.activeAlarms$;
  readonly highestSeverity$ = this.alarmStore.highestSeverity$;

  private readonly playbackActive$ = this.playbackStore.state$.pipe(
    map((state) => state.status === 'ready' || state.status === 'playing' || state.status === 'paused'),
    distinctUntilChanged(),
    startWith(false),
  );

  private sub = new Subscription();
  private shallowActive = false;
  private batteryActive = false;
  private gpsLostActive = false;

  constructor() {
    this.restoreAnchorWatchConfig();
    this.initAudioSync();
    this.initPlaybackSuppression();
    this.initAnchorWatch();
    this.persistAnchorWatchConfig();
    this.initShallowWater();
    this.initBatteryLow();
    this.initCpaWarning();
    this.initGpsLost();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  acknowledgeAlarm(id: string): void {
    this.alarmStore.acknowledgeAlarm(id);
    // Audio sync will handle silence logic
  }

  silenceAlarm(id: string): void {
    this.alarmStore.silenceAlarm(id);
  }

  clearAlarm(id: string): void {
    this.alarmStore.clearAlarm(id);
  }

  private initAudioSync(): void {
    // Play audio based on highest severity
    this.sub.add(
      combineLatest([this.highestSeverity$, this.playbackActive$])
        .pipe(
          // Debounce to avoid rapid switching
          debounceTime(200),
          // Only play if we have active unacknowledged/unsilenced alarms with severity
          // But wait, the Store activeAlarms$ includes Ack/Silence.
          // We need to check if ANY active alarm is NOT silenced/ack?
          // Actually, highestSeverity$ logic in Store counts Ack/Silenced.
          // Usually Ack stops audio. Silence stops audio.
          // AudioService logic needs refinement or we handle it here.
          // Let's refine AlarmStore logic or here:
          
          // Re-derive audio trigger:
          // We want audio ONLY if there is at least one alarm in State.Active (not Ack, not Silenced)
          // (Unless Emergency, maybe that persists?)
        )
        .subscribe(([, playbackActive]) => {
           if (playbackActive) {
             this.audioService.stop();
             return;
           }
           // We need to check if we should play.
           const currentState = this.alarmStore['_alarms']?.value || new Map();
           const alarms = Array.from(currentState.values());
           
           const audibleAlarm = alarms.find(a => a.state === AlarmState.Active);
           
           if (audibleAlarm) {
             // Play the sound for the highest severity among audible alarms
             // (Simple version: just take this one's severity or find max)
             // Let's find max severity of ACTIVE alarms
             const activeAlarms = alarms.filter(a => a.state === AlarmState.Active);
             let maxSev: AlarmSeverity | null = null;
             const severityRank: Record<AlarmSeverity, number> = {
               [AlarmSeverity.Info]: 0,
               [AlarmSeverity.Warning]: 1,
               [AlarmSeverity.Critical]: 2,
               [AlarmSeverity.Emergency]: 3,
             };

             for (const a of activeAlarms) {
               if (!maxSev || severityRank[a.severity] > severityRank[maxSev]) {
                 maxSev = a.severity;
               }
             }
             
             if (maxSev) {
               this.audioService.playAlarm(maxSev);
             } else {
               this.audioService.stop();
             }
           } else {
             this.audioService.stop();
           }
        })
    );
  }

  private initPlaybackSuppression(): void {
    this.sub.add(
      combineLatest([this.playbackActive$, this.alarmStore.activeAlarms$]).subscribe(([active, alarms]) => {
        if (!active) return;
        for (const alarm of alarms) {
          if (alarm.state === AlarmState.Active || alarm.state === AlarmState.Acknowledged) {
            this.alarmStore.silenceAlarm(alarm.id);
          }
        }
        this.audioService.stop();
      })
    );
  }

  private restoreAnchorWatchConfig(): void {
    if (!this.isBrowser) {
      return;
    }

    const raw = localStorage.getItem(ANCHOR_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        active?: boolean;
        anchorPosition?: { lat: number; lon: number };
        radius?: number;
        setAt?: number;
      };

      if (!parsed.active || !parsed.anchorPosition || !Number.isFinite(parsed.radius ?? NaN)) {
        return;
      }

      this.alarmStore.triggerAlarm(
        'anchor-watch',
        'anchor-watch',
        AlarmSeverity.Warning,
        'Anchor Watch Active',
        {
          anchorPosition: parsed.anchorPosition,
          radius: parsed.radius,
          currentDistance: 0,
          setAt: parsed.setAt ?? Date.now(),
        }
      );
    } catch {
      // ignore storage errors
    }
  }

  private persistAnchorWatchConfig(): void {
    if (!this.isBrowser) {
      return;
    }

    this.sub.add(
      this.alarmStore.alarms$.subscribe((alarms) => {
        const anchorAlarm = alarms.find((alarm) => alarm.type === 'anchor-watch');
        if (!anchorAlarm || anchorAlarm.state === AlarmState.Cleared || anchorAlarm.state === AlarmState.Inactive) {
          localStorage.removeItem(ANCHOR_STORAGE_KEY);
          return;
        }

        const anchorPosition = anchorAlarm.data?.['anchorPosition'] as { lat: number; lon: number } | undefined;
        const radius = anchorAlarm.data?.['radius'] as number | undefined;
        if (!anchorPosition || !Number.isFinite(radius)) {
          return;
        }

        localStorage.setItem(
          ANCHOR_STORAGE_KEY,
          JSON.stringify({
            active: true,
            anchorPosition,
            radius,
            setAt: anchorAlarm.data?.['setAt'] ?? anchorAlarm.timestamp,
          })
        );
      })
    );
  }

  private initAnchorWatch(): void {
    this.sub.add(
      combineLatest([
        this.alarmStore.alarms$.pipe(
          map(alarms => alarms.find(a => a.type === 'anchor-watch')),
          // Only proceed if anchor watch is configured (exists and not cleared/inactive)
          filter(a => !!a && a.state !== AlarmState.Cleared && a.state !== AlarmState.Inactive && !!a.data?.['anchorPosition'])
        ),
        this.datapointStore.observe<{latitude:number, longitude:number}>(PATHS.navigation.position),
        this.playbackActive$,
      ]).pipe(
        debounceTime(1000) // Check every second
      ).subscribe(([anchorAlarm, positionDp, playbackActive]) => {
         if (playbackActive) return;
         if (!anchorAlarm || !positionDp?.value) return;

         const currentPos = { lat: positionDp.value.latitude, lon: positionDp.value.longitude };
         const anchorData = anchorAlarm.data;
         if (!anchorData) return;
         const anchorPos = anchorData['anchorPosition'] as { lat: number; lon: number };
         const radius = (anchorData['radius'] as number) || 40;
         
         const distance = haversineDistanceMeters(anchorPos, currentPos);
         
         const isDrifting = distance > radius;
         
         // If state needs update
         if (isDrifting && anchorAlarm.severity !== AlarmSeverity.Critical) {
            // ESCALATE to Critical
            this.alarmStore.triggerAlarm(
               anchorAlarm.id,
               anchorAlarm.type,
               AlarmSeverity.Critical,
               'ANCHOR DRAG DETECTED',
               { ...anchorAlarm.data, currentDistance: distance }
            );
         } else if (!isDrifting && anchorAlarm.severity === AlarmSeverity.Critical) {
            // DE-ESCALATE to Warning (Monitoring)
            // Note: Usually once triggered we might want manual clear?
            // But if vessel swings back, maybe auto-clear is annoying.
            // Let's keep it Critical until acknowledged? 
            // If we use triggerAlarm, it will reset to Active if severity increases.
            // If severity decreases, we explicitly allow it here to "auto-resolve" valid range.
            
            // However, spec implies critical safety.
            // Let's auto-recover severity if back in safe zone, but keep it as Warning/Active?
             this.alarmStore.triggerAlarm(
               anchorAlarm.id,
               anchorAlarm.type,
               AlarmSeverity.Warning,
               'Anchor Watch Active', // Back to normal message
               { ...anchorAlarm.data, currentDistance: distance }
            );
         } else {
             // Just update metadata (distance) without changing triggering/severity
             // triggerAlarm handles data-only updates gracefully
             this.alarmStore.triggerAlarm(
               anchorAlarm.id,
               anchorAlarm.type,
               anchorAlarm.severity,
               anchorAlarm.message,
               { ...anchorAlarm.data, currentDistance: distance }
            );
         }
      })
    );
  }

  private initShallowWater(): void {
    this.sub.add(
      combineLatest([
        this.datapointStore
          .observe<number>(PATHS.environment.depth.belowTransducer)
          .pipe(
            filter((point): point is NonNullable<typeof point> => point !== undefined && typeof point.value === 'number')
          ),
        this.alarmSettings.settings$,
        this.playbackActive$,
      ]).subscribe(([point, settings, playbackActive]) => {
        if (playbackActive) return;
        const value = point.value;
        const threshold = settings.shallowDepthThreshold;
        const hysteresis = settings.shallowDepthHysteresis;
        const isLow = value <= threshold;
        const isClear = value >= threshold + hysteresis;

        if (isLow) {
          this.shallowActive = true;
          this.alarmStore.triggerAlarm(
            'shallow-water',
            'shallow-water',
            AlarmSeverity.Warning,
            `SHALLOW WATER ${value.toFixed(1)} m`,
            { threshold, value }
          );
          return;
        }

        if (this.shallowActive && isClear) {
          this.shallowActive = false;
          this.alarmStore.clearAlarm('shallow-water');
          return;
        }

        if (this.shallowActive) {
          this.alarmStore.triggerAlarm(
            'shallow-water',
            'shallow-water',
            AlarmSeverity.Warning,
            `SHALLOW WATER ${value.toFixed(1)} m`,
            { threshold, value }
          );
        }
      })
    );
  }

  private initBatteryLow(): void {
    this.sub.add(
      combineLatest([
        this.datapointStore
          .observe<number>(PATHS.electrical.batteries.house.voltage)
          .pipe(
            filter((point): point is NonNullable<typeof point> => point !== undefined && typeof point.value === 'number')
          ),
        this.alarmSettings.settings$,
        this.playbackActive$,
      ]).subscribe(([point, settings, playbackActive]) => {
        if (playbackActive) return;
        const value = point.value;
        const threshold = settings.lowBatteryThreshold;
        const hysteresis = settings.lowBatteryHysteresis;
        const isLow = value <= threshold;
        const isClear = value >= threshold + hysteresis;

        if (isLow) {
          this.batteryActive = true;
          this.alarmStore.triggerAlarm(
            'battery-low',
            'battery-low',
            AlarmSeverity.Critical,
            `LOW BATTERY ${value.toFixed(1)} V`,
            { threshold, value }
          );
          return;
        }

        if (this.batteryActive && isClear) {
          this.batteryActive = false;
          this.alarmStore.clearAlarm('battery-low');
          return;
        }

        if (this.batteryActive) {
          this.alarmStore.triggerAlarm(
            'battery-low',
            'battery-low',
            AlarmSeverity.Critical,
            `LOW BATTERY ${value.toFixed(1)} V`,
            { threshold, value }
          );
        }
      })
    );
  }

  private initCpaWarning(): void {
    this.sub.add(
      combineLatest([
        toObservable(this.aisStore.targets),
        this.alarmSettings.settings$,
        this.playbackActive$,
      ]).subscribe(([targetsMap, settings, playbackActive]) => {
        if (playbackActive) return;
        const targets = Array.from(targetsMap.values());
        if (targets.length === 0) {
          this.alarmStore.clearAlarm('cpa-warning');
          return;
        }

        const thresholdMeters = settings.cpaThresholdNm * METERS_PER_NM;
        const tcpaSeconds = settings.cpaTcpaMinutes * 60;

        let minCpa = Infinity;
        for (const target of targets) {
          if (typeof target.cpa !== 'number' || !Number.isFinite(target.cpa)) {
            continue;
          }
          if (typeof target.tcpa !== 'number' || !Number.isFinite(target.tcpa)) {
            continue;
          }
          if (target.tcpa <= 0 || target.tcpa > tcpaSeconds) {
            continue;
          }
          if (target.cpa >= thresholdMeters) {
            continue;
          }
          minCpa = Math.min(minCpa, target.cpa);
        }

        if (!Number.isFinite(minCpa)) {
          this.alarmStore.clearAlarm('cpa-warning');
          return;
        }

        const cpaNm = minCpa / METERS_PER_NM;
        this.alarmStore.triggerAlarm(
          'cpa-warning',
          'cpa-warning',
          AlarmSeverity.Warning,
          `COLLISION WARNING (CPA ${cpaNm.toFixed(2)} NM)`,
          { cpaMeters: minCpa, cpaNm, thresholdMeters, tcpaSeconds }
        );
      })
    );
  }

  private initGpsLost(): void {
    const positionTimestamp$ = this.datapointStore
      .observe<{ latitude: number; longitude: number }>(PATHS.navigation.position)
      .pipe(
        map((point) => point?.timestamp ?? null),
        distinctUntilChanged()
      );

    this.sub.add(
      combineLatest([
        positionTimestamp$,
        this.alarmSettings.settings$,
        interval(1000).pipe(startWith(0)),
        this.playbackActive$,
      ]).subscribe(([timestamp, settings, _tick, playbackActive]) => {
        if (playbackActive) return;
        const thresholdMs = settings.gpsLostSeconds * 1000;
        const hysteresisMs = settings.gpsLostHysteresisSeconds * 1000;
        const now = Date.now();
        const ageMs = timestamp ? now - timestamp : Number.POSITIVE_INFINITY;
        const ageSeconds = Math.max(0, Math.round(ageMs / 1000));

        const isLost = ageMs >= thresholdMs;
        const canClear = ageMs <= Math.max(0, thresholdMs - hysteresisMs);

        if (isLost) {
          this.gpsLostActive = true;
          this.alarmStore.triggerAlarm(
            'gps-lost',
            'gps-lost',
            AlarmSeverity.Warning,
            `GPS LOST (${ageSeconds}s)`,
            { ageSeconds, thresholdSeconds: settings.gpsLostSeconds }
          );
          return;
        }

        if (this.gpsLostActive && canClear) {
          this.gpsLostActive = false;
          this.alarmStore.clearAlarm('gps-lost');
        } else if (this.gpsLostActive) {
          this.alarmStore.triggerAlarm(
            'gps-lost',
            'gps-lost',
            AlarmSeverity.Warning,
            `GPS LOST (${ageSeconds}s)`,
            { ageSeconds, thresholdSeconds: settings.gpsLostSeconds }
          );
        }
      })
    );
  }
}
