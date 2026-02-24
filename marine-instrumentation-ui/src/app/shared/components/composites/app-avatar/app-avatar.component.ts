import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar" [ngClass]="['avatar--' + size]">
      <!-- Image -->
      <img *ngIf="src && !hasError" 
           [src]="src" 
           [alt]="name || 'Avatar'" 
           class="avatar-image"
           (error)="onError()">
      
      <!-- Initials Fallback -->
      <div *ngIf="(!src || hasError) && initials" class="avatar-fallback avatar-initials">
        {{ initials }}
      </div>

      <!-- Icon Fallback -->
      <div *ngIf="(!src || hasError) && !initials" class="avatar-fallback avatar-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>

      <!-- Status Indicator -->
      <span *ngIf="status" class="avatar-status" [ngClass]="'status--' + status"></span>
    </div>
  `,
  styles: [`
    .avatar {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: var(--surface-hover, #e2e8f0);
      color: var(--text-secondary, #64748b);
      user-select: none;
      vertical-align: middle;
      overflow: visible; // For status indicator

      &--sm { width: 32px; height: 32px; font-size: 0.75rem; }
      &--md { width: 40px; height: 40px; font-size: 0.875rem; }
      &--lg { width: 56px; height: 56px; font-size: 1.125rem; }
      &--xl { width: 72px; height: 72px; font-size: 1.5rem; }

      &-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      &-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--primary-light, #bfdbfe);
        color: var(--primary-dark, #1e40af);
        font-weight: 600;
        text-transform: uppercase;
      }
      
      &-icon {
        background-color: var(--surface-secondary);
        color: var(--gb-text-muted);
        padding: 20%;
        
        svg {
          width: 100%;
          height: 100%;
        }
      }

      &-status {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 25%;
        height: 25%;
        border-radius: 50%;
        border: 2px solid var(--bg-surface, #fff);
        box-sizing: content-box;

        &.status--online { background-color: var(--success, #22c55e); }
        &.status--offline { background-color: var(--text-tertiary, #94a3b8); }
        &.status--busy { background-color: var(--error, #ef4444); }
        &.status--away { background-color: var(--warning, #f59e0b); }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppAvatarComponent implements OnChanges {
  @Input() src?: string;
  @Input() name?: string;
  @Input() size: AvatarSize = 'md';
  @Input() status?: AvatarStatus;

  hasError = false;
  initials = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['name']) {
      this.initials = this.getInitials(this.name);
    }
    if (changes['src']) {
      this.hasError = false;
    }
  }

  onError() {
    this.hasError = true;
  }

  private getInitials(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    const first = parts[0] ?? '';
    if (parts.length === 1) return first.substring(0, 2).toUpperCase();
    const last = parts[parts.length - 1] ?? '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
}
