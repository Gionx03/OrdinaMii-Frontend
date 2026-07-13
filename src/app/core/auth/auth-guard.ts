import { inject } from '@angular/core';
import { type CanActivateFn } from '@angular/router';

import { AuthService } from './auth-service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);

  if (authService.authenticated()) {
    return true;
  }

  try {
    await authService.login(state.url);
  } catch (error: unknown) {
    console.error('Impossibile avviare il login.', error);
  }

  return false;
};
