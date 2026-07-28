import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChartFacadeService } from '../chart/services/chart-facade.service';
import { ChartSourceCatalogComponent } from '../chart/components/chart-source-catalog/chart-source-catalog.component';
import { toChartId, validateChartFile } from '../chart/utils/chart-import.util';
import type {
  ChartControlsVm,
  ChartImportKind,
  ChartImportRequestVm,
  ChartSourceOptionVm,
} from '../chart/types/chart-vm';

type CatalogTab = 'sources' | 'remote' | 'import' | 'diagnostics';

@Component({
  selector: 'app-chart-catalog-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ChartSourceCatalogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-catalog.page.html',
  styleUrls: ['./chart-catalog.page.scss'],
})
export class ChartCatalogPage implements OnInit {
  private readonly facade = inject(ChartFacadeService);

  readonly vm$ = this.facade.controlsVm$;
  activeTab: CatalogTab = 'sources';
  importId = '';
  importLabel = '';
  importChartKind: 'raster' | 'vector' = 'raster';
  selectedFiles: Partial<Record<ChartImportKind, File>> = {};
  importError: string | null = null;

  readonly tabs: { id: CatalogTab; label: string }[] = [
    { id: 'sources', label: 'Sources' },
    { id: 'remote', label: 'Remote Catalog' },
    { id: 'import', label: 'Import' },
    { id: 'diagnostics', label: 'Diagnostics' },
  ];

  ngOnInit(): void {
    this.facade.refreshChartCatalog();
  }

  refresh(): void {
    this.facade.refreshChartCatalog();
  }

  selectSource(sourceId: string): void {
    void this.facade.selectChartSource(sourceId);
  }

  deleteSource(sourceId: string): void {
    this.facade.deleteChart(sourceId);
  }

  onFileSelected(kind: ChartImportKind, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    this.importError = null;
    if (!file) {
      return;
    }

    const validationError = this.validateFile(kind, file);
    if (validationError) {
      this.importError = validationError;
      input.value = '';
      return;
    }

    this.selectedFiles = { ...this.selectedFiles, [kind]: file };
    if (!this.importLabel) {
      this.importLabel = file.name.replace(/\.[^.]+$/, '');
    }
    if (!this.importId) {
      this.importId = this.toChartId(this.importLabel);
    }
  }

  submitImport(kind: ChartImportKind, vm: ChartControlsVm): void {
    if (!vm.chartEngineOnline) {
      this.importError = 'Chart engine is offline. Start omi-charts on Raspberry or run npm run start:charts in development.';
      return;
    }

    const file = this.selectedFiles[kind];
    const label = this.importLabel.trim();
    const id = this.toChartId(this.importId || label);
    if (!file || !label || !id) {
      this.importError = 'Select a file and provide chart id and label.';
      return;
    }
    if (id.length < 2) {
      this.importError = 'Chart id must be at least 2 characters.';
      return;
    }

    const validationError = this.validateFile(kind, file);
    if (validationError) {
      this.importError = validationError;
      return;
    }

    const request: ChartImportRequestVm = {
      kind,
      file,
      id,
      label,
      ...(kind === 'mbtiles' ? { chartKind: this.importChartKind } : {}),
    };
    this.importError = null;
    this.facade.importChart(request);
  }

  selectedFileName(kind: ChartImportKind): string {
    return this.selectedFiles[kind]?.name ?? 'No file selected';
  }

  statusLabel(vm: ChartControlsVm): string {
    switch (vm.chartEngineStatus) {
      case 'checking':
        return 'Starting / checking';
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  }

  sourceMeta(source: ChartSourceOptionVm): string {
    return `${source.category === 'base' ? 'Built-in' : 'Local'} - ${source.kind}`;
  }

  trackSource(_index: number, source: ChartSourceOptionVm): string {
    return source.id;
  }

  private toChartId(value: string): string {
    return toChartId(value);
  }

  private validateFile(kind: ChartImportKind, file: File): string | null {
    return validateChartFile(kind, file);
  }
}
