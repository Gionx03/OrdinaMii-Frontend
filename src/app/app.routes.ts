import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'menu',
  },
  {
    path: 'menu',
    title: 'Menu | OrdinaMii',
    loadComponent: () =>
      import('./features/menu/menu-page/menu-page').then(({ MenuPage }) => MenuPage),
  },
  {
    path: 'profile',
    title: 'Area personale | OrdinaMii',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile-page/profile-page').then(({ ProfilePage }) => ProfilePage),
  },
  {
    path: 'forbidden',
    title: 'Accesso negato | OrdinaMii',
    loadComponent: () =>
      import('./features/system/forbidden-page/forbidden-page').then(
        ({ ForbiddenPage }) => ForbiddenPage,
      ),
  },
  {
    path: '**',
    title: 'Pagina non trovata | OrdinaMii',
    loadComponent: () =>
      import('./features/system/not-found-page/not-found-page').then(
        ({ NotFoundPage }) => NotFoundPage,
      ),
  },
];
