import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { en, Translations } from '../i18n/en';
import { es } from '../i18n/es';

export type Language = 'en' | 'es';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly langSubject = new BehaviorSubject<Language>('en');
  readonly lang$ = this.langSubject.asObservable();

  private readonly translationsSubject = new BehaviorSubject<Translations>(en);
  readonly translations$ = this.translationsSubject.asObservable();

  constructor() {
    // Try to recover lang from localStorage
    const saved = localStorage.getItem('omi-lang') as Language;
    if (saved && (saved === 'en' || saved === 'es')) {
      this.setLanguage(saved);
    }
  }

  setLanguage(lang: Language) {
    this.langSubject.next(lang);
    localStorage.setItem('omi-lang', lang);
    
    switch (lang) {
      case 'es':
        this.translationsSubject.next(es);
        break;
      default:
        this.translationsSubject.next(en);
    }
  }

  getCurrentLanguage(): Language {
    return this.langSubject.value;
  }

  // Helper to get nested value "safe"
  translate(key: string): string {
    const keys = key.split('.');
    let current: any = this.translationsSubject.value;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    
    return typeof current === 'string' ? current : key;
  }
}
