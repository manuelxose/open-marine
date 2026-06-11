import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AISTargetListComponent, AISTargetListItem } from '../../patterns/ais-target-list/ais-target-list.component';

@Component({
  selector: 'app-ais-panel-widget',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent, AISTargetListComponent],
  template: `
    <section class="ais-panel-widget">
      <header class="ais-panel-widget__header">
        <div>
          <p class="ais-panel-widget__title">AIS Panel</p>
          <p class="ais-panel-widget__subtitle">{{ targets.length }} targets</p>
        </div>
        <app-button
          size="sm"
          variant="secondary"
          label="Track"
          iconLeft="target"
          [disabled]="!effectiveSelectedId()"
          (action)="emitTrack()"
        />
      </header>

      <div class="ais-panel-widget__empty" *ngIf="targets.length === 0">
        <app-icon name="ais" size="18"></app-icon>
        <span>No AIS targets in range</span>
      </div>

      <app-ais-target-list
        *ngIf="targets.length > 0"
        [targets]="targets"
        [sortBy]="'distance'"
        [selectedId]="effectiveSelectedId() || ''"
        (onSelect)="handleSelect($event)"
      />
    </section>
  `,
  styleUrls: ['./ais-panel-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AisPanelWidgetComponent {
  @Input() targets: AISTargetListItem[] = [];
  @Input() selectedId: string | null = null;

  @Output() onSelect = new EventEmitter<string>();
  @Output() onTrack = new EventEmitter<string>();

  private localSelectedId: string | null = null;

  effectiveSelectedId(): string | null {
    return this.selectedId ?? this.localSelectedId;
  }

  handleSelect(target: AISTargetListItem): void {
    this.localSelectedId = target.id;
    this.onSelect.emit(target.id);
  }

  emitTrack(): void {
    const selected = this.effectiveSelectedId();
    if (!selected) {
      return;
    }
    this.onTrack.emit(selected);
  }
}
