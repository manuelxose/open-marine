import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName = 
  // Navigation
  | 'anchor' | 'compass' | 'waypoint' | 'route' | 'track' | 'vessel' | 'helm' | 'rudder'
  // Instruments
  | 'speedometer' | 'depth' | 'wind' | 'wind-arrow' | 'battery' | 'thermometer' | 'barometer'
  // Actions
  | 'play' | 'pause' | 'stop' | 'forward' | 'backward' | 'zoom-in' | 'zoom-out' | 'center' | 'layers'
  | 'edit' | 'trash' | 'locate' | 'target' | 'activity'
  // UI
  | 'menu' | 'close' | 'check' | 'warning' | 'error' | 'info' | 'settings' | 'search' | 'filter' | 'more-vertical' | 'x'
  // Alarms
  | 'alarm' | 'mob' | 'anchor-watch' | 'shallow' | 'collision' | 'alert-triangle'
  // Communication
  | 'ais' | 'radio' | 'satellite'
  // Controls
  | 'plus' | 'minus' | 'chevron-up' | 'chevron-down' | 'chevron-left' | 'chevron-right'
  | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'navigation' | 'crosshair';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="currentSize()"
      [attr.height]="currentSize()"
      [attr.class]="cssClass()"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <use [attr.href]="iconHref()"></use>
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
  `]
})
export class AppIconComponent {
  private readonly _name = signal<IconName>('activity');
  private readonly _size = signal<number>(24);
  private readonly _class = signal<string>('');

  @Input({ required: true }) 
  set name(value: IconName) {
    this._name.set(value);
  }

  @Input()
  set size(value: number | string) {
    this._size.set(Number(value));
  }

  @Input()
  set class(value: string) {
    this._class.set(value);
  }

  readonly currentSize = this._size;
  readonly cssClass = this._class;

  readonly iconHref = computed(() => {
    // We use external sprite to avoid embedding SVG in JS bundle
    // Requires <base href="/"> to generally work with fragment identifiers if using angular router hash location strategy
    // Or just absolute path to asset.
    return `/assets/icons/sprite.svg#${this._name()}`;
  });
}
