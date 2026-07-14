import { Routes } from '@angular/router';

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
