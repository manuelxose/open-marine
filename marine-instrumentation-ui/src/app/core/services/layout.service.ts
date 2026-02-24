import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { 
    DashboardLayout, 
    DEFAULT_LAYOUT, 
    WidgetConfig, 
    WidgetDefinition,
    WIDGET_DEFINITIONS 
} from '../models/widget.models';

@Injectable({ providedIn: 'root' })
export class LayoutService {
    private readonly _layout = new BehaviorSubject<DashboardLayout>(DEFAULT_LAYOUT);
    public readonly layout$ = this._layout.asObservable();
    private readonly knownWidgetIds = new Set(WIDGET_DEFINITIONS.map((definition) => definition.id));

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem('omi-layout');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as DashboardLayout;
                    // Merge with defaults to handle new widgets
                    this._layout.next(this.normalizeLayout(this.mergeWithDefaults(parsed)));
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
     * Merge saved layout with defaults to ensure all new widgets are present
     */
    private mergeWithDefaults(saved: DashboardLayout): DashboardLayout {
        const merged: DashboardLayout = { widgets: [...(saved.widgets ?? [])] };
        const savedIds = new Set((saved.widgets ?? []).map(w => w.id));
        
        // Add any new widgets from defaults that aren't in saved
        DEFAULT_LAYOUT.widgets.forEach(defaultWidget => {
            if (!savedIds.has(defaultWidget.id)) {
                merged.widgets.push({ ...defaultWidget });
            }
        });
        
        return merged;
    }

    /**
     * Normalize layout to avoid malformed persisted state:
     * - remove unknown/duplicated widget ids
     * - repair invalid order values
     * - ensure all known widgets exist
     * - assign contiguous order indices
     */
    private normalizeLayout(layout: DashboardLayout): DashboardLayout {
        const unique = new Map<string, WidgetConfig>();

        for (const widget of layout.widgets ?? []) {
            if (!this.knownWidgetIds.has(widget.id) || unique.has(widget.id)) {
                continue;
            }

            const normalizedOrder = Number.isFinite(widget.order) ? widget.order : Number.MAX_SAFE_INTEGER;
            unique.set(widget.id, {
                id: widget.id,
                visible: widget.visible !== false,
                order: normalizedOrder,
            });
        }

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
     * Reset to default layout
     */
    reset(): void {
        this._layout.next(this.normalizeLayout(DEFAULT_LAYOUT));
    }
}
