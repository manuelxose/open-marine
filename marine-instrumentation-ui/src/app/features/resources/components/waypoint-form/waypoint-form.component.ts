import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

export interface WaypointFormValue {
  name: string;
  lat: number;
  lon: number;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-waypoint-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="wp-form">
      <div class="form-field">
        <label for="wp-name">Name</label>
        <input 
          id="wp-name"
          type="text"
          formControlName="name"
          placeholder="Waypoint name"
          class="input-control"
        />
        <div class="error" *ngIf="form.get('name')?.touched && form.get('name')?.invalid">
            Name is required
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label for="wp-lat">Latitude</label>
          <input 
            id="wp-lat"
            type="number"
            step="0.000001"
            formControlName="lat"
            class="input-control"
          />
        </div>
        <div class="form-field">
          <label for="wp-lon">Longitude</label>
          <input 
            id="wp-lon"
            type="number"
            step="0.000001"
            formControlName="lon"
            class="input-control"
          />
        </div>
      </div>
      
      <div class="form-field">
        <label for="wp-desc">Description</label>
        <textarea 
          id="wp-desc"
          formControlName="description"
          rows="3"
          class="input-control"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label for="wp-icon">Icon</label>
          <select id="wp-icon" formControlName="icon" class="input-control">
              <option value="crosshair">Crosshair</option>
              <option value="target">Target</option>
              <option value="anchor">Anchor</option>
          </select>
        </div>
        <!-- Color picker placeholder -->
        <!-- <div class="form-field">
            <label>Color</label>
             <input type="color" formControlName="color" class="input-control h-10 w-full" />
        </div> -->
      </div>
      
      <div class="form-actions">
        <app-button 
          variant="ghost" 
          (click)="cancel.emit()"
          type="button"
        >
          Cancel
        </app-button>
        <app-button 
          variant="primary"
          type="submit"
          [disabled]="form.invalid || saving"
        >
          <span *ngIf="saving">Saving...</span>
          <span *ngIf="!saving">{{ editMode ? 'Update' : 'Create' }}</span>
        </app-button>
      </div>
    </form>
  `,
  styles: [`
    .wp-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .input-control {
      padding: 0.75rem;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text-primary);
      border-radius: 4px;
      font-family: inherit;
    }
    .input-control:focus {
        outline: none;
        border-color: var(--primary);
    }
    textarea.input-control {
        resize: vertical;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }
    .error {
        color: var(--warn);
        font-size: 0.75rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaypointFormComponent implements OnChanges {
  @Input() initialValue?: Partial<WaypointFormValue> | null;
  @Input() editMode = false;
  @Input() saving = false;
  
  @Output() save = new EventEmitter<WaypointFormValue>();
  @Output() cancel = new EventEmitter<void>();
  
  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lat: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(-90), Validators.max(90)] }),
    lon: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(-180), Validators.max(180)] }),
    description: new FormControl('', { nonNullable: true }),
    icon: new FormControl('crosshair', { nonNullable: true }),
    color: new FormControl('#ff0000', { nonNullable: true }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] && this.initialValue) {
      this.form.patchValue(this.initialValue);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.save.emit(this.form.getRawValue());
    } else {
        this.form.markAllAsTouched();
    }
  }
}
