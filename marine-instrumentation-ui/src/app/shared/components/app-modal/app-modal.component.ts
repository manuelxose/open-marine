import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener, signal, ElementRef, ViewChild, OnDestroy, Inject, Renderer2, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { AppIconComponent } from '../app-icon/app-icon.component';

export type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div 
      class="modal-backdrop" 
      *ngIf="isOpen"
      (click)="onBackdropClick($event)"
      [@fadeIn]
    >
      <div 
        class="modal-content"
        [class]="sizeClass"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="titleId"
        [@slideUp]
        tabindex="-1"
        #modalContent
      >
        <header class="modal-header" *ngIf="showHeader">
          <h2 [id]="titleId">{{ title }}</h2>
          <button 
            class="close-btn" 
            (click)="close.emit()"
            aria-label="Close dialog"
            type="button"
          >
            <app-icon name="x" [size]="24" />
          </button>
        </header>
        
        <div class="modal-body">
          <ng-content />
        </div>
        
        <footer class="modal-footer" *ngIf="showFooter">
          <ng-content select="[modal-footer]" />
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./app-modal.component.css'],
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
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateY(10px)', opacity: 0 }))
      ])
    ])
  ]
})
export class AppModalComponent implements OnDestroy {
  // Inputs as signals
  private _isOpen = signal(false);
  private _title = signal('');
  private _size = signal<ModalSize>('md');
  private _showHeader = signal(true);
  private _showFooter = signal(true);
  private _closeOnBackdrop = signal(true);
  private _closeOnEscape = signal(true);

  @Input() set isOpen(v: boolean) { 
    this._isOpen.set(v);
    this.toggleBodyScroll(v);
    if (v) {
      setTimeout(() => this.modalContent?.nativeElement?.focus(), 50);
    }
  }
  @Input() set title(v: string) { this._title.set(v); }
  @Input() set size(v: ModalSize) { this._size.set(v); }
  @Input() set showHeader(v: boolean) { this._showHeader.set(v); }
  @Input() set showFooter(v: boolean) { this._showFooter.set(v); }
  @Input() set closeOnBackdrop(v: boolean) { this._closeOnBackdrop.set(v); }
  @Input() set closeOnEscape(v: boolean) { this._closeOnEscape.set(v); }

  @Output() close = new EventEmitter<void>();

  @ViewChild('modalContent') modalContent?: ElementRef<HTMLDivElement>;

  private readonly titleIdValue = `modal-title-${Math.random().toString(36).substr(2, 9)}`;

  get isOpen(): boolean { return this._isOpen(); }
  get title(): string { return this._title(); }
  get showHeader(): boolean { return this._showHeader(); }
  get showFooter(): boolean { return this._showFooter(); }
  get sizeClass(): string { return `modal-${this._size()}`; }
  get titleId(): string { return this.titleIdValue; }

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(_event: KeyboardEvent | Event) {
    if (this._isOpen() && this._closeOnEscape()) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (this._closeOnBackdrop() && event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  private toggleBodyScroll(lock: boolean) {
    const body = this.document.body;
    if (lock) {
      this.renderer.addClass(body, 'modal-open');
    } else {
      this.renderer.removeClass(body, 'modal-open');
    }
  }

  ngOnDestroy() {
    this.toggleBodyScroll(false);
  }
}
