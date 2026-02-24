import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent, TextColor } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface Position {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-gps-status',
  standalone: true,
  imports: [CommonModule, AppStackComponent, AppTextComponent, AppIconComponent],
  template: `
    <div class="gps-status-container" [style.width.px]="size" [style.height.px]="size">
      <svg class="dial" [attr.viewBox]="'0 0 ' + size + ' ' + size">
         <!-- Background Arc (Track) -->
         <path 
           [attr.d]="backgroundArcPath" 
           fill="none" 
           stroke="var(--surface-border)" 
           [attr.stroke-width]="strokeWidth"
           stroke-linecap="round">
        </path>
         <!-- Value Arc (HDOP Quality) -->
         <!-- 
            HDOP 0.5 = Excellent (Full, Green)
            HDOP 10 = Bad (Empty, Red)
            Scale inverted: 0.8 is great. 
          -->
         <path 
           [attr.d]="valueArcPath" 
           fill="none" 
           [attr.stroke]="hdopColor"
           [attr.stroke-width]="strokeWidth"
           stroke-linecap="round"
           style="transition: stroke-dasharray 0.5s ease;">
        </path>
      </svg>

      <div class="readout">
         <app-stack spacing="xs" align="center">
            <app-icon name="satellite" [class]="'text-' + fixColor" size="md"></app-icon>
            <app-text variant="value" size="2xl" weight="bold">{{ satellites }}</app-text>
            <app-text variant="caption" color="muted">Sats</app-text>
            
            <app-text variant="body" [color]="fixColor" weight="bold" class="fix-type">{{ fixState | uppercase }}</app-text>
         </app-stack>
      </div>

      <div class="position-footer" *ngIf="position">
         <div class="coord">{{ formatCoord(position.latitude, 'lat') }}</div>
         <div class="coord">{{ formatCoord(position.longitude, 'lon') }}</div>
      </div>
      
      <div class="label hdop-label">HDOP {{ hdop | number:'1.1-1' }}</div>
    </div>
  `,
  styleUrls: ['./gps-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GPSStatusComponent {
  @Input() fixState: 'no-fix' | '2d' | '3d' | 'dgps' | 'rtk' = 'no-fix';
  @Input() satellites: number = 0;
  @Input() hdop: number = 99.9;
  @Input() position?: Position;
  @Input() size: number = 200;

  // Configuration
  strokeWidth = 8;
  startAngle = -220; 
  endAngle = 40;     
  
  get radius(): number {
    return (this.size / 2) - this.strokeWidth * 2;
  }

  get center(): number {
    return this.size / 2;
  }

  get fixColor(): TextColor {
     if (this.fixState === 'no-fix') return 'danger';
     if (this.fixState === '2d') return 'warn';
     if (this.fixState === '3d') return 'success';
     if (this.fixState === 'dgps' || this.fixState === 'rtk') return 'accent';
     return 'muted';
  }

  get hdopColor(): string {
     if (this.hdop < 1.0) return 'var(--success-default)'; 
     if (this.hdop < 2.5) return 'var(--primary-default)'; 
     if (this.hdop < 5.0) return 'var(--warning-default)';
     return 'var(--danger-default)';
  }

  get backgroundArcPath(): string {
     return this.describeArc(this.center, this.center, this.radius, this.startAngle, this.endAngle);
  }

  get valueArcPath(): string {
    // Invert logic: Lower HDOP is better (Full Bar).
    // Let's say HDOP 0.5 = 100%, HDOP 5.0 = 0%.
    const minHdop = 0.5;
    const maxHdop = 5.0;
    const range = maxHdop - minHdop;
    
    let quality = 0;
    if (this.hdop <= minHdop) quality = 1;
    else if (this.hdop >= maxHdop) quality = 0;
    else quality = 1 - ((this.hdop - minHdop) / range);
    
    // Safety check
    if (this.fixState === 'no-fix') quality = 0;

    const totalAngle = this.endAngle - this.startAngle; 
    const currentAngle = this.startAngle + (quality * totalAngle);
    
    return this.describeArc(this.center, this.center, this.radius, this.startAngle, currentAngle);
  }
  
  formatCoord(val: number, type: 'lat' | 'lon'): string {
      const deg = Math.floor(Math.abs(val));
      const min = (Math.abs(val) - deg) * 60;
      let cardinal = '';
      if (type === 'lat') cardinal = val >= 0 ? 'N' : 'S';
      else cardinal = val >= 0 ? 'E' : 'W';
      
      return `${deg}° ${min.toFixed(3)}' ${cardinal}`;
  }

  polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number){
      // Avoid full 360 circle issue if start==end by ensuring small delta or specific logic
      if (Math.abs(endAngle - startAngle) < 0.001) {
          // Empty path
          return "";
      } 
      
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
