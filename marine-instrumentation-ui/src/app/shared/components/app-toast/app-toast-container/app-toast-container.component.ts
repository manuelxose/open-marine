import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { AppToastComponent } from '../app-toast.component';
import { AppToastService } from '../app-toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, AppToastComponent],
  template: `
    <div class="toast-stack" [@listAnimation]="toasts().length">
      <app-toast 
        *ngFor="let toast of toasts()" 
        [config]="toast" 
        (dismiss)="dismiss(toast.id!)"
      ></app-toast>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      z-index: 6000;
      pointer-events: none; /* Let clicks pass through empty areas */
      /* Positioning - Default to bottom-right or top-right */
      bottom: 20px;
      right: 20px;
    }
    
    .toast-stack {
      display: flex;
      flex-direction: column; /* or column-reverse for newest at bottom */
      gap: 10px;
      align-items: flex-end;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('listAnimation', [
      transition('* => *', [ // each time the binding value changes
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(20px)' }),
          stagger('50ms', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true }),
        query(':leave', [
          animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(20px)' }))
        ], { optional: true })
      ])
    ])
  ]
})
export class AppToastContainerComponent {
  private service = inject(AppToastService);
  toasts = this.service.toasts;

  dismiss(id: number) {
    this.service.dismiss(id);
  }
}
