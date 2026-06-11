import {
  Directive,
  Input,
  ElementRef,
  HostListener,
  ComponentRef,
  ViewContainerRef,
  OnDestroy,
  Renderer2,
  Inject
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AppTooltipComponent } from './app-tooltip.component';
import { OverlayPositionService } from '../../services/overlay-position.service'; // Adjust path if needed

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class AppTooltipDirective implements OnDestroy {
  @Input('appTooltip') text = '';
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private componentRef: ComponentRef<AppTooltipComponent> | null = null;
  private showTimeout: any;

  constructor(
    private element: ElementRef,
    private viewContainer: ViewContainerRef,
    private renderer: Renderer2,
    private overlayService: OverlayPositionService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.text) return;
    
    // Small delay to prevent flickering
    this.showTimeout = setTimeout(() => {
      this.show();
    }, 200);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  @HostListener('click')
  onClick(): void {
    // Hide on click usually preferable for touch or action
    this.hide();
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private show(): void {
    // If already showing, don't recreate
    if (this.componentRef) return;

    // Create Component
    this.componentRef = this.viewContainer.createComponent(AppTooltipComponent);
    
    // Set Input
    this.componentRef.instance.text = this.text;
    
    // Get DOM Element
    const domElem = (this.componentRef.hostView as any).rootNodes[0] as HTMLElement;
    
    // Append to Body
    this.renderer.appendChild(this.document.body, domElem);

    // Initial Change Detect to update text
    this.componentRef.changeDetectorRef.detectChanges();

    // Position it
    this.updatePosition(domElem);

    // Show it (add class for transition)
    requestAnimationFrame(() => {
      if (this.componentRef) {
         this.renderer.addClass(domElem, 'visible');
         this.componentRef.instance.visible = true; // Sync input just in case
         this.componentRef.changeDetectorRef.detectChanges();
      }
    });
  }

  private hide(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    if (this.componentRef) {
      const domElem = (this.componentRef.hostView as any).rootNodes[0] as HTMLElement;
      this.renderer.removeClass(domElem, 'visible');
      
      // Destroy after transition
      setTimeout(() => {
        if (this.componentRef) {
          this.componentRef.destroy();
          this.componentRef = null;
        }
      }, 150);
    }
  }

  private updatePosition(overlayElem: HTMLElement): void {
     const pos = this.overlayService.calculatePosition(
       this.element.nativeElement,
       overlayElem,
       this.tooltipPosition,
       8 // offset
     );

     this.renderer.setStyle(overlayElem, 'top', `${pos.top}px`);
     this.renderer.setStyle(overlayElem, 'left', `${pos.left}px`);
  }
}
