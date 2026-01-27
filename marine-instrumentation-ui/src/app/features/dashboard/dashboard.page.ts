import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardFacadeService } from './dashboard-facade.service';
import { CriticalStripComponent } from './components/critical-strip/critical-strip.component';
import { NavigationPanelComponent } from './components/panels/navigation-panel/navigation-panel.component';
import { WindPanelComponent } from './components/panels/wind-panel/wind-panel.component';
import { DepthPanelComponent } from './components/panels/depth-panel/depth-panel.component';
import { PowerPanelComponent } from './components/panels/power-panel/power-panel.component';
import { SystemPanelComponent } from './components/panels/system-panel/system-panel.component';

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
  private readonly facade = inject(DashboardFacadeService);

  readonly isCompact$ = this.facade.isCompact$;
  readonly criticalVm$ = this.facade.criticalStripVm$;
  readonly navigationVm$ = this.facade.navigationVm$;
  readonly windVm$ = this.facade.windVm$;
  readonly depthVm$ = this.facade.depthVm$;
  readonly powerVm$ = this.facade.powerVm$;
  readonly systemVm$ = this.facade.systemVm$;

  toggleDensity(): void {
    this.facade.toggleDensity();
  }
}
