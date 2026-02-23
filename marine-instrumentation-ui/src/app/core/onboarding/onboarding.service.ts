import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

const ONBOARDING_KEY = 'omi-onboarding-completed';
const TOUR_ENABLED_KEY = 'omi-tour-enabled';

export interface OnboardingState {
  completed: boolean;
  tourEnabled: boolean;
  currentStep: number;
  tourActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly state = new BehaviorSubject<OnboardingState>({
    completed: this.loadCompleted(),
    tourEnabled: this.loadTourEnabled(),
    currentStep: 0,
    tourActive: false,
  });

  readonly state$ = this.state.asObservable();
  readonly shouldShowOnboarding$ = this.state$.pipe(map(s => !s.completed));
  readonly isTourActive$ = this.state$.pipe(map(s => s.tourActive));

  get snapshot(): OnboardingState {
    return this.state.value;
  }

  nextStep(): void {
    const current = this.state.value;
    this.state.next({ ...current, currentStep: current.currentStep + 1 });
  }

  prevStep(): void {
    const current = this.state.value;
    if (current.currentStep > 0) {
      this.state.next({ ...current, currentStep: current.currentStep - 1 });
    }
  }

  skip(): void {
    this.markCompleted();
  }

  markCompleted(): void {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    this.state.next({ ...this.state.value, completed: true, tourActive: false });
  }

  startTour(): void {
    this.state.next({ ...this.state.value, tourActive: true });
  }

  endTour(): void {
    this.state.next({ ...this.state.value, tourActive: false });
    if (!this.state.value.completed) {
      this.markCompleted();
    }
  }

  setTourEnabled(enabled: boolean): void {
    localStorage.setItem(TOUR_ENABLED_KEY, JSON.stringify(enabled));
    this.state.next({ ...this.state.value, tourEnabled: enabled });
    if (enabled) {
      this.startTour();
    }
  }

  reset(): void {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(TOUR_ENABLED_KEY);
    this.state.next({
      completed: false,
      tourEnabled: false,
      currentStep: 0,
      tourActive: false,
    });
  }

  private loadCompleted(): boolean {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  }

  private loadTourEnabled(): boolean {
    try {
      return JSON.parse(localStorage.getItem(TOUR_ENABLED_KEY) || 'false');
    } catch {
      return false;
    }
  }
}
