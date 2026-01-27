import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CriticalStripComponent } from '../../ui/components/critical-strip/critical-strip.component';
import { NavigationPanelComponent } from '../../ui/components/navigation-panel/navigation-panel.component';
import { WindPanelComponent } from '../../ui/components/wind-panel/wind-panel.component';
import { DepthPanelComponent } from '../../ui/components/depth-panel/depth-panel.component';
import { PowerPanelComponent } from '../../ui/components/power-panel/power-panel.component';
import { SystemPanelComponent } from '../../ui/components/system-panel/system-panel.component';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    CriticalStripComponent,
    NavigationPanelComponent,
    WindPanelComponent,
    DepthPanelComponent,
    PowerPanelComponent,
    SystemPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
})
export class DashboardPage {
  private preferencesService = inject(PreferencesService);

  private preferences = toSignal(this.preferencesService.preferences$, {
    initialValue: this.preferencesService.snapshot,
  });

  isCompact = computed(() => this.preferences().density === 'compact');

  toggleDensity(): void {
    this.preferencesService.toggleDensity();
  }
}
