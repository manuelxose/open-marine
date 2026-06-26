import { Component, ChangeDetectionStrategy, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AisTargetListComponent } from '../ais/components/ais-target-list/ais-target-list.component';
import { AisTargetDetailsComponent } from '../ais/components/ais-target-details/ais-target-details.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { haversineDistanceMeters, type GeoPoint } from '../../state/calculations/navigation';
import { PATHS } from '@omi/marine-data-contract';
import type { AisTarget } from '../../core/models/ais.model';

@Component({
  selector: 'app-vessels-page',
  standalone: true,
  imports: [
    CommonModule,
    AisTargetListComponent,
    AisTargetDetailsComponent,
    AppIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vessels-page">
      <!-- Header -->
      <div class="vessels-header">
        <div class="vessels-header__left">
          <h1 class="vessels-header__title">Vessels &amp; Traffic</h1>
          <span class="vessels-header__count" aria-live="polite">{{ targetCount() }} targets in range</span>
        </div>
        <div class="vessels-header__right">
          <!-- Status indicators -->
          <div class="vessels-header__status">
            @if (dangerousCount() > 0) {
              <span class="status-badge status-badge--danger">
                <span class="status-dot status-dot--danger"></span>
                {{ dangerousCount() }} dangerous
              </span>
            }
            <span class="status-badge">
              <span class="status-dot status-dot--ok"></span>
              AIS Active
            </span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="vessels-content" [class.vessels-content--detail-open]="selectedTarget() !== null">
        <!-- Target list -->
        <div class="vessels-list-panel" role="region" aria-label="Vessel list">
          <app-ais-target-list
            [targets]="sortedTargets()"
            [selectedMmsi]="selectedMmsi()"
            [sortBy]="sortBy()"
            (selectTarget)="selectTarget($event)"
            (sortChange)="handleSortChange($event)"
            (followTarget)="handleFollowTarget($event)"
          ></app-ais-target-list>
        </div>

        <!-- Detail panel -->
        @if (selectedTarget(); as target) {
          <div class="vessels-detail-panel" role="complementary" aria-label="Vessel details">
            <div class="vessels-detail-panel__header">
              <h2 class="vessels-detail-panel__title">{{ target.name || target.mmsi }}</h2>
              <button class="vessels-detail-panel__close" (click)="clearSelection()" aria-label="Close details">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <app-ais-target-details [target]="target"></app-ais-target-details>
          </div>
        }

        <!-- Empty state -->
        @if (targetCount() === 0) {
          <div class="vessels-empty">
            <app-icon name="target" [size]="64" class="text-tertiary"></app-icon>
            <h3>No AIS Targets</h3>
            <p>No vessels detected in range. Ensure AIS receiver is connected and operational.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .vessels-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background:
        radial-gradient(ellipse 100% 60% at 50% 0%, rgba(74, 144, 217, 0.04), transparent 70%),
        var(--gb-bg-canvas);
    }

    /* ── Header ───────────────────────────────────── */
    .vessels-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3, 12px) var(--space-5, 24px);
      border-bottom: 1px solid var(--glass-border, var(--gb-border-panel));
      background: var(--glass-bg, var(--gb-bg-bezel));
      backdrop-filter: blur(var(--glass-blur, 16px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
      flex-shrink: 0;
      position: relative;
    }

    .vessels-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--glass-shine, rgba(255,255,255,0.1)), transparent);
      opacity: 0.5;
    }

    .vessels-header__left {
      display: flex;
      align-items: baseline;
      gap: var(--space-3, 12px);
    }

    .vessels-header__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary, var(--gb-text-value));
      margin: 0;
      position: relative;
    }

    .vessels-header__title::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--primary, #4a90d9);
      border-radius: var(--radius-full, 999px);
    }

    .vessels-header__count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--text-muted, var(--gb-text-muted));
      letter-spacing: 0.03em;
    }

    .vessels-header__right {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
    }

    .vessels-header__status {
      display: flex;
      gap: var(--space-2, 8px);
      align-items: center;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted, var(--gb-text-muted));
      background: var(--glass-bg, var(--gb-bg-glass));
      border: 1px solid var(--glass-border, var(--gb-border-panel));
    }

    .status-badge--danger {
      color: var(--danger, #f06352);
      background: rgba(240, 99, 82, 0.1);
      border-color: rgba(240, 99, 82, 0.25);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted, var(--gb-text-muted));
    }

    .status-dot--ok {
      background: var(--gb-data-good, #a3be8c);
      box-shadow: 0 0 6px rgba(163, 190, 140, 0.5);
    }

    .status-dot--danger {
      background: var(--danger, #f06352);
      box-shadow: 0 0 6px rgba(240, 99, 82, 0.5);
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* ── Content layout ───────────────────────────── */
    .vessels-content {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    .vessels-list-panel {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .vessels-detail-panel {
      width: 380px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--glass-border, var(--gb-border-panel));
      background: var(--glass-bg, var(--gb-bg-panel));
      backdrop-filter: blur(var(--glass-blur, 16px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 16px));
      overflow-y: auto;
      animation: slide-in 0.2s ease;
    }

    @keyframes slide-in {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .vessels-detail-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border-bottom: 1px solid var(--glass-border, var(--gb-border-panel));
      position: sticky;
      top: 0;
      background: var(--glass-bg, var(--gb-bg-bezel));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      z-index: 2;
    }

    .vessels-detail-panel__title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-primary, var(--gb-text-value));
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .vessels-detail-panel__close {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid var(--glass-border, var(--gb-border-panel));
      background: transparent;
      color: var(--text-muted, var(--gb-text-muted));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: all 150ms ease;
    }

    .vessels-detail-panel__close:hover {
      background: rgba(240, 99, 82, 0.1);
      border-color: rgba(240, 99, 82, 0.3);
      color: var(--danger, #f06352);
    }

    /* ── Empty state ──────────────────────────────── */
    .vessels-empty {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3, 12px);
      color: var(--text-muted, var(--gb-text-muted));
      padding: var(--space-5, 24px);
      text-align: center;
    }

    .vessels-empty h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary, var(--gb-text-value));
      margin: 0;
    }

    .vessels-empty p {
      font-size: 0.82rem;
      max-width: 320px;
      line-height: 1.5;
      margin: 0;
    }

    @media (max-width: 768px) {
      .vessels-content {
        flex-direction: column;
      }

      .vessels-detail-panel {
        width: 100%;
        max-height: 50%;
        border-left: none;
        border-top: 1px solid var(--glass-border, var(--gb-border-panel));
      }

      .vessels-header__left {
        flex-direction: column;
        gap: 2px;
      }

      .vessels-header__title::before { display: none; }

      .vessels-header {
        padding: var(--space-2, 8px) var(--space-3, 12px);
      }
    }
  `],
})
export class VesselsPage {
  private readonly aisStore = inject(AisStoreService);
  private readonly store = inject(DatapointStoreService);
  private readonly router = inject(Router);

  readonly selectedMmsi = signal<string | null>(null);
  readonly sortBy = signal<'distance' | 'cpa' | 'name'>('distance');

  readonly targetsMap = this.aisStore.targets;
  readonly targetCount = this.aisStore.targetCount;
  readonly dangerousCount = computed(() => this.aisStore.dangerousTargets().length);

  readonly position = toSignal(
    this.store.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
    { initialValue: null },
  );

  readonly sortedTargets = computed(() => {
    const list = Array.from(this.targetsMap().values());
    const sort = this.sortBy();
    const pos = this.position();

    switch (sort) {
      case 'distance': {
        const v = pos?.value;
        if (v?.latitude != null && v?.longitude != null) {
          const ownShip: GeoPoint = { lat: v.latitude, lon: v.longitude };
          list.sort((a, b) => {
            if (a.isDangerous !== b.isDangerous) return a.isDangerous ? -1 : 1;
            const distA = haversineDistanceMeters(ownShip, { lat: a.latitude, lon: a.longitude });
            const distB = haversineDistanceMeters(ownShip, { lat: b.latitude, lon: b.longitude });
            return distA - distB;
          });
        }
        break;
      }
      case 'cpa':
        list.sort((a, b) => {
          if (a.isDangerous !== b.isDangerous) return a.isDangerous ? -1 : 1;
          return (a.cpa ?? Infinity) - (b.cpa ?? Infinity);
        });
        break;
      case 'name':
        list.sort((a, b) => (a.name ?? a.mmsi).localeCompare(b.name ?? b.mmsi));
        break;
    }

    return list;
  });

  readonly selectedTarget = computed<AisTarget | null>(() => {
    const mmsi = this.selectedMmsi();
    if (!mmsi) return null;
    return this.targetsMap().get(mmsi) ?? null;
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedMmsi()) {
      this.clearSelection();
    }
  }

  selectTarget(mmsi: string): void {
    this.selectedMmsi.set(mmsi === this.selectedMmsi() ? null : mmsi);
  }

  clearSelection(): void {
    this.selectedMmsi.set(null);
  }

  handleSortChange(sort: string): void {
    this.sortBy.set(sort as 'distance' | 'cpa' | 'name');
  }

  handleFollowTarget(mmsi: string): void {
    this.router.navigate(['/chart'], { queryParams: { follow: mmsi } });
  }
}
