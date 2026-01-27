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

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem('omi-layout');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as DashboardLayout;
                    // Merge with defaults to handle new widgets
                    this._layout.next(this.mergeWithDefaults(parsed));
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
        const merged = { ...saved };
        const savedIds = new Set(saved.widgets.map(w => w.id));
        
        // Add any new widgets from defaults that aren't in saved
        DEFAULT_LAYOUT.widgets.forEach(defaultWidget => {
            if (!savedIds.has(defaultWidget.id)) {
                merged.widgets.push({ ...defaultWidget });
            }
        });
        
        return merged;
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
        this._layout.next(updated);
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
        this._layout.next(updated);
    }

    /**
     * Reorder widgets (future: drag & drop)
     */
    reorderWidgets(newOrder: string[]): void {
        const current = this._layout.value;
        const updated = {
            ...current,
            widgets: current.widgets.map(w => ({
                ...w,
                order: newOrder.indexOf(w.id)
            }))
        };
        this._layout.next(updated);
    }

    /**
     * Reset to default layout
     */
    reset(): void {
        this._layout.next(DEFAULT_LAYOUT);
    }
}
