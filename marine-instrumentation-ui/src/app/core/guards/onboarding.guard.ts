import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from '../../state/app/app-state.service';

export const onboardingGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (!appState.isOnboarded()) {
    return router.createUrlTree(['/onboarding/welcome']);
  }
  return true;
};
