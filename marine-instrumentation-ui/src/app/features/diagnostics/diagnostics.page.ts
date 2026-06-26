import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UplotChartComponent } from '../../shared/components/uplot-chart/uplot-chart.component';
import {
  SimulationFacadeService,
  type SimulationTab,
} from './simulation-facade.service';

@Component({
  selector: 'app-diagnostics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, UplotChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnostics.page.html',
  styleUrl: './diagnostics.page.scss',
})
export class DiagnosticsPage {
  readonly facade = inject(SimulationFacadeService);

  readonly tabs: Array<{ id: SimulationTab; labelKey: string }> = [
    { id: 'scenarios', labelKey: 'simulation.tabs.scenarios' },
    { id: 'execution', labelKey: 'simulation.tabs.execution' },
    { id: 'charts', labelKey: 'simulation.tabs.charts' },
    { id: 'data', labelKey: 'simulation.tabs.data' },
    { id: 'history', labelKey: 'simulation.tabs.history' },
  ];

  // Channels list for charts tab
  readonly allChannelIds = computed(() => {
    const run = this.facade.activeRun();
    if (!run) return [];
    return run.channelSnapshot?.map((s) => s.channelId) ?? [];
  });

  // Simple uPlot data preparation
  readonly chartData = computed<number[][]>(() => {
    const selectedIds = this.facade.selectedChannelIds();
    if (selectedIds.length === 0) return [[], []];

    const timeData: number[] = [];
    const seriesData: number[][] = [];

    for (const channelId of selectedIds) {
      const history = this.facade.historyFor(channelId);
      const values: number[] = [];
      for (const sample of history) {
        if (timeData.length === 0 || sample.simulatedMs > (timeData[timeData.length - 1] ?? 0)) {
          timeData.push(sample.simulatedMs);
        }
        values.push(typeof sample.value === 'number' ? sample.value : 0);
      }
      seriesData.push(values);
    }

    if (timeData.length === 0) return [[], []];

    return [timeData, ...seriesData];
  });

  readonly chartOptions = computed(() => {
    const selectedIds = this.facade.selectedChannelIds();
    return {
      width: 800,
      height: 400,
      series: [
        { label: 'Time (ms)' },
        ...selectedIds.map((id, i) => ({
          label: id,
          stroke: this.chartColor(i),
        })),
      ],
      axes: [
        { label: 'Simulated Time (ms)' },
        { label: 'Value' },
      ],
    };
  });

  setNumericParameter(id: string, value: unknown): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) this.facade.setParameter(id, parsed);
  }

  eventTime(simulatedMs: number): string {
    return `${(simulatedMs / 1000).toFixed(1)} s`;
  }

  statusLabel(status: string): string {
    return status.replace('-', ' ').toUpperCase();
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  togglePause(): void {
    this.facade.paused.update((p) => !p);
  }

  private chartColor(index: number): string {
    const colors = ['#00ff88', '#00ccff', '#ffaa00', '#ff4444', '#cc88ff', '#ffff00'];
    return colors[index % colors.length] ?? '#00ff88';
  }
}
