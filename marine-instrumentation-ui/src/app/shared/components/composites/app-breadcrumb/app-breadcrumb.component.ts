import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export interface BreadcrumbItem {
  label: string;
  url?: string | any[];
  icon?: IconName;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink, AppIconComponent],
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li *ngFor="let item of items; let last = last" class="breadcrumb-item" [class.active]="last">
          <ng-container *ngIf="!last && item.url">
            <a [routerLink]="item.url" class="breadcrumb-link">
              <app-icon *ngIf="item.icon" [name]="item.icon" size="sm"></app-icon>
              <span>{{ item.label }}</span>
            </a>
          </ng-container>
          
          <span *ngIf="last || !item.url" class="breadcrumb-text" [attr.aria-current]="last ? 'page' : null">
            <app-icon *ngIf="item.icon" [name]="item.icon" size="sm"></app-icon>
            <span>{{ item.label }}</span>
          </span>

          <app-icon *ngIf="!last" name="chevron-right" size="xs" class="breadcrumb-separator"></app-icon>
        </li>
      </ol>
    </nav>
  `,
  styleUrls: ['./app-breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
