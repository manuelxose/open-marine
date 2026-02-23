import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SplashService } from './splash.service';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="splash-logo">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Compass rose / navigation logo -->
        <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
        <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="1" opacity="0.2"/>
        <!-- Cardinal ticks -->
        <line x1="32" y1="2" x2="32" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="32" y1="54" x2="32" y2="62" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="2" y1="32" x2="10" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="54" y1="32" x2="62" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <!-- Intercardinal ticks -->
        <line x1="10.8" y1="10.8" x2="15.5" y2="15.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
        <line x1="48.5" y1="48.5" x2="53.2" y2="53.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
        <line x1="53.2" y1="10.8" x2="48.5" y2="15.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
        <line x1="15.5" y1="48.5" x2="10.8" y2="53.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
        <!-- North needle -->
        <polygon points="32,12 35,30 32,28 29,30" fill="currentColor" opacity="0.9"/>
        <!-- South needle -->
        <polygon points="32,52 35,34 32,36 29,34" fill="currentColor" opacity="0.35"/>
        <!-- Center dot -->
        <circle cx="32" cy="32" r="2.5" fill="currentColor"/>
        <!-- N marker -->
        <text x="32" y="9" text-anchor="middle" font-size="5" font-weight="700" fill="currentColor" font-family="Space Grotesk, sans-serif">N</text>
      </svg>
    </div>

    <div class="splash-title">Open Marine</div>
    <div class="splash-subtitle">Instrumentation</div>

    <!-- Compass loader -->
    <div class="splash-loader">
      <div class="loader-ring"></div>
      <div class="loader-needle"></div>
    </div>

    <div class="splash-status">{{ status$ | async }}</div>
  `,
  styleUrl: './splash-screen.component.scss',
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  private readonly splashService = inject(SplashService);
  private readonly elementRef = inject(ElementRef);
  private sub?: Subscription;

  readonly status$ = this.splashService.status$;

  ngOnInit(): void {
    // Apply initial theme from localStorage to avoid FOUC
    const theme = this.resolveTheme();
    if (theme === 'day') {
      this.elementRef.nativeElement.style.background = '#e5e9f0';
      this.elementRef.nativeElement.style.color = '#2e3440';
    }

    // Listen for visibility changes to add fade-out class
    this.sub = this.splashService.visible$.subscribe(visible => {
      if (!visible) {
        this.elementRef.nativeElement.classList.add('fade-out');
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private resolveTheme(): string {
    try {
      const legacy = localStorage.getItem('omi-theme');
      if (legacy === 'day' || legacy === 'night') return legacy;

      const prefs = localStorage.getItem('omi-preferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.theme === 'day' || parsed.theme === 'night') return parsed.theme;
      }
    } catch { /* ignore */ }
    return 'night';
  }
}
