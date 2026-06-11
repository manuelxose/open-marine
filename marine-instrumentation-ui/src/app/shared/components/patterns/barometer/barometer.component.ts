import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-barometer',
  standalone: true,
  imports: [CommonModule, AppStackComponent, AppTextComponent, AppIconComponent],
  template: `
    <div class="barometer-container" [style.width.px]="size" [style.height.px]="size">
      <!-- Background Arc -->
      <svg class="dial" [attr.viewBox]="'0 0 ' + size + ' ' + size">
         <path 
           [attr.d]="backgroundArcPath" 
           fill="none" 
           stroke="var(--surface-border)" 
           [attr.stroke-width]="strokeWidth">
        </path>
         <!-- Value Arc -->
         <path 
           [attr.d]="valueArcPath" 
           fill="none" 
           [attr.stroke]="pressureColor"
           [attr.stroke-width]="strokeWidth"
           style="transition: stroke-dasharray 0.5s ease;">
        </path>
      </svg>

      <div class="readout">
         <app-stack spacing="xs" align="center">
            <app-text variant="value" size="3xl" weight="bold">{{ pressure | number:'1.0-1' }}</app-text>
            <app-stack direction="row" spacing="xs" align="center">
                <app-text variant="caption" color="muted">{{ unit }}</app-text>
                @if (trend === 'rising') {
                    <app-icon name="arrow-up" color="success" size="sm"></app-icon>
                } @else if (trend === 'falling') {
                    <app-icon name="arrow-down" color="danger" size="sm"></app-icon>
                } @else if (trend === 'steady') {
                    <app-icon name="minus" color="muted" size="sm"></app-icon>
                }
            </app-stack>
         </app-stack>
      </div>

       <div class="label min">{{ min }}</div>
       <div class="label max">{{ max }}</div>
    </div>
  `,
  styleUrls: ['./barometer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarometerComponent {
  @Input() pressure: number = 1013;
  @Input() trend: 'rising' | 'falling' | 'steady' = 'steady';
  @Input() unit: string = 'hPa';
  @Input() size: number = 200;

  // Configuration
  min = 960;
  max = 1060;
  strokeWidth = 10;
  startAngle = -210; 
  endAngle = 30;     
  
  get radius(): number {
    return (this.size / 2) - this.strokeWidth * 2;
  }

  get center(): number {
    return this.size / 2;
  }

  get pressureColor(): string {
     if (this.pressure < 990) return 'var(--danger-default)'; 
     if (this.pressure < 1005) return 'var(--warning-default)'; 
     if (this.pressure > 1025) return 'var(--success-default)'; 
     return 'var(--primary-default)';
  }

  get backgroundArcPath(): string {
     return this.describeArc(this.center, this.center, this.radius, this.startAngle, this.endAngle);
  }

  get valueArcPath(): string {
    const range = this.max - this.min;
    const value = Math.min(Math.max(this.pressure, this.min), this.max);
    const normalized = (value - this.min) / range;
    const totalAngle = this.endAngle - this.startAngle; 
    const currentAngle = this.startAngle + (normalized * totalAngle);
    
    return this.describeArc(this.center, this.center, this.radius, this.startAngle, currentAngle);
  }

  polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number){
      const start = this.polarToCartesian(x, y, radius, endAngle);
      const end = this.polarToCartesian(x, y, radius, startAngle);

      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

      const d = [
          "M", start.x, start.y, 
          "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(" ");

      return d;       
  }
}
