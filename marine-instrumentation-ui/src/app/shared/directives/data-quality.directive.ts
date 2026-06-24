import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
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
  private readonly zone = inject(NgZone);
  private lastQuality: DataQuality | null = null;

  ngOnInit(): void {
    // Check data quality every 2s.
    this.zone.runOutsideAngular(() => {
      this.interval = setInterval(() => this.updateQualityClass(), 2000);
    });
    this.updateQualityClass();
  }

  private updateQualityClass(): void {
    const quality = this.qualityService.getQuality(this.gbDataQuality);
    if (quality === this.lastQuality) {
      return;
    }

    const classes: DataQuality[] = ['good', 'warn', 'stale', 'missing'];

    classes.forEach((q) => {
      this.renderer.removeClass(this.el.nativeElement, `gb-quality--${q}`);
    });

    this.renderer.addClass(this.el.nativeElement, `gb-quality--${quality}`);
    this.lastQuality = quality;
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
