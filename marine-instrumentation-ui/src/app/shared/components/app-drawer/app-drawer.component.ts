import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, HostListener, Inject, Renderer2, DOCUMENT, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { AppIconComponent } from '../app-icon/app-icon.component';

export type DrawerPosition = 'left' | 'right' | 'bottom';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div 
      class="drawer-backdrop" 
      *ngIf="isOpen"
      (click)="onBackdropClick()"
      [@fadeIn]
    ></div>
    
    <aside
      class="drawer"
      *ngIf="isOpen"
      [ngClass]="positionClass"
      [style.width]="currentWidth"
      [style.height]="currentHeight"
      [attr.aria-hidden]="!isOpen"
      role="dialog"
      [attr.aria-modal]="true"
      [@slide]="position"
    >
      <header class="drawer-header" *ngIf="title">
        <h2>{{ title }}</h2>
        <button class="close-btn" (click)="close.emit()" aria-label="Close drawer" type="button">
          <app-icon name="x" [size]="24" />
        </button>
      </header>
      
      <div class="drawer-content">
        <ng-content />
      </div>
    </aside>
  `,
  styleUrls: ['./app-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slide', [
      transition('void => left', [
        style({ transform: 'translateX(-100%)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition('left => void', [
        animate('200ms ease-in', style({ transform: 'translateX(-100%)' }))
      ]),
      transition('void => right', [
        style({ transform: 'translateX(100%)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition('right => void', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)' }))
      ]),
      transition('void => bottom', [
        style({ transform: 'translateY(100%)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(0)' }))
      ]),
      transition('bottom => void', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)' }))
      ])
    ])
  ]
})
export class AppDrawerComponent implements OnDestroy {
  private _isOpen = signal(false);
  private _position = signal<DrawerPosition>('right');
  private _title = signal<string | undefined>(undefined);
  private _width = signal('320px');
  private _height = signal('40vh');

  @Input() set isOpen(v: boolean) {
    this._isOpen.set(v);
    this.toggleBodyScroll(v);
  }
  @Input() set position(v: DrawerPosition) { this._position.set(v); }
  @Input() set title(v: string | undefined) { this._title.set(v); }
  @Input() set width(v: string) { this._width.set(v); }
  @Input() set height(v: string) { this._height.set(v); }

  get isOpen(): boolean { return this._isOpen(); }
  get position(): DrawerPosition { return this._position(); }
  get title(): string | undefined { return this._title(); }

  get positionClass(): string {
    return `drawer-${this._position()}`;
  }

  get currentWidth(): string {
    return this._position() === 'bottom' ? '100%' : this._width();
  }

  get currentHeight(): string {
    return this._position() === 'bottom' ? this._height() : '100%';
  }

  @Output() close = new EventEmitter<void>();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent | Event) {
    if (this._isOpen()) {
      this.close.emit();
    }
  }

  onBackdropClick() {
    this.close.emit();
  }

  private toggleBodyScroll(lock: boolean) {
    const body = this.document.body;
    if (lock) {
      this.renderer.addClass(body, 'modal-open'); // Reuse modal-open class
    } else {
      this.renderer.removeClass(body, 'modal-open');
    }
  }

  ngOnDestroy() {
    this.toggleBodyScroll(false);
  }
}
