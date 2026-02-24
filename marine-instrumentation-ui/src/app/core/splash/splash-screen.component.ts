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
    <!-- Subtle animated background wave -->
    <div class="splash-bg">
      <svg class="splash-wave" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z" />
      </svg>
    </div>

    <div class="splash-content">
      <!-- Animated compass logo -->
      <div class="splash-logo-wrap">
        <div class="splash-logo-ring"></div>
        <svg class="splash-logo" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Outer ring -->
          <circle cx="40" cy="40" r="36" stroke="#4a90d9" stroke-width="1.2" opacity="0.25"/>
          <!-- Tick marks at cardinal points -->
          <line x1="40" y1="4" x2="40" y2="11" stroke="#4a90d9" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="40" y1="69" x2="40" y2="76" stroke="#4a90d9" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/>
          <line x1="4" y1="40" x2="11" y2="40" stroke="#4a90d9" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/>
          <line x1="69" y1="40" x2="76" y2="40" stroke="#4a90d9" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/>
          <!-- North needle (solid blue) -->
          <polygon points="40,14 43.5,37 40,35 36.5,37" fill="#4a90d9"/>
          <!-- South needle (light) -->
          <polygon points="40,66 43.5,43 40,45 36.5,43" fill="#4a90d9" opacity="0.15"/>
          <!-- Center -->
          <circle cx="40" cy="40" r="3" fill="#4a90d9"/>
          <circle cx="40" cy="40" r="1.5" fill="white"/>
        </svg>
      </div>

      <!-- Brand -->
      <h1 class="splash-brand">
        <span class="splash-brand-main">Open Marine</span>
        <span class="splash-brand-sub">Instrumentation</span>
      </h1>

      <!-- Modern progress bar -->
      <div class="splash-progress">
        <div class="splash-progress-track">
          <div class="splash-progress-bar"></div>
        </div>
      </div>

      <!-- Status -->
      <p class="splash-status">{{ status$ | async }}</p>
    </div>

    <!-- Footer badge -->
    <footer class="splash-footer">
      <span class="splash-version">OMI v1.0</span>
    </footer>
  `,
  styleUrl: './splash-screen.component.scss',
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  private readonly splashService = inject(SplashService);
  private readonly elementRef = inject(ElementRef);
  private sub?: Subscription;

  readonly status$ = this.splashService.status$;

  ngOnInit(): void {
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
}
