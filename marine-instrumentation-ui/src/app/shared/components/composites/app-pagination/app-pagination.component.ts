import { Component, Input, Output, EventEmitter, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppButtonComponent } from '../../app-button/app-button.component';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, AppIconComponent, AppButtonComponent],
  template: `
    <nav class="pagination" role="navigation" aria-label="Pagination">
      <!-- Prev -->
      <app-button 
        variant="ghost" 
        size="sm" 
        [disabled]="current === 1" 
        (click)="onPageChange(current - 1)"
        aria-label="Previous page">
        <app-icon name="chevron-left" size="sm"></app-icon>
      </app-button>

      <!-- Pages -->
      <div class="pagination-list">
        <ng-container *ngFor="let page of visiblePages()">
          <button 
            *ngIf="page !== -1"
            type="button"
            class="pagination-item"
            [class.active]="page === current"
            [attr.aria-current]="page === current ? 'page' : null"
            (click)="onPageChange(page)">
            {{ page }}
          </button>
          
          <span *ngIf="page === -1" class="pagination-ellipsis">...</span>
        </ng-container>
      </div>

      <!-- Next -->
      <app-button 
        variant="ghost" 
        size="sm" 
        [disabled]="current === totalPages()" 
        (click)="onPageChange(current + 1)"
        aria-label="Next page">
        <app-icon name="chevron-right" size="sm"></app-icon>
      </app-button>
      
      <!-- Size Changer (Optional) -->
      <div *ngIf="showSizeChanger" class="pagination-sizer">
        <span class="text-xs text-secondary">Show</span>
        <select [value]="pageSize" (change)="onSizeChange($event)" aria-label="Items per page">
           <option *ngFor="let size of [10, 20, 50, 100]" [value]="size">{{ size }}</option>
        </select>
      </div>
    </nav>
  `,
  styleUrls: ['./app-pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPaginationComponent {
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() current = 1;
  @Input() showSizeChanger = false;
  
  @Output() currentChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  totalPages = computed(() => Math.ceil(this.total / this.pageSize) || 1);

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.current;
    
    // Simple logic for < 7 pages
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }

    if (current - delta > 2) {
        range.unshift(-1);
    }
    if (current + delta < total - 1) {
        range.push(-1);
    }

    range.unshift(1);
    if (total > 1) range.push(total);

    return range;
  });

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.current) {
      this.currentChange.emit(page);
    }
  }

  onSizeChange(event: Event) {
    const val = Number((event.target as HTMLSelectElement).value);
    this.pageSizeChange.emit(val);
  }
}
