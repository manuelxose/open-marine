import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import {
    DashboardLayout,
    DEFAULT_LAYOUT,
    WidgetConfig,
    WidgetDefinition,
    WidgetKind,
    WidgetSize,
    WIDGET_DEFINITIONS,
    makeInstrumentWidgetId,
} from '../models/widget.models';

@Injectable({ providedIn: 'root' })
export class LayoutService {
    private readonly _layout = new BehaviorSubject<DashboardLayout>(DEFAULT_LAYOUT);
    public readonly layout$ = this._layout.asObservable();
    private readonly definitionById = new Map<string, WidgetDefinition>(
        WIDGET_DEFINITIONS.map((definition) => [definition.id, definition]),
    );

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem('omi-layout');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as DashboardLayout;
                    // normalizeLayout migrates legacy entries and guarantees
                    // all default panels are present.
                    this._layout.next(this.normalizeLayout(parsed));
                } catch {
                    // ignore corrupt data
                }
            }
        }
        
        this.layout$.subscribe(layout => {
             if (isPlatformBrowser(this.platformId)) {
                  localStorage.setItem('omi-layout', JSON.stringify(layout));
             }
        });
    }

    /**
     * Normalize layout to avoid malformed persisted state:
     * - migrate legacy panel entries ({ id, visible, order }) to the unified shape
     * - drop unknown panels and malformed instrument entries
     * - de-duplicate by placement id and repair invalid order values
     * - ensure all default panels exist, then assign contiguous order indices
     */
    private normalizeLayout(layout: DashboardLayout): DashboardLayout {
        const unique = new Map<string, WidgetConfig>();

        for (const widget of layout.widgets ?? []) {
            if (!widget || unique.has(widget.id)) {
                continue;
            }
            const normalized = this.normalizeWidget(widget);
            if (normalized) {
                unique.set(normalized.id, normalized);
            }
        }

        // Composite panels are always available (hidden, not removed).
        for (const defaultWidget of DEFAULT_LAYOUT.widgets) {
            if (!unique.has(defaultWidget.id)) {
                unique.set(defaultWidget.id, { ...defaultWidget });
            }
        }

        const ordered = [...unique.values()].sort((a, b) => a.order - b.order);

        return {
            widgets: ordered.map((widget, index) => ({
                ...widget,
                order: index,
            })),
        };
    }

    private normalizeWidget(widget: WidgetConfig): WidgetConfig | null {
        const order = Number.isFinite(widget.order) ? widget.order : Number.MAX_SAFE_INTEGER;
        const kind: WidgetKind = widget.kind === 'instrument' ? 'instrument' : 'panel';

        if (kind === 'instrument') {
            const refId = widget.refId;
            if (!refId) {
                return null;
            }
            return {
                id: widget.id,
                kind: 'instrument',
                refId,
                size: widget.size ?? 'S',
                visible: widget.visible !== false,
                order,
            };
        }

        // Panel (also covers legacy entries without a `kind`/`refId`).
        const refId = widget.refId ?? widget.id;
        const def = this.definitionById.get(refId);
        if (!def) {
            return null;
        }
        return {
            id: refId,
            kind: 'panel',
            refId,
            size: widget.size ?? def.size,
            visible: widget.visible !== false,
            order,
        };
    }

    /**
     * Get all widget definitions
     */
    getWidgetDefinitions(): WidgetDefinition[] {
        return WIDGET_DEFINITIONS;
    }

    /**
     * Get current layout snapshot
     */
    getSnapshot(): DashboardLayout {
        return this._layout.value;
    }

    /**
     * Get visible widgets in order
     */
    getVisibleWidgets(): WidgetConfig[] {
        return this._layout.value.widgets
            .filter(w => w.visible)
            .sort((a, b) => a.order - b.order);
    }

    /**
     * Toggle widget visibility
     */
    toggleWidget(widgetId: string): void {
        const current = this._layout.value;
        const updated = {
            ...current,
            widgets: current.widgets.map(w => 
                w.id === widgetId ? { ...w, visible: !w.visible } : w
            )
        };
        this._layout.next(this.normalizeLayout(updated));
    }

    /**
     * Set widget visibility
     */
    setWidgetVisibility(widgetId: string, visible: boolean): void {
        const current = this._layout.value;
        const updated = {
            ...current,
            widgets: current.widgets.map(w => 
                w.id === widgetId ? { ...w, visible } : w
            )
        };
        this._layout.next(this.normalizeLayout(updated));
    }

    /**
     * Reorder widgets (future: drag & drop)
     */
    reorderWidgets(newOrder: string[]): void {
        const current = this._layout.value;
        const orderIndexById = new Map<string, number>(newOrder.map((id, index) => [id, index]));
        const updated = {
            ...current,
            widgets: current.widgets.map(w => ({
                ...w,
                order: orderIndexById.get(w.id) ?? w.order
            }))
        };
        this._layout.next(this.normalizeLayout(updated));
    }

    /**
     * Add a widget to the dashboard.
     * - Panels are unique: adding an existing panel just makes it visible.
     * - Instruments are added as a new placement each time (duplicates allowed).
     */
    addWidget(kind: WidgetKind, refId: string, size?: WidgetSize): void {
        const current = this._layout.value;

        if (kind === 'panel') {
            const existing = current.widgets.find((w) => w.id === refId);
            if (existing) {
                this.setWidgetVisibility(refId, true);
                return;
            }
            const def = this.definitionById.get(refId);
            if (!def) {
                return;
            }
            const widget: WidgetConfig = {
                id: refId,
                kind: 'panel',
                refId,
                size: size ?? def.size,
                visible: true,
                order: current.widgets.length,
            };
            this._layout.next(this.normalizeLayout({ widgets: [...current.widgets, widget] }));
            return;
        }

        const widget: WidgetConfig = {
            id: makeInstrumentWidgetId(refId),
            kind: 'instrument',
            refId,
            size: size ?? 'S',
            visible: true,
            order: current.widgets.length,
        };
        this._layout.next(this.normalizeLayout({ widgets: [...current.widgets, widget] }));
    }

    /**
     * Remove a widget placement by id. Default panels are re-seeded by
     * normalizeLayout (hidden, not removed); instruments are removed outright.
     */
    removeWidget(id: string): void {
        const current = this._layout.value;
        this._layout.next(
            this.normalizeLayout({ widgets: current.widgets.filter((w) => w.id !== id) }),
        );
    }

    /**
     * Reset to default layout
     */
    reset(): void {
        this._layout.next(this.normalizeLayout(DEFAULT_LAYOUT));
    }
}
