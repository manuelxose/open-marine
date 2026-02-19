import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-angle-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './angle-input.component.html',
  styleUrls: ['./angle-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AngleInputComponent {
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 359;
  @Input() step = 1;
  @Input() unit = '°';
  @Input() showDial = true;
  @Input() disabled = false;
  @Input() label = 'Angle';

  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('dialSvg') dialSvg?: ElementRef<SVGElement>;

  // Internal signal for value to allow easy wrapping logic if needed
  // For now just passthrough
  
  onInputChange(event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.updateValue(val);
  }

  updateValue(val: number) {
    if (this.disabled) return;
    
    // Normalize if desired, or clamp
    let normalized = val;
    if (this.max === 359 || this.max === 360) {
       // Wrap logic for headings
       normalized = ((val % 360) + 360) % 360;
    } else {
       normalized = Math.min(Math.max(val, this.min), this.max);
    }
    
    // Round to step
    // normalized = Math.round(normalized / this.step) * this.step;

    if (normalized !== this.value) {
      this.value = normalized;
      this.valueChange.emit(this.value);
    }
  }

  // Dial Interaction
  isDragging = false;

  onDialMouseDown(event: MouseEvent) {
    if (this.disabled) return;
    this.isDragging = true;
    this.calculateAngleFromEvent(event);
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  onDialTouchStart(event: TouchEvent) {
    if (this.disabled) return;
    this.isDragging = true;
    event.preventDefault(); // Prevent scroll while dragging dial
    this.calculateAngleFromEvent(event);
    window.addEventListener('touchmove', this.onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', this.onWindowTouchEnd);
  }

  private onWindowMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      this.calculateAngleFromEvent(e);
    }
  };

  private onWindowMouseUp = () => {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
  };

  private onWindowTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (this.isDragging) {
      this.calculateAngleFromEvent(e);
    }
  };

  private onWindowTouchEnd = () => {
    this.isDragging = false;
    window.removeEventListener('touchmove', this.onWindowTouchMove);
    window.removeEventListener('touchend', this.onWindowTouchEnd);
  };

  private calculateAngleFromEvent(event: MouseEvent | TouchEvent) {
    if (!this.dialSvg) return;
    
    const rect = this.dialSvg.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      const touch = event.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    // Math.atan2(y, x) -> radians.
    // Screen coords: Y increases down.
    // We want 0 at Top (North).
    // Vector center->mouse.
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Standard theta is from X axis (Right). 
    // We want from Y axis (Up, negative Y relative to center).
    // Actually simpler: 
    // angle = atan2(dy, dx) gives angle from East clockwise? No cartesian.
    // Let's use standard bearing formula: atan2(x, -y) ?? 
    // atan2(x, y) if x is East, y is North.
    // Here y is down. So -dy is Up.
    // bearing = atan2(dx, -dy) * 180/PI
    
    let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    // Result is -180 to 180.
    // Convert to 0-360
    if (deg < 0) deg += 360;

    this.updateValue(Math.round(deg));
  }
}
