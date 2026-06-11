import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { DataQualityService, type DataQuality } from '../services/data-quality.service';

@Directive({
  selector: '[gbDataQuality]',
  standalone: true,
})
export class DataQualityDirective implements OnInit, OnDestroy {
  @Input() gbDataQuality!: number;

  private interval?: ReturnType<typeof setInterval>;
  private readonly qualityService = inject(DataQualityService);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);

  ngOnInit(): void {
    // Check data quality every 2s.
    this.interval = setInterval(() => this.updateQualityClass(), 2000);
    this.updateQualityClass();
  }

  private updateQualityClass(): void {
    const quality = this.qualityService.getQuality(this.gbDataQuality);
    const classes: DataQuality[] = ['good', 'warn', 'stale', 'missing'];

    classes.forEach((q) => {
      this.renderer.removeClass(this.el.nativeElement, `gb-quality--${q}`);
    });

    this.renderer.addClass(this.el.nativeElement, `gb-quality--${quality}`);
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
