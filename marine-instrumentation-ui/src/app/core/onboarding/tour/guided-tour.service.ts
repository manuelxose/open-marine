import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { OnboardingService } from '../onboarding.service';
import { TOUR_STEPS, TourStep } from './tour-steps';

@Injectable({ providedIn: 'root' })
export class GuidedTourService {
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingService);

  private readonly _currentStepIndex = new BehaviorSubject<number>(0);
  private readonly _isActive = new BehaviorSubject<boolean>(false);

  readonly currentStepIndex$ = this._currentStepIndex.asObservable();
  readonly isActive$ = this._isActive.asObservable();
  readonly totalSteps = TOUR_STEPS.length;

  readonly currentStep$ = this._currentStepIndex.pipe(
    map(i => TOUR_STEPS[i] ?? null)
  );

  readonly progress$ = this._currentStepIndex.pipe(
    map(i => ({ current: i + 1, total: this.totalSteps }))
  );

  async start(): Promise<void> {
    this._currentStepIndex.next(0);
    this._isActive.next(true);
    const firstStep = TOUR_STEPS[0];
    if (!firstStep) {
      this.end();
      return;
    }
    await this.navigateToStep(firstStep);
  }

  async next(): Promise<void> {
    const nextIndex = this._currentStepIndex.value + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      this.end();
      return;
    }
    const nextStep = TOUR_STEPS[nextIndex];
    if (!nextStep) {
      this.end();
      return;
    }
    this._currentStepIndex.next(nextIndex);
    await this.navigateToStep(nextStep);
  }

  async prev(): Promise<void> {
    const prevIndex = Math.max(0, this._currentStepIndex.value - 1);
    const prevStep = TOUR_STEPS[prevIndex];
    if (!prevStep) {
      this.end();
      return;
    }
    this._currentStepIndex.next(prevIndex);
    await this.navigateToStep(prevStep);
  }

  end(): void {
    this._isActive.next(false);
    this._currentStepIndex.next(0);
    this.onboarding.endTour();
  }

  private async navigateToStep(step: TourStep): Promise<void> {
    if (step.route) {
      await this.router.navigate([step.route]);
      // Wait for the component to render
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (step.beforeShow) {
      await step.beforeShow();
    }
  }
}
