import {
  Directive,
  Input,
  ElementRef,
  HostListener,
  ComponentRef,
  ViewContainerRef,
  OnDestroy,
  Renderer2,
  Inject,
  TemplateRef
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AppPopoverComponent } from './app-popover.component';
import { OverlayPositionService, OverlayPlacement } from '../../services/overlay-position.service';

@Directive({
  selector: '[appPopover]',
  standalone: true
})
export class AppPopoverDirective implements OnDestroy {
  @Input('appPopover') content: string | TemplateRef<unknown> = '';
  @Input() popoverPosition: OverlayPlacement = 'bottom';
  @Input() popoverTrigger: 'click' | 'hover' = 'click';

  private componentRef: ComponentRef<AppPopoverComponent> | null = null;
  private clickListenerFn: (() => void) | null = null;

  constructor(
    private element: ElementRef,
    private viewContainer: ViewContainerRef,
    private renderer: Renderer2,
    private overlayService: OverlayPositionService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (this.popoverTrigger === 'click') {
      // Prevent immediate closing by the document listener
      event.stopPropagation();
      this.toggle();
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.popoverTrigger === 'hover') {
      this.show();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.popoverTrigger === 'hover') {
       // Add delay to allow moving into the popover if needed (though difficult with appendToBody without safe triangle)
       // For simple tooltips/popovers, instant hide or small delay is fine.
       this.hide();
    }
  }

  ngOnDestroy(): void {
    this.hide(true);
  }

  toggle(): void {
    if (this.componentRef) {
      this.hide();
    } else {
      this.show();
    }
  }

  private show(): void {
    if (this.componentRef || !this.content) return;

    this.componentRef = this.viewContainer.createComponent(AppPopoverComponent);
    this.componentRef.instance.content = this.content;

    const domElem = (this.componentRef.hostView as any).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(this.document.body, domElem);

    this.componentRef.changeDetectorRef.detectChanges();

    // Position
    this.updatePosition(domElem);

    requestAnimationFrame(() => {
      if (this.componentRef) {
        this.renderer.addClass(domElem, 'visible');
        this.componentRef.instance.visible = true;
        this.componentRef.changeDetectorRef.detectChanges();
      }
    });

    if (this.popoverTrigger === 'click') {
      // Listen for outside clicks
      // We use setTimeout to avoid capturing the current click bubble
      setTimeout(() => {
        this.clickListenerFn = this.renderer.listen(this.document, 'click', (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          const host = this.element.nativeElement;
          const popover = domElem; // Since we style :host, likely popover itself

          if (!host.contains(target) && !popover.contains(target)) {
            this.hide();
          }
        });
      }, 0);
    }
  }

  private hide(immediate = false): void {
    if (!this.componentRef) return;

    if (this.clickListenerFn) {
      this.clickListenerFn();
      this.clickListenerFn = null;
    }

    const domElem = (this.componentRef.hostView as any).rootNodes[0] as HTMLElement;
    this.renderer.removeClass(domElem, 'visible');
    
    // Allow animation to finish
    const delay = immediate ? 0 : 150;
    
    setTimeout(() => {
      if (this.componentRef) {
        this.componentRef.destroy();
        this.componentRef = null;
      }
    }, delay);
  }

  private updatePosition(overlayElem: HTMLElement): void {
    const pos = this.overlayService.calculatePosition(
      this.element.nativeElement,
      overlayElem,
      this.popoverPosition,
      12
    );

    this.renderer.setStyle(overlayElem, 'top', `${pos.top}px`);
    this.renderer.setStyle(overlayElem, 'left', `${pos.left}px`);
  }
}
