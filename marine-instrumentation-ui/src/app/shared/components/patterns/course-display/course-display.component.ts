import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { formatSpeed, formatAngleDegrees } from '../../../../core/formatting/formatters';

@Component({
  selector: 'app-course-display',
  standalone: true,
  imports: [CommonModule, AppStackComponent, AppTextComponent, AppIconComponent, AppBoxComponent],
  template: `
    <app-box class="course-display" [class]="size" padding="4">
      <app-stack spacing="md" align="stretch">
        <!-- Main: SOG -->
        <app-stack direction="row" spacing="sm" align="center" justify="between">
           <app-stack direction="row" spacing="xs" align="center">
             <app-icon name="speedometer" size="sm" class="text-muted"></app-icon>
             <app-text variant="caption" color="muted">SOG</app-text>
           </app-stack>
           <div class="main-value">
             <app-text variant="value" [size]="valueSize">{{ sogDisplay.value }}</app-text>
             <app-text variant="caption" color="muted" class="unit-label">{{ sogDisplay.unit }}</app-text>
           </div>
        </app-stack>

        <div class="separator"></div>

        <!-- Secondary: COG & Heading -->
        <div class="secondary-values">
          <!-- COG -->
           <app-stack spacing="xs" align="center">
             <div class="label-row">
                <app-icon name="track" size="xs" class="text-muted"></app-icon>
                <app-text variant="caption" color="muted">COG</app-text>
             </div>
             <app-text variant="value" [size]="secondarySize">{{ cogDisplay.value }}<span class="unit">°</span></app-text>
           </app-stack>
           
           <!-- Heading -->
           <app-stack spacing="xs" align="center">
             <div class="label-row">
                <app-icon name="compass" size="xs" class="text-muted"></app-icon>
                <app-text variant="caption" color="muted">HDG</app-text>
             </div>
             <app-text variant="value" [size]="secondarySize">{{ headingDisplay.value }}<span class="unit">°</span></app-text>
           </app-stack>
        </div>
      </app-stack>
    </app-box>
  `,
  styleUrls: ['./course-display.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDisplayComponent implements OnChanges {
  @Input() sog: number | null = 0; // m/s
  @Input() cog: number | null = 0; // radians
  @Input() heading: number | null = 0; // radians
  @Input() unit: 'kn' | 'm/s' | 'km/h' = 'kn';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  sogDisplay = { value: '--', unit: 'kn' };
  cogDisplay = { value: '--', unit: '°' };
  headingDisplay = { value: '--', unit: '°' };

  ngOnChanges(_changes: SimpleChanges): void {
     this.updateValues();
  }

  updateValues() {
    this.sogDisplay = formatSpeed(this.sog, this.unit);
    this.cogDisplay = formatAngleDegrees(this.cog);
    this.headingDisplay = formatAngleDegrees(this.heading);
  }

  get valueSize(): any {
    return this.size === 'lg' ? '4xl' : (this.size === 'md' ? '3xl' : 'xl');
  }

  get secondarySize(): any {
    return this.size === 'lg' ? 'xl' : (this.size === 'md' ? 'lg' : 'md');
  }
}
