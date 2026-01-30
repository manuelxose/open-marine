import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type InstrumentWidgetType =
  | 'compass'
  | 'speed'
  | 'depth'
  | 'wind'
  | 'battery'
  | 'gps'
  | 'clock';

export type InstrumentWidgetSize = 'sm' | 'md' | 'lg';

export interface InstrumentWidget {
  id: string;
  type: InstrumentWidgetType;
  size: InstrumentWidgetSize;
  visible: boolean;
}

const DEFAULT_WIDGETS: InstrumentWidget[] = [
  { id: 'compass', type: 'compass', size: 'md', visible: true },
  { id: 'speed', type: 'speed', size: 'md', visible: true },
  { id: 'depth', type: 'depth', size: 'md', visible: true },
  { id: 'wind', type: 'wind', size: 'md', visible: true },
  { id: 'battery', type: 'battery', size: 'sm', visible: true },
  { id: 'gps', type: 'gps', size: 'sm', visible: true },
  { id: 'clock', type: 'clock', size: 'sm', visible: true },
];

@Injectable({
  providedIn: 'root',
})
export class InstrumentsFacadeService {
  private readonly storageKey = 'omi-instruments-config';
  private readonly widgetsSubject = new BehaviorSubject<InstrumentWidget[]>([...DEFAULT_WIDGETS]);
  readonly widgets$ = this.widgetsSubject.asObservable();

  constructor() {
    this.restore();
    this.widgetsSubject.subscribe((widgets) => this.persist(widgets));
  }

  get snapshot(): InstrumentWidget[] {
    return this.widgetsSubject.value;
  }

  setWidgets(widgets: InstrumentWidget[]): void {
    this.widgetsSubject.next(this.normalize(widgets));
  }

  setVisibility(id: string, visible: boolean): void {
    this.updateWidget(id, { visible });
  }

  setSize(id: string, size: InstrumentWidgetSize): void {
    this.updateWidget(id, { size });
  }

  moveWidget(id: string, toIndex: number): void {
    const widgets = [...this.widgetsSubject.value];
    const fromIndex = widgets.findIndex((w) => w.id === id);
    if (fromIndex === -1 || toIndex < 0 || toIndex >= widgets.length) {
      return;
    }
    const [item] = widgets.splice(fromIndex, 1);
    widgets.splice(toIndex, 0, item);
    this.widgetsSubject.next(widgets);
  }

  resetDefaults(): void {
    this.widgetsSubject.next([...DEFAULT_WIDGETS]);
  }

  private updateWidget(id: string, patch: Partial<InstrumentWidget>): void {
    const widgets = this.widgetsSubject.value.map((widget) =>
      widget.id === id ? { ...widget, ...patch } : widget,
    );
    this.widgetsSubject.next(widgets);
  }

  private restore(): void {
    try {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        return;
      }
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as InstrumentWidget[];
      this.widgetsSubject.next(this.normalize(parsed));
    } catch {
      // ignore storage errors
    }
  }

  private persist(widgets: InstrumentWidget[]): void {
    try {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        return;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(widgets));
    } catch {
      // ignore storage errors
    }
  }

  private normalize(widgets: InstrumentWidget[]): InstrumentWidget[] {
    if (!Array.isArray(widgets)) {
      return [...DEFAULT_WIDGETS];
    }
    const filtered = widgets.filter((widget) =>
      widget &&
      typeof widget.id === 'string' &&
      typeof widget.type === 'string' &&
      (widget.size === 'sm' || widget.size === 'md' || widget.size === 'lg') &&
      typeof widget.visible === 'boolean'
    );
    if (filtered.length === 0) {
      return [...DEFAULT_WIDGETS];
    }
    return filtered.map((widget) => ({
      id: widget.id,
      type: widget.type as InstrumentWidgetType,
      size: widget.size,
      visible: widget.visible,
    }));
  }
}
