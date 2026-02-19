import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent, TextColor } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

@Component({
  selector: 'app-battery-gauge',
  standalone: true,
  imports: [CommonModule, AppStackComponent, AppTextComponent, AppIconComponent],
  template: `
    <div class="battery-gauge-container" [style.width.px]="size" [style.height.px]="size">
      <svg class="dial" [attr.viewBox]="'0 0 ' + size + ' ' + size">
         <!-- Background Arc (Empty) -->
         <path 
           [attr.d]="backgroundArcPath" 
           fill="none" 
           stroke="var(--surface-border)" 
           [attr.stroke-width]="strokeWidth"
           stroke-linecap="round">
        </path>
         <!-- Value Arc (SOC) -->
         <path 
           [attr.d]="valueArcPath" 
           fill="none" 
           [attr.stroke]="socColor"
           [attr.stroke-width]="strokeWidth"
           stroke-linecap="round"
           style="transition: stroke-dasharray 0.5s ease;">
        </path>
      </svg>

      <div class="readout">
         <app-stack spacing="xs" align="center">
            <!-- Voltage -->
            <app-text variant="value" size="2xl" weight="bold">{{ voltage | number:'1.1-1' }}V</app-text>
            
            <!-- SOC & Current -->
            <app-stack direction="row" spacing="sm" align="center">
                <app-text variant="body" [color]="socColorName">{{ soc | number:'1.0-0' }}%</app-text>
                
                @if (charging || current > 0.1) {
                    <app-icon name="activity" color="accent" size="sm"></app-icon>
                }
                
                <app-text variant="caption" color="muted">{{ current | number:'1.1-1' }}A</app-text>
            </app-stack>
         </app-stack>
      </div>
      
      <div class="label empty">E</div>
      <div class="label full">F</div>
    </div>
  `,
  styleUrls: ['./battery-gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatteryGaugeComponent {
  @Input() voltage: number = 12.0;
  @Input() current: number = 0;
  @Input() soc: number = 50; // 0-100
  @Input() charging: boolean = false;
  @Input() size: number = 200;

  // Configuration
  strokeWidth = 12;
  startAngle = -220; 
  endAngle = 40;     
  
  get radius(): number {
    return (this.size / 2) - this.strokeWidth * 2;
  }

  get center(): number {
    return this.size / 2;
  }

  get socColor(): string {
     if (this.soc < 20) return 'var(--danger-default)'; 
     if (this.soc < 50) return 'var(--warning-default)'; 
     return 'var(--success-default)';
  }

  get socColorName(): TextColor {
     if (this.soc < 20) return 'danger';
     if (this.soc < 50) return 'warn';
     return 'success';
  }

  get backgroundArcPath(): string {
     return this.describeArc(this.center, this.center, this.radius, this.startAngle, this.endAngle);
  }

  get valueArcPath(): string {
    const range = 100;
    const value = Math.min(Math.max(this.soc, 0), 100);
    const normalized = value / range;
    const totalAngle = this.endAngle - this.startAngle; 
    const currentAngle = this.startAngle + (normalized * totalAngle);
    
    // Tiny adjustment to avoid full circle disappearing act if exactly equal? No, arc logic handles it.
    // If val is 0, angle is startAngle.
    
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
