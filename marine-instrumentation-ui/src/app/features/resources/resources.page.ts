import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesFacadeService } from './resources-facade.service';
import { WaypointListComponent } from './components/waypoint-list/waypoint-list.component';
import { WaypointFormComponent, WaypointFormValue } from './components/waypoint-form/waypoint-form.component';
import { GpxImportComponent } from './components/gpx-import/gpx-import.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { Waypoint } from '../../state/resources/waypoint-store.service';
import { Track } from '../../state/resources/track-store.service';

type ViewMode = 'list' | 'create-waypoint' | 'edit-waypoint' | 'import';
type Tab = 'waypoints' | 'routes' | 'tracks';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [
    CommonModule, 
    WaypointListComponent, 
    WaypointFormComponent, 
    GpxImportComponent,
    AppButtonComponent,
    AppIconComponent
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Resources</h1>
        <div class="header-actions">
           <app-button variant="secondary" (click)="viewMode = 'import'" *ngIf="viewMode === 'list'">
             <app-icon name="arrow-up" size="18"></app-icon> Import GPX
           </app-button>
        </div>
      </header>

      <div class="tabs" *ngIf="viewMode === 'list'">
         <button 
           class="tab-btn" 
           [class.active]="activeTab === 'waypoints'"
           (click)="activeTab = 'waypoints'"
         >Waypoints</button>
         <button 
           class="tab-btn" 
           [class.active]="activeTab === 'routes'"
           (click)="activeTab = 'routes'"
         >Routes</button>
         <button 
           class="tab-btn" 
           [class.active]="activeTab === 'tracks'"
           (click)="activeTab = 'tracks'"
         >Tracks</button>
      </div>

      <div class="content-area">
        <!-- WAYPOINTS TAB -->
        <ng-container *ngIf="activeTab === 'waypoints'">
            <div *ngIf="viewMode === 'list'" class="tab-content">
                <div class="tab-actions">
                    <app-button (click)="startCreateWaypoint()">
                        <app-icon name="plus" size="18"></app-icon> New Waypoint
                    </app-button>
                </div>
                
                <ng-container *ngIf="facade.waypoints$ | async as waypoints">
                    <app-waypoint-list 
                        [waypoints]="waypoints"
                        (edit)="startEditWaypoint($event, waypoints)"
                        (delete)="facade.deleteWaypoint($event)"
                    ></app-waypoint-list>
                </ng-container>
            </div>

            <div *ngIf="viewMode === 'create-waypoint' || viewMode === 'edit-waypoint'" class="form-container">
                <h3>{{ viewMode === 'create-waypoint' ? 'Create Waypoint' : 'Edit Waypoint' }}</h3>
                <app-waypoint-form 
                    [initialValue]="editingWaypointFormValue"
                    [editMode]="viewMode === 'edit-waypoint'"
                    (save)="handleSaveWaypoint($event)"
                    (cancel)="viewMode = 'list'"
                ></app-waypoint-form>
            </div>
        </ng-container>

        <!-- ROUTES TAB -->
        <ng-container *ngIf="activeTab === 'routes'">
             <div *ngIf="viewMode === 'list'" class="tab-content">
                 <div class="empty-state">
                    <p>Route management coming soon...</p>
                    <app-button variant="secondary" (click)="activeTab = 'waypoints'">Go to Waypoints</app-button>
                 </div>
             </div>
        </ng-container>

        <!-- TRACKS TAB -->
        <ng-container *ngIf="activeTab === 'tracks'">
             <div *ngIf="viewMode === 'list'" class="tab-content">
                 <ng-container *ngIf="facade.isRecordingTrack$ | async as recording">
                     <div class="track-controls">
                        <div class="track-status">
                            <span class="status-dot" [class.active]="recording"></span>
                            <span>{{ recording ? 'Recording track...' : 'Not recording' }}</span>
                        </div>
                        <div class="track-actions">
                            <app-button variant="primary" *ngIf="!recording" (click)="facade.startTrackRecording()">Start Recording</app-button>
                            <app-button variant="secondary" *ngIf="recording" (click)="facade.stopTrackRecording()">Stop</app-button>
                            <app-button variant="ghost" *ngIf="recording" (click)="facade.discardTrack()">Discard</app-button>
                        </div>
                     </div>
                 </ng-container>

                 <ng-container *ngIf="facade.currentTrack$ | async as currentTrack">
                    <div class="track-save" *ngIf="currentTrack.length > 1">
                        <div class="track-save-info">
                            <div class="track-points">{{ currentTrack.length }} points captured</div>
                        </div>
                        <div class="track-save-actions">
                            <input 
                              class="input-control"
                              [value]="trackName"
                              (input)="onTrackNameInput($event)"
                              placeholder="Track name"
                            />
                            <app-button variant="primary" (click)="saveTrack()" [disabled]="!trackName.trim()">Save Track</app-button>
                            <app-button variant="ghost" (click)="facade.discardTrack()">Discard</app-button>
                        </div>
                    </div>
                 </ng-container>

                 <ng-container *ngIf="facade.tracks$ | async as tracks">
                    <div *ngIf="tracks.length > 0; else noTracks" class="track-list">
                        <div *ngFor="let track of tracks; trackBy: trackByTrackId" class="track-row">
                            <div class="track-info">
                                <div class="track-name">{{ track.name || 'Unnamed track' }}</div>
                                <div class="track-meta">{{ trackPointCount(track) }} pts</div>
                            </div>
                            <app-button variant="ghost" (click)="facade.deleteTrack(track.id)" title="Delete">
                                <app-icon name="trash" size="16"></app-icon>
                            </app-button>
                        </div>
                    </div>
                    <ng-template #noTracks>
                        <div class="empty-state">No saved tracks yet.</div>
                    </ng-template>
                 </ng-container>
             </div>
        </ng-container>
        
        <!-- IMPORT -->
        <ng-container *ngIf="viewMode === 'import'">
            <div class="form-container">
                <h3>Import GPX</h3>
                <app-gpx-import 
                    (importData)="handleImport($event)" 
                    (cancelImport)="viewMode = 'list'"
                ></app-gpx-import>
            </div>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0; font-size: 1.75rem; }
    h3 { margin-bottom: 1.5rem; }

    .tabs {
        display: flex;
        gap: 1rem;
        border-bottom: 1px solid var(--border);
    }
    .tab-btn {
        background: none;
        border: none;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        cursor: pointer;
        color: var(--gb-text-muted);
        border-bottom: 2px solid transparent;
    }
    .tab-btn.active {
        color: var(--gb-needle-secondary);
        border-bottom-color: var(--gb-needle-secondary);
        font-weight: 500;
    }

    .content-area {
        flex: 1;
        overflow-y: auto;
    }
    
    .tab-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
    }
    
    .form-container {
        background: var(--gb-bg-bezel);
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border);
    }

    .empty-state {
        text-align: center;
        padding: 4rem;
        color: var(--gb-text-muted);
    }
    .track-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--gb-bg-bezel);
        margin-bottom: 1.5rem;
    }
    .track-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--gb-text-muted);
        font-size: 0.9rem;
    }
    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--border);
    }
    .status-dot.active {
        background: var(--danger);
        box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
    }
    .track-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    .track-save {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--gb-bg-bezel);
        margin-bottom: 1.5rem;
    }
    .track-save-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    .track-save-actions .input-control {
        flex: 1;
        min-width: 200px;
        padding: 0.65rem 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--gb-bg-panel);
        color: var(--gb-text-value);
    }
    .track-points {
        font-size: 0.9rem;
        color: var(--gb-text-muted);
    }
    .track-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .track-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        background: var(--gb-bg-panel);
        border: 1px solid var(--border);
    }
    .track-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .track-name {
        font-weight: 600;
        color: var(--gb-text-value);
    }
    .track-meta {
        font-size: 0.8rem;
        color: var(--gb-text-muted);
    }
  `]
})
export class ResourcesPage {
  activeTab: Tab = 'waypoints';
  viewMode: ViewMode = 'list';

  trackName = '';
  
  editingWaypointId: string | null = null;
  editingWaypointFormValue: Partial<WaypointFormValue> | null = null;

  constructor(public facade: ResourcesFacadeService) {}

  startCreateWaypoint() {
      this.editingWaypointId = null;
      this.editingWaypointFormValue = null;
      this.viewMode = 'create-waypoint';
  }

  startEditWaypoint(id: string, waypoints: Waypoint[]) {
      const wp = waypoints.find(w => w.id === id);
      const position = this.getWaypointPosition(wp);
      if (!position) {
          return;
      }
      if (wp) {
          this.editingWaypointId = id;
          this.editingWaypointFormValue = {
              name: wp.name || '',
              description: wp.description || '',
              lat: position.latitude,
              lon: position.longitude,
              icon: 'crosshair', // TODO: extract from properties
              color: '#000000'
          };
          this.viewMode = 'edit-waypoint';
      }
  }

  handleSaveWaypoint(value: WaypointFormValue) {
      if (this.viewMode === 'create-waypoint') {
          this.facade.createWaypoint(value);
      } else if (this.viewMode === 'edit-waypoint' && this.editingWaypointId) {
          this.facade.updateWaypoint(this.editingWaypointId, value);
      }
      this.viewMode = 'list';
  }

  handleImport(data: any) {
      this.facade.importGpx(data);
      this.viewMode = 'list';
  }

  saveTrack() {
      if (!this.trackName.trim()) return;
      this.facade.saveTrack(this.trackName.trim());
      this.trackName = '';
  }

  onTrackNameInput(event: Event) {
      const value = (event.target as HTMLInputElement | null)?.value ?? '';
      this.trackName = value;
  }

  trackByTrackId(_index: number, track: Track): string {
      return track.id;
  }

  trackPointCount(track: Track): number {
      const geometry = (track.feature as { geometry?: { type?: string; coordinates?: unknown } } | undefined)?.geometry;
      if (!geometry) return 0;
      if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
          return geometry.coordinates.length;
      }
      if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
          return geometry.coordinates.reduce((sum, line) => sum + (Array.isArray(line) ? line.length : 0), 0);
      }
      return 0;
  }

  private getWaypointPosition(wp?: Waypoint): { latitude: number; longitude: number } | null {
      if (!wp) {
          return null;
      }
      if (wp.position && Number.isFinite(wp.position.latitude) && Number.isFinite(wp.position.longitude)) {
          return wp.position;
      }
      const feature = wp.feature as { geometry?: { type?: string; coordinates?: unknown } } | undefined;
      const geometry = feature?.geometry;
      if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
          return null;
      }
      const coords = geometry.coordinates as number[];
      if (coords.length < 2) return null;
      const longitude = coords[0];
      const latitude = coords[1];
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
      }
      return { latitude, longitude };
  }
}
