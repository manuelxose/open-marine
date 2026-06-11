import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../../core/services/layout.service';
import { DashboardLayoutService } from '../../../dashboard/services/dashboard-layout.service';
import {
  WIDGET_DEFINITIONS,
  type WidgetDefinition,
  type WidgetConfig,
} from '../../../../core/models/widget.models';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import {
  AppIconComponent,
  type IconName,
} from '../../../../shared/components/app-icon/app-icon.component';

interface DashboardItem {
  config: WidgetConfig;
  definition: WidgetDefinition | undefined;
}

@Component({
  selector: 'app-dashboard-widgets-settings',
  standalone: true,
  imports: [CommonModule, DragDropModule, TranslatePipe, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dws">
      <!-- Widget list with drag & drop -->
      <div
        class="dws-list"
        cdkDropList
        [cdkDropListData]="dashboardWidgets()"
        (cdkDropListDropped)="onDrop($event)"
      >
        @for (item of dashboardWidgets(); track item.config.id) {
          <div
            class="dws-item"
            [class.dws-item--hidden]="!item.config.visible"
            cdkDrag
          >
            <button class="dws-item__drag" cdkDragHandle aria-label="Reorder">
              <app-icon name="menu" size="14"></app-icon>
            </button>

            <div class="dws-item__info">
              <app-icon [name]="categoryIcon(item.definition)" size="16"></app-icon>
              <div class="dws-item__text">
                <span class="dws-item__label">{{ (item.definition?.title || item.config.id) | translate }}</span>
                <span class="dws-item__desc">{{ (item.definition?.description || '') | translate }}</span>
              </div>
            </div>

            <div class="dws-item__controls">
              <span class="dws-item__size">{{ item.definition?.size || '–' }}</span>
              <button
                class="toggle-btn"
                [class.active]="item.config.visible"
                (click)="toggleVisibility(item.config.id)"
                [attr.aria-label]="item.config.visible ? 'Hide' : 'Show'"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Reset -->
      <button class="dws-reset" (click)="resetAll()">
        <app-icon name="settings" size="14"></app-icon>
        {{ 'settings.widgets.reset' | translate }}
      </button>
    </div>
  `,
  styles: [
    `
    .dws-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 14px;
      overflow: hidden;
    }

    .dws-item {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      background: var(--gb-bg-panel);
      border-bottom: 1px solid var(--gb-border-panel);
      transition: opacity 200ms ease, background 150ms ease;
    }

    .dws-item:last-child { border-bottom: none; }
    .dws-item--hidden { opacity: 0.45; }

    .dws-item:hover {
      background: var(--gb-bg-glass-active, rgba(255,255,255,0.03));
    }

    .dws-item__drag {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--gb-text-muted);
      cursor: grab;
      padding: 4px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .dws-item__drag:active { cursor: grabbing; }
    .dws-item__drag:hover { color: var(--gb-text-value); }

    .dws-item__info {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      flex: 1;
      min-width: 0;
    }

    .dws-item__text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .dws-item__label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--gb-text-value);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dws-item__desc {
      font-size: 0.7rem;
      color: var(--gb-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dws-item__controls {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      flex-shrink: 0;
    }

    .dws-item__size {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.7rem;
      color: var(--gb-text-muted);
      background: var(--gb-bg-bezel);
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    /* ── Toggle switch ───────────────── */
    .toggle-btn {
      position: relative;
      width: 40px;
      height: 22px;
      background: var(--gb-bg-bezel);
      border: 1px solid var(--gb-border-panel);
      border-radius: 999px;
      cursor: pointer;
      transition: all 200ms ease;
      flex-shrink: 0;
      padding: 0;
      overflow: hidden;
    }
    .toggle-btn:hover { border-color: var(--gb-text-muted); }
    .toggle-btn.active {
      background: var(--gb-accent, #4a90d9);
      border-color: var(--gb-accent, #4a90d9);
    }
    .toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: var(--gb-text-muted);
      border-radius: 50%;
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .toggle-btn.active .toggle-slider {
      background: white;
      transform: translateX(18px);
    }

    /* ── CDK Drag styles ─────────────── */
    .cdk-drag-preview {
      background: var(--gb-bg-panel);
      border: 1px solid var(--gb-accent, #4a90d9);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      opacity: 0.95;
    }

    .cdk-drag-placeholder {
      background: rgba(74, 144, 217, 0.06);
      border: 1px dashed var(--gb-accent, #4a90d9);
      border-radius: 10px;
      opacity: 0.5;
    }

    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .dws-item:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* ── Reset button ────────────────── */
    .dws-reset {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2, 8px);
      width: 100%;
      margin-top: var(--space-4, 16px);
      background: transparent;
      border: 1px dashed var(--gb-border-panel);
      color: var(--gb-text-muted);
      padding: 10px;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 150ms ease;
    }
    .dws-reset:hover {
      background: rgba(240, 99, 82, 0.06);
      color: #f06352;
      border-color: #f06352;
    }

    @media (max-width: 640px) {
      .dws-item__desc { display: none; }
      .dws-item__size { display: none; }
    }
    `,
  ],
})
export class DashboardWidgetsSettingsComponent {
  private readonly layoutService = inject(LayoutService);
  private readonly dashLayout = inject(DashboardLayoutService);

  private readonly layoutSignal = toSignal(this.layoutService.layout$, {
    initialValue: this.layoutService.getSnapshot(),
  });

  readonly dashboardWidgets = computed<DashboardItem[]>(() => {
    const layout = this.layoutSignal();
    return layout.widgets
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((config) => ({
        config,
        definition: WIDGET_DEFINITIONS.find((def) => def.id === config.id),
      }));
  });

  categoryIcon(definition: WidgetDefinition | undefined): IconName {
    switch (definition?.category) {
      case 'navigation':
        return 'compass';
      case 'environment':
        return 'wind';
      case 'electrical':
        return 'battery';
      case 'system':
        return 'settings';
      default:
        return 'activity';
    }
  }

  toggleVisibility(widgetId: string): void {
    // Try DashboardLayoutService first
    const dashWidgets = this.dashLayout.getAllWidgets();
    if (dashWidgets.some((w) => w.id === widgetId)) {
      this.dashLayout.toggleWidget(widgetId);
    } else {
      this.layoutService.toggleWidget(widgetId);
    }
  }

  onDrop(event: CdkDragDrop<DashboardItem[]>): void {
    const ordered = this.dashboardWidgets().map((item) => item.config.id);
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    this.layoutService.reorderWidgets(ordered);
  }

  resetAll(): void {
    this.dashLayout.reset();
    this.layoutService.reset();
  }
}
