import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChartFullscreenService {
  private readonly _isFullscreen = signal(false);
  readonly isFullscreen = this._isFullscreen.asReadonly();
  
  constructor() {
    // Escuchar cambios del Fullscreen API del navegador
    document.addEventListener('fullscreenchange', () => {
      this._isFullscreen.set(!!document.fullscreenElement);
    });
  }
  
  async toggle(): Promise<void> {
    if (this._isFullscreen()) {
      await this.exit();
    } else {
      await this.enter();
    }
  }
  
  async enter(): Promise<void> {
    try {
      const chartElement = document.querySelector('.chart-page');
      if (chartElement) {
        await chartElement.requestFullscreen();
        this._isFullscreen.set(true);
      }
    } catch (error) {
      console.warn('Fullscreen not supported:', error);
      // Fallback: usar clase CSS para simular fullscreen
      this._isFullscreen.set(true);
    }
  }
  
  async exit(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      this._isFullscreen.set(false);
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
      this._isFullscreen.set(false);
    }
  }
}
