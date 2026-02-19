import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface LayerControlItem {
  id: string;
  label: string;
  enabled: boolean;
  locked?: boolean;
}

@Component({
  selector: 'app-layer-control-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="layer-control-pattern">
      <header class="layer-control-pattern__header">
        <p class="layer-control-pattern__title">Layer Control</p>
        <span class="layer-control-pattern__count">{{ enabledCount() }}/{{ layers.length }}</span>
      </header>

      <ul class="layer-control-pattern__list">
        <li class="layer-control-pattern__item" *ngFor="let layer of layers; trackBy: trackById">
          <button
            type="button"
            class="layer-control-pattern__toggle"
            [class.layer-control-pattern__toggle--on]="layer.enabled"
            [disabled]="!!layer.locked"
            (click)="toggle(layer)"
          >
            <span class="layer-control-pattern__dot"></span>
          </button>

          <span class="layer-control-pattern__label">{{ layer.label }}</span>

          <span class="layer-control-pattern__lock" *ngIf="layer.locked">
            <app-icon name="warning" size="14"></app-icon>
          </span>
        </li>
      </ul>
    </section>
  `,
  styleUrls: ['./layer-control-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerControlPatternComponent {
  @Input() layers: LayerControlItem[] = [];

  @Output() onToggle = new EventEmitter<string>();

  enabledCount(): number {
    return this.layers.filter((layer) => layer.enabled).length;
  }

  trackById(_: number, layer: LayerControlItem): string {
    return layer.id;
  }

  toggle(layer: LayerControlItem): void {
    if (layer.locked) {
      return;
    }
    this.onToggle.emit(layer.id);
  }
}

