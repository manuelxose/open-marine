import { Injectable } from '@angular/core';

export type OverlayPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface OverlayPosition {
  top: number;
  left: number;
}

@Injectable({
  providedIn: 'root'
})
export class OverlayPositionService {
  
  calculatePosition(
    triggerEl: HTMLElement,
    overlayEl: HTMLElement,
    placement: OverlayPlacement = 'bottom',
    offset: number = 8
  ): OverlayPosition {
    const triggerRect = triggerEl.getBoundingClientRect();
    const overlayRect = overlayEl.getBoundingClientRect();
    
    // We assume fixed positioning relative to viewport for the overlay
    // If it's absolute relative to a container, this logic needs adjustment.
    // Given the previous implementations were using append to body + fixed, 
    // we stick to Fixed Strategy which is easiest for overlays (avoids overflow:hidden issues).

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - overlayRect.height - offset;
        left = triggerRect.left + (triggerRect.width - overlayRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - overlayRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - overlayRect.height) / 2;
        left = triggerRect.left - overlayRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - overlayRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Boundary detection / Flip (Simple: if out of bounds, try opposite)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check Bottom overflow
    if (placement === 'bottom' && (top + overlayRect.height > viewportHeight)) {
       // Flip to top
       const attemptedTop = triggerRect.top - overlayRect.height - offset;
       if (attemptedTop > 0) top = attemptedTop;
    }

    // Check Top overflow
    if (placement === 'top' && top < 0) {
       // Flip to bottom
       const attemptedBottom = triggerRect.bottom + offset;
       if (attemptedBottom + overlayRect.height < viewportHeight) top = attemptedBottom;
    }
    
    // Horizontal clamping (keep within screen)
    if (left < offset) left = offset;
    if (left + overlayRect.width > viewportWidth - offset) {
      left = viewportWidth - overlayRect.width - offset;
    }

    return { top, left };
  }
}
