import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { SearchInputComponent } from '../../../../shared/components/composites/search-input/search-input.component';
import {
  LIBRARY_GROUPS,
  searchLibrary,
  type LibraryGroup,
  type LibraryGroupId,
  type LibraryItem,
} from '../../data/widget-library';

/**
 * Enterprise widget library selector. Browses composite panels and the full
 * instrument catalog by category with search, and emits the chosen item for
 * the dashboard to place. Replaces the old crude "palette" list.
 */
@Component({
  selector: 'app-dashboard-widget-library',
  standalone: true,
  imports: [AppIconComponent, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './widget-library.component.html',
  styleUrls: ['./widget-library.component.css'],
})
export class WidgetLibraryComponent {
  /** refIds of panels currently visible on the dashboard (to show active state). */
  @Input() set activePanelIds(ids: string[]) {
    this._activePanelIds.set(new Set(ids ?? []));
  }
  @Output() select = new EventEmitter<LibraryItem>();
  @Output() closePanel = new EventEmitter<void>();

  readonly groups: LibraryGroup[] = LIBRARY_GROUPS;
  readonly query = signal('');
  readonly activeGroup = signal<LibraryGroupId>('panels');
  private readonly _activePanelIds = signal<Set<string>>(new Set());

  readonly visibleItems = computed<LibraryItem[]>(() => {
    const q = this.query();
    if (q.trim()) {
      return searchLibrary(q);
    }
    const group = this.groups.find((g) => g.id === this.activeGroup());
    return group?.items ?? [];
  });

  readonly isSearching = computed(() => this.query().trim().length > 0);

  setGroup(id: LibraryGroupId): void {
    this.activeGroup.set(id);
  }

  onSearch(value: string): void {
    this.query.set(value);
  }

  onClearSearch(): void {
    this.query.set('');
  }

  isPanelActive(item: LibraryItem): boolean {
    return item.kind === 'panel' && this._activePanelIds().has(item.refId);
  }

  onSelect(item: LibraryItem): void {
    this.select.emit(item);
  }

  trackItem(_index: number, item: LibraryItem): string {
    return item.kind + ':' + item.refId;
  }

  trackGroup(_index: number, group: LibraryGroup): string {
    return group.id;
  }
}
