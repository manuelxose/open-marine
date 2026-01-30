import { Injectable, signal } from '@angular/core';

export interface ToastConfig {
  id?: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms, 0 = persistent
  action?: { label: string; callback: () => void };
}

@Injectable({
  providedIn: 'root'
})
export class AppToastService {
  private _toasts = signal<ToastConfig[]>([]);
  public readonly toasts = this._toasts.asReadonly();
  
  private counter = 0;

  show(config: ToastConfig): void {
    const id = this.counter++;
    const toast: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? 5000 // Default 5s
    };
    
    // Add to top or bottom? Stack usually adds to end.
    this._toasts.update(current => [...current, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
    }
  }

  dismiss(id: number): void {
    this._toasts.update(current => current.filter(t => t.id !== id));
  }

  dismissAll(): void {
    this._toasts.set([]);
  }
}
