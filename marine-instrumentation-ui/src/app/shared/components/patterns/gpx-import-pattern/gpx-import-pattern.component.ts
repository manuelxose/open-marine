import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface GpxImportPreview {
  fileName: string;
  waypoints: number;
  routes: number;
  tracks: number;
}

type GpxImportState = 'idle' | 'dropping' | 'parsing' | 'preview' | 'importing';

@Component({
  selector: 'app-gpx-import-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <section class="gpx-import-pattern">
      <header class="gpx-import-pattern__header">
        <p class="gpx-import-pattern__title">GPX Import</p>
        <span class="gpx-import-pattern__state">{{ state.toUpperCase() }}</span>
      </header>

      <div
        class="gpx-import-pattern__dropzone"
        [class.gpx-import-pattern__dropzone--dropping]="state === 'dropping'"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <app-icon name="arrow-up" size="20"></app-icon>
        <p class="gpx-import-pattern__drop-text">Drag and drop a .gpx file</p>
        <input
          #fileInput
          class="gpx-import-pattern__file-input"
          type="file"
          [accept]="allowedTypes.join(',')"
          (change)="onFileSelect($event)"
        />
        <app-button size="sm" variant="secondary" label="Browse GPX" (action)="fileInput.click()"></app-button>
      </div>

      <p class="gpx-import-pattern__error" *ngIf="error">{{ error }}</p>

      <div class="gpx-import-pattern__preview" *ngIf="preview">
        <p class="gpx-import-pattern__file-name">{{ preview.fileName }}</p>
        <dl class="gpx-import-pattern__counts">
          <div class="gpx-import-pattern__count">
            <dt>Waypoints</dt>
            <dd>{{ preview.waypoints }}</dd>
          </div>
          <div class="gpx-import-pattern__count">
            <dt>Routes</dt>
            <dd>{{ preview.routes }}</dd>
          </div>
          <div class="gpx-import-pattern__count">
            <dt>Tracks</dt>
            <dd>{{ preview.tracks }}</dd>
          </div>
        </dl>

        <footer class="gpx-import-pattern__actions">
          <app-button size="sm" variant="ghost" label="Reset" (action)="reset()"></app-button>
          <app-button
            size="sm"
            variant="primary"
            [label]="state === 'importing' ? 'Importing...' : 'Import'"
            [disabled]="state === 'importing'"
            (action)="confirmImport()"
          ></app-button>
        </footer>
      </div>
    </section>
  `,
  styleUrls: ['./gpx-import-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GpxImportPatternComponent {
  @Input() allowedTypes: string[] = ['.gpx', 'application/gpx+xml'];

  @Output() onImport = new EventEmitter<GpxImportPreview>();

  state: GpxImportState = 'idle';
  preview: GpxImportPreview | null = null;
  error = '';

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.state = 'dropping';
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (this.state === 'dropping') {
      this.state = this.preview ? 'preview' : 'idle';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.readFile(file);
    } else {
      this.state = this.preview ? 'preview' : 'idle';
    }
  }

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement | null)?.files?.[0];
    if (file) {
      void this.readFile(file);
    }
  }

  reset(): void {
    this.preview = null;
    this.error = '';
    this.state = 'idle';
  }

  confirmImport(): void {
    if (!this.preview) return;
    this.state = 'importing';
    this.onImport.emit(this.preview);
    this.state = 'preview';
  }

  private async readFile(file: File): Promise<void> {
    this.error = '';
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      this.state = 'idle';
      this.preview = null;
      this.error = 'Selected file is not a GPX file.';
      return;
    }

    this.state = 'parsing';
    try {
      const xml = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) {
        throw new Error('Invalid XML');
      }
      this.preview = {
        fileName: file.name,
        waypoints: doc.getElementsByTagName('wpt').length,
        routes: doc.getElementsByTagName('rte').length,
        tracks: doc.getElementsByTagName('trk').length
      };
      this.state = 'preview';
    } catch {
      this.preview = null;
      this.state = 'idle';
      this.error = 'Unable to parse GPX file.';
    }
  }
}
