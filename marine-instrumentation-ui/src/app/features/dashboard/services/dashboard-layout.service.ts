import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, map, shareReplay } from 'rxjs';

// ── Types ─────────────────────────────────────────────────────────────

export type DashboardWidgetType =
  | 'navigation'
  | 'wind'
  | 'depth'
  | 'power'
  | 'environment'
  | 'performance'
  | 'trip'
  | 'system';

export interface DashboardWidgetConfig {
  id: string;
  type: DashboardWidgetType;
  span: number; // Columns occupied (1-3)
  visible: boolean;
}

export interface DashboardRow {
  widgets: DashboardWidgetConfig[];
}

export interface DashboardLayout {
  columns: number; // 1, 2, or 3
  rows: DashboardRow[];
}

// ── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_LAYOUT: DashboardLayout = {
  columns: 2,
  rows: [
    {
      widgets: [
        { id: 'nav', type: 'navigation', span: 2, visible: true },
      ],
    },
    {
      widgets: [
        { id: 'wind', type: 'wind', span: 1, visible: true },
        { id: 'depth', type: 'depth', span: 1, visible: true },
      ],
    },
    {
      widgets: [
        { id: 'power', type: 'power', span: 1, visible: true },
        { id: 'system', type: 'system', span: 1, visible: true },
      ],
    },
    {
      widgets: [
        { id: 'environment', type: 'environment', span: 1, visible: false },
        { id: 'performance', type: 'performance', span: 1, visible: false },
      ],
    },
    {
      widgets: [
        { id: 'trip', type: 'trip', span: 1, visible: false },
      ],
    },
  ],
};

const STORAGE_KEY = 'omi-dashboard-layout';

// ── Service ───────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DashboardLayoutService {
  private readonly _layout = new BehaviorSubject<DashboardLayout>(DEFAULT_LAYOUT);
  readonly layout$ = this._layout.asObservable();

  readonly visibleWidgets$ = this._layout.pipe(
    map((layout) =>
      layout.rows.flatMap((row) => row.widgets).filter((w) => w.visible),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly columns$ = this._layout.pipe(
    map((layout) => layout.columns),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.restore();
      this._layout.subscribe((layout) => this.persist(layout));
    }
  }

  get snapshot(): DashboardLayout {
    return this._layout.value;
  }

  /** Get flat list of all widget configs */
  getAllWidgets(): DashboardWidgetConfig[] {
    return this._layout.value.rows.flatMap((r) => r.widgets);
  }

  /** Toggle widget visibility */
  toggleWidget(id: string): void {
    const layout = this._layout.value;
    const next: DashboardLayout = {
      ...layout,
      rows: layout.rows.map((row) => ({
        widgets: row.widgets.map((w) =>
          w.id === id ? { ...w, visible: !w.visible } : w,
        ),
      })),
    };
    this._layout.next(next);
  }

  /** Set column count */
  setColumns(columns: number): void {
    const clamped = Math.max(1, Math.min(3, columns));
    this._layout.next({ ...this._layout.value, columns: clamped });
  }

  /** Move a widget from one index to another */
  moveWidget(widgetId: string, toRowIndex: number): void {
    const layout = this._layout.value;
    let widget: DashboardWidgetConfig | null = null;

    // Remove from current position
    const rowsWithout = layout.rows.map((row) => ({
      widgets: row.widgets.filter((w) => {
        if (w.id === widgetId) {
          widget = w;
          return false;
        }
        return true;
      }),
    }));

    if (!widget) return;

    // Insert at target row
    if (toRowIndex >= 0 && toRowIndex < rowsWithout.length) {
      rowsWithout[toRowIndex]!.widgets.push(widget);
    }

    this._layout.next({ ...layout, rows: rowsWithout });
  }

  /** Reset to defaults */
  reset(): void {
    this._layout.next(DEFAULT_LAYOUT);
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DashboardLayout;
      if (parsed && Array.isArray(parsed.rows)) {
        this._layout.next(parsed);
      }
    } catch {
      /* ignore corrupt data */
    }
  }

  private persist(layout: DashboardLayout): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* ignore quota errors */
    }
  }
}
