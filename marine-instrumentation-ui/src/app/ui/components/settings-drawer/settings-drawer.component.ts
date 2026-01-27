import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreferencesService, SpeedUnit, DepthUnit } from '../../../core/services/preferences.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-settings-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Trigger Button -->
    <button (click)="open = true" class="fixed bottom-4 right-4 z-40 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-full shadow-lg transition-colors border border-slate-500/50">
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
          <circle cx="12" cy="12" r="3"></circle>
       </svg>
    </button>

    <!-- Backdrop -->
    <div *ngIf="open" (click)="open = false" 
         class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity">
    </div>

    <!-- Drawer -->
    <div 
        class="fixed top-0 right-0 h-full w-80 bg-[var(--surface-1)] border-l border-[var(--border)] shadow-2xl z-50 transform transition-transform duration-300 ease-out p-6 overflow-y-auto"
        [class.translate-x-full]="!open"
        [class.translate-x-0]="open">
        
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-xl font-bold tracking-tight text-[var(--fg)]">Settings</h2>
            <button (click)="open = false" class="text-[var(--text-2)] hover:text-[var(--fg)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        <div class="space-y-8">
            
            <!-- Appearance -->
            <section>
                <h3 class="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">Appearance</h3>
                
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[var(--fg)]">Theme</span>
                    <button (click)="theme.toggle()" class="bg-[var(--surface-2)] px-3 py-1 rounded text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-0)] text-[var(--fg)] w-24">
                        {{ (theme.theme$ | async) | titlecase }}
                    </button>
                </div>

                <div class="flex items-center justify-between">
                    <span class="text-[var(--fg)]">Compact Mode</span>
                    <button 
                        (click)="toggleCompact()" 
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                        [class.bg-[var(--accent)]]="(prefs.prefs$ | async)?.density === 'compact'"
                        [class.bg-[var(--surface-2)]]="(prefs.prefs$ | async)?.density !== 'compact'"
                    >
                        <span class="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" [class.translate-x-6]="(prefs.prefs$ | async)?.density === 'compact'"></span>
                    </button>
                </div>
            </section>

            <!-- Units -->
            <section>
                <h3 class="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">Units</h3>
                
                <div class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-sm text-[var(--text-2)]">Speed</label>
                        <select 
                            [value]="(prefs.prefs$ | async)?.speedUnit" 
                            (change)="onSpeedUnitChange($event)"
                            class="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] rounded p-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                        >
                            <option value="kn">Knots (kn)</option>
                            <option value="m/s">Meters/sec (m/s)</option>
                            <option value="km/h">Km/h</option>
                        </select>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label class="text-sm text-[var(--text-2)]">Depth</label>
                        <select 
                            [value]="(prefs.prefs$ | async)?.depthUnit" 
                            (change)="onDepthUnitChange($event)"
                            class="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg)] rounded p-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                        >
                            <option value="m">Meters (m)</option>
                            <option value="ft">Feet (ft)</option>
                        </select>
                    </div>
                </div>
            </section>

            <!-- Layout Configuration -->
            <section>
                <h3 class="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">Dashboard Widgets</h3>
                
                <div class="space-y-3 max-h-64 overflow-y-auto pr-2">
                    <div *ngFor="let def of widgetDefs; trackBy: trackByWidget" class="flex items-start justify-between gap-3 p-2 rounded border border-[var(--border)] bg-[var(--surface-2)]/30">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium text-[var(--fg)]">{{ def.title }}</span>
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] font-bold">{{ def.size }}</span>
                            </div>
                            <p class="text-xs text-[var(--muted)] mt-0.5 truncate">{{ def.description }}</p>
                        </div>
                        <button 
                            (click)="toggleWidget(def.id)" 
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0"
                            [class.bg-[var(--accent)]]="isWidgetVisible(def.id)"
                            [class.bg-[var(--surface-2)]]="!isWidgetVisible(def.id)"
                        >
                            <span class="translate-x-0.5 inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" [class.translate-x-4]="isWidgetVisible(def.id)"></span>
                        </button>
                    </div>
                </div>

                <button 
                    (click)="resetLayout()" 
                    class="mt-4 w-full bg-[var(--surface-2)] hover:bg-[var(--surface-0)] text-[var(--fg)] px-3 py-2 rounded text-sm font-medium border border-[var(--border)] transition-colors">
                    Reset to Default
                </button>
            </section>

        </div>
    </div>
  `,
  styles: []
})
export class SettingsDrawerComponent {
    public prefs = inject(PreferencesService);
    public theme = inject(ThemeService);
    public layout = inject(LayoutService);
    
    open = false;

    // Expose widget definitions for template
    get widgetDefs() {
        return this.layout.getWidgetDefinitions();
    }

    isWidgetVisible(widgetId: string): boolean {
        const config = this.layout.getSnapshot().widgets.find(w => w.id === widgetId);
        return config?.visible ?? false;
    }

    toggleWidget(widgetId: string) {
        this.layout.toggleWidget(widgetId);
    }

    resetLayout() {
        this.layout.reset();
    }

    trackByWidget(index: number, def: { id: string }): string {
        return def.id;
    }

    toggleCompact() {
        this.prefs.toggleDensity();
    }

    onSpeedUnitChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        this.prefs.setSpeedUnit(target.value as SpeedUnit);
    }

    onDepthUnitChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        this.prefs.setDepthUnit(target.value as DepthUnit);
    }
}
