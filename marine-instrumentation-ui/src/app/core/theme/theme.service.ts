import { Injectable, inject } from '@angular/core';
import { map, distinctUntilChanged } from 'rxjs';
import { Theme } from './theme.types';
import { PreferencesService } from '../services/preferences.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly preferences = inject(PreferencesService);

  readonly theme$ = this.preferences.preferences$.pipe(
    map((prefs) => prefs.theme),
    distinctUntilChanged()
  );

  toggle(): void {
    this.preferences.toggleTheme();
  }

  setTheme(theme: Theme): void {
    this.preferences.setTheme(theme);
  }
}
