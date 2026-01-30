import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChartCanvasVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-canvas',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-canvas.component.html',
  styleUrls: ['./chart-canvas.component.css'],
})
export class ChartCanvasComponent {
  @Input({ required: true }) vm!: ChartCanvasVm;
  @ViewChild('mapContainer', { static: true }) mapContainer?: ElementRef<HTMLDivElement>;
}
