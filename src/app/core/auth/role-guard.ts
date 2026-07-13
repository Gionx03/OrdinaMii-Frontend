import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { type AppRole } from './app-role';
import { AuthService } from './auth-service';

export function roleGuard(...allowedRoles: AppRole[]): CanActivateFn {
  return async (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.authenticated()) {
      try {
        await authService.login(state.url);
      } catch (error: unknown) {
        console.error('Impossibile avviare il login.', error);
      }

      return false;
    }

    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
}
