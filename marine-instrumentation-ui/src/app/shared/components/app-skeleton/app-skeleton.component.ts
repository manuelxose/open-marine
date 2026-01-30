import { Component, Input, ChangeDetectionStrategy, booleanAttribute, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  styleUrls: ['./app-skeleton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSkeletonComponent {
  @Input() variant: SkeletonVariant = 'text';
  @Input() width: string | undefined;
  @Input() height: string | undefined;
  @Input({ transform: booleanAttribute }) animated = true;

  @HostBinding('class') get hostClasses() {
    return `variant-${this.variant} ${this.animated ? 'animated' : ''}`;
  }

  @HostBinding('style.width') get styleWidth() { return this.width; }
  @HostBinding('style.height') get styleHeight() { return this.height; }
}
