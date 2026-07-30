import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { OnboardingService } from './onboarding.service';
import { WelcomeStepComponent } from './steps/welcome-step.component';
import { PreferencesStepComponent } from './steps/preferences-step.component';
import { ConnectionStepComponent } from './steps/connection-step.component';
import { TourStepComponent } from './steps/tour-step.component';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    WelcomeStepComponent,
    PreferencesStepComponent,
    ConnectionStepComponent,
    TourStepComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="onboarding-overlay">
      <div class="onboarding-container">
        <!-- Progress indicator -->
        <div class="step-indicators">
          @for (step of steps; track step.id; let i = $index) {
            <div
              class="step-dot"
              [class.active]="i === currentStep()"
              [class.completed]="i < (currentStep() ?? 0)"
            ></div>
          }
        </div>

        <!-- Step content -->
        <div class="step-content">
          @switch (currentStep()) {
            @case (0) { <app-welcome-step (next)="next()" (skip)="skip()" /> }
            @case (1) { <app-preferences-step (next)="next()" (back)="back()" /> }
            @case (2) { <app-connection-step (next)="next()" (back)="back()" /> }
            @case (3) { <app-tour-step (startTour)="startTour()" (skip)="finish()" /> }
          }
        </div>

        <!-- The welcome step already owns its skip action. -->
        @if (currentStep() !== 0) {
          <button class="skip-all-btn" (click)="skip()">
            {{ 'onboarding.skipAll' | translate }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './onboarding-overlay.component.scss',
})
export class OnboardingOverlayComponent {
  private readonly onboarding = inject(OnboardingService);

  readonly steps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'connection', label: 'Connection' },
    { id: 'tour', label: 'Tour' },
  ];

  readonly currentStep: Signal<number | undefined> = toSignal(
    this.onboarding.state$.pipe(map(s => s.currentStep)),
    { initialValue: 0 }
  );

  next(): void {
    this.onboarding.nextStep();
  }

  back(): void {
    this.onboarding.prevStep();
  }

  skip(): void {
    this.onboarding.skip();
  }

  finish(): void {
    this.onboarding.markCompleted();
  }

  startTour(): void {
    this.onboarding.markCompleted();
    this.onboarding.startTour();
  }
}
