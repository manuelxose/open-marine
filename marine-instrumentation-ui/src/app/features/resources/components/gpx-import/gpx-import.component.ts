import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { GpxParser, GpxParseResult } from '../../utils/gpx-parser';

@Component({
  selector: 'app-gpx-import',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <div class="gpx-import">
      <div 
        class="dropzone" 
        [class.dragging]="dragging"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <app-icon name="arrow-up" size="48" class="upload-icon"></app-icon>
        <p>Drag & Drop GPX file here</p>
        <p class="or">OR</p>
        <input 
          type="file" 
          #fileInput 
          accept=".gpx,application/gpx+xml" 
          (change)="onFileSelected($event)" 
          style="display: none" 
        />
        <app-button variant="secondary" (click)="fileInput.click()">Browse File</app-button>
      </div>

      <div *ngIf="error" class="error-msg">
        <app-icon name="alert-triangle" size="16"></app-icon>
        <span>{{ error }}</span>
      </div>

      <div *ngIf="readingProgress !== null || isParsing" class="progress-section">
        <div class="progress-row">
          <span>Parsing GPX...</span>
          <span>{{ readingProgress ?? 100 }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="readingProgress ?? 100"></div>
        </div>
      </div>

      <div *ngIf="parseResult" class="preview-section">
        <h4>Content Preview</h4>
        <div class="preview-list">
            <label class="preview-item" [class.disabled]="parseResult.waypoints.length === 0">
                <input 
                  type="checkbox"
                  [checked]="selected.waypoints"
                  [disabled]="parseResult.waypoints.length === 0"
                  (change)="toggleSelection('waypoints', $event)"
                />
                <span class="preview-label">Waypoints</span>
                <span class="preview-count">{{ parseResult.waypoints.length }}</span>
            </label>
            <label class="preview-item" [class.disabled]="parseResult.routes.length === 0">
                <input 
                  type="checkbox"
                  [checked]="selected.routes"
                  [disabled]="parseResult.routes.length === 0"
                  (change)="toggleSelection('routes', $event)"
                />
                <span class="preview-label">Routes</span>
                <span class="preview-count">{{ parseResult.routes.length }}</span>
            </label>
            <label class="preview-item" [class.disabled]="parseResult.tracks.length === 0">
                <input 
                  type="checkbox"
                  [checked]="selected.tracks"
                  [disabled]="parseResult.tracks.length === 0"
                  (change)="toggleSelection('tracks', $event)"
                />
                <span class="preview-label">Tracks</span>
                <span class="preview-count">{{ parseResult.tracks.length }}</span>
            </label>
        </div>

        <div class="actions">
            <app-button variant="ghost" (click)="cancel()">Cancel</app-button>
            <app-button 
                variant="primary" 
                (click)="confirm()" 
                [disabled]="selectedCount === 0 || isImporting || isParsing"
            >
                Import {{ selectedCount }} Items
            </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gpx-import {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .dropzone {
      border: 2px dashed var(--border);
      border-radius: 8px;
      padding: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background: var(--surface-2);
      transition: all 0.2s;
    }
    .dropzone.dragging {
      border-color: var(--primary);
      background: var(--surface-3);
    }
    .upload-icon { color: var(--text-tertiary); }
    .or { font-size: 0.75rem; color: var(--text-tertiary); margin: 0; }
    
    .error-msg {
        color: var(--error);
        background: var(--surface-error);
        padding: 0.75rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .preview-section {
        border-top: 1px solid var(--border);
        padding-top: 1rem;
        animation: fadeIn 0.3s ease;
    }
    h4 { margin: 0 0 1rem 0; font-size: 1rem; }
    
    .preview-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }
    .preview-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        font-size: 0.9rem;
    }
    .preview-item input {
        accent-color: var(--primary);
    }
    .preview-label {
        flex: 1;
        font-weight: 600;
        color: var(--text-primary);
    }
    .preview-count {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }
    .preview-item.disabled {
        opacity: 0.5;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
    }
    .progress-section {
        border-top: 1px solid var(--border);
        padding-top: 1rem;
    }
    .progress-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
    }
    .progress-bar {
        height: 6px;
        background: var(--surface-3);
        border-radius: 999px;
        overflow: hidden;
    }
    .progress-fill {
        height: 100%;
        background: var(--primary);
        transition: width 0.2s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpxImportComponent {
  @Output() importData = new EventEmitter<GpxParseResult>();
  @Output() cancelImport = new EventEmitter<void>();

  private readonly maxFileSize = 10 * 1024 * 1024;

  dragging = false;
  error: string | null = null;
  parseResult: GpxParseResult | null = null;
  readingProgress: number | null = null;
  isParsing = false;
  isImporting = false;
  selected = {
    waypoints: true,
    routes: true,
    tracks: true,
  };

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    this.error = null;
    
    if (e.dataTransfer?.files?.length) {
      const file = e.dataTransfer.files[0];
      if (file) {
        this.readFile(file);
      }
    }
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file) {
        this.readFile(file);
      }
    }
  }

  private readFile(file: File) {
    if (file.size > this.maxFileSize) {
      this.error = 'File too large. Maximum size is 10MB.';
      return;
    }
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      this.error = 'Invalid GPX file.';
      return;
    }
    this.parseResult = null;
    this.readingProgress = 0;
    this.isParsing = false;
    this.error = null;
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        this.readingProgress = Math.round((event.loaded / event.total) * 100);
      }
    };
    reader.onload = (e) => {
        try {
            const xml = e.target?.result as string;
            this.isParsing = true;
            this.parseResult = GpxParser.parse(xml);
            this.error = null;
        } catch (err) {
            this.error = 'Failed to parse GPX file. Is it valid XML?';
            console.error(err);
        } finally {
            this.isParsing = false;
            this.readingProgress = 100;
        }
    };
    reader.onerror = () => {
        this.error = 'Error reading file';
        this.readingProgress = null;
        this.isParsing = false;
    };
    reader.readAsText(file);
  }

  get selectedCount(): number {
    if (!this.parseResult) return 0;
    let count = 0;
    if (this.selected.waypoints) {
      count += this.parseResult.waypoints.length;
    }
    if (this.selected.routes) {
      count += this.parseResult.routes.length;
    }
    if (this.selected.tracks) {
      count += this.parseResult.tracks.length;
    }
    return count;
  }

  toggleSelection(
    key: 'waypoints' | 'routes' | 'tracks',
    event: Event
  ) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected = { ...this.selected, [key]: checked };
  }

  confirm() {
    if (!this.parseResult) return;
    this.isImporting = true;
    const filtered: GpxParseResult = {
      waypoints: this.selected.waypoints ? this.parseResult.waypoints : [],
      routes: this.selected.routes ? this.parseResult.routes : [],
      tracks: this.selected.tracks ? this.parseResult.tracks : [],
    };
    this.importData.emit(filtered);
    this.isImporting = false;
  }

  cancel() {
      this.parseResult = null;
      this.readingProgress = null;
      this.isParsing = false;
      this.error = null;
      this.cancelImport.emit();
  }
}
