import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppButtonComponent } from '../../app-button/app-button.component';

export type WaypointFormMode = 'create' | 'edit';

export interface WaypointFormData {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  description?: string;
}

@Component({
  selector: 'app-waypoint-form-pattern',
  standalone: true,
  imports: [CommonModule, FormsModule, AppButtonComponent],
  template: `
    <form class="wp-form-pattern" (ngSubmit)="submit()">
      <header class="wp-form-pattern__header">
        <p class="wp-form-pattern__title">{{ mode === 'edit' ? 'Edit Waypoint' : 'Create Waypoint' }}</p>
      </header>

      <div class="wp-form-pattern__grid">
        <label class="wp-form-pattern__field">
          <span class="wp-form-pattern__label">Name</span>
          <input
            class="wp-form-pattern__control"
            type="text"
            [value]="draft.name"
            (input)="setName($event)"
            placeholder="Waypoint name"
          />
        </label>

        <label class="wp-form-pattern__field">
          <span class="wp-form-pattern__label">Latitude</span>
          <input
            class="wp-form-pattern__control"
            type="number"
            step="0.000001"
            [value]="draft.lat"
            (input)="setLat($event)"
            placeholder="0.000000"
          />
        </label>

        <label class="wp-form-pattern__field">
          <span class="wp-form-pattern__label">Longitude</span>
          <input
            class="wp-form-pattern__control"
            type="number"
            step="0.000001"
            [value]="draft.lon"
            (input)="setLon($event)"
            placeholder="0.000000"
          />
        </label>
      </div>

      <label class="wp-form-pattern__field">
        <span class="wp-form-pattern__label">Description</span>
        <textarea
          class="wp-form-pattern__control wp-form-pattern__control--textarea"
          rows="3"
          [value]="draft.description ?? ''"
          (input)="setDescription($event)"
          placeholder="Optional notes"
        ></textarea>
      </label>

      <p class="wp-form-pattern__error" *ngIf="validationError">{{ validationError }}</p>

      <footer class="wp-form-pattern__actions">
        <app-button size="sm" variant="ghost" label="Cancel" (action)="onCancel.emit()"></app-button>
        <app-button
          size="sm"
          variant="primary"
          [label]="mode === 'edit' ? 'Update Waypoint' : 'Create Waypoint'"
          [disabled]="saving || !isValid()"
          (action)="submit()"
        ></app-button>
      </footer>
    </form>
  `,
  styleUrls: ['./waypoint-form-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaypointFormPatternComponent implements OnChanges {
  @Input() waypoint: WaypointFormData | null = null;
  @Input() mode: WaypointFormMode = 'create';
  @Input() saving = false;

  @Output() onSave = new EventEmitter<WaypointFormData>();
  @Output() onCancel = new EventEmitter<void>();

  draft: WaypointFormData = {
    name: '',
    lat: 0,
    lon: 0,
    description: ''
  };

  validationError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['waypoint']) {
      this.resetDraft();
    }
  }

  setName(event: Event): void {
    this.draft = { ...this.draft, name: this.getText(event).trimStart() };
    this.validate();
  }

  setLat(event: Event): void {
    this.draft = { ...this.draft, lat: this.getNumber(event) };
    this.validate();
  }

  setLon(event: Event): void {
    this.draft = { ...this.draft, lon: this.getNumber(event) };
    this.validate();
  }

  setDescription(event: Event): void {
    this.draft = { ...this.draft, description: this.getText(event) };
  }

  isValid(): boolean {
    return this.validate(false);
  }

  submit(): void {
    if (!this.isValid()) {
      this.validate(true);
      return;
    }
    this.onSave.emit({
      ...this.draft,
      name: this.draft.name.trim(),
      description: this.draft.description?.trim() ?? ''
    });
  }

  private resetDraft(): void {
    if (this.waypoint) {
      this.draft = {
        name: this.waypoint.name,
        lat: this.waypoint.lat,
        lon: this.waypoint.lon,
        description: this.waypoint.description ?? ''
      };
      if (this.waypoint.id) {
        this.draft = { ...this.draft, id: this.waypoint.id };
      }
    } else {
      this.draft = { name: '', lat: 0, lon: 0, description: '' };
    }
    this.validationError = '';
  }

  private validate(writeError = true): boolean {
    const name = this.draft.name.trim();
    if (!name) {
      if (writeError) this.validationError = 'Name is required.';
      return false;
    }
    if (!Number.isFinite(this.draft.lat) || this.draft.lat < -90 || this.draft.lat > 90) {
      if (writeError) this.validationError = 'Latitude must be between -90 and 90.';
      return false;
    }
    if (!Number.isFinite(this.draft.lon) || this.draft.lon < -180 || this.draft.lon > 180) {
      if (writeError) this.validationError = 'Longitude must be between -180 and 180.';
      return false;
    }
    if (writeError) this.validationError = '';
    return true;
  }

  private getText(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
  }

  private getNumber(event: Event): number {
    const text = this.getText(event);
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
}
