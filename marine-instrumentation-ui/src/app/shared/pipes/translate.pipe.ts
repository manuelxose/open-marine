import { Pipe, PipeTransform, inject, ChangeDetectorRef } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Impure to trigger on language change without passing lang as arg
})
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);
  private ref = inject(ChangeDetectorRef);
  
  private lastKey: string = '';
  private lastValue: string = '';
  private sub?: Subscription;

  transform(key: string): string {
    // If key hasn't changed and we already have a subscription, return cached value
    if (key === this.lastKey && this.lastValue) {
      return this.lastValue;
    }

    this.lastKey = key;

    // Dispose old subscription if key changed
    if (this.sub) {
      this.sub.unsubscribe();
    }

    // Subscribe to translation changes
    this.sub = this.languageService.translations$.subscribe(() => {
      const newValue = this.languageService.translate(key);
      if (newValue !== this.lastValue) {
        this.lastValue = newValue;
        this.ref.markForCheck();
      }
    });
    
    // Return current value immediately
    this.lastValue = this.languageService.translate(key);
    return this.lastValue;
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
