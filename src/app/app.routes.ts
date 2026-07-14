import { Routes } from '@angular/router';

import { APP_ROLE } from './core/auth/app-role';
import { authGuard } from './core/auth/auth-guard';
import { roleGuard } from './core/auth/role-guard';

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
    path: 'cart',
    title: 'Carrello | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CLIENTE)],
    loadComponent: () =>
      import('./features/cart/cart-page/cart-page').then(({ CartPage }) => CartPage),
  },
  {
    path: 'checkout',
    title: 'Conferma ordine | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CLIENTE)],
    loadComponent: () =>
      import('./features/checkout/checkout-page/checkout-page').then(
        ({ CheckoutPage }) => CheckoutPage,
      ),
  },
  {
    path: 'my-orders',
    title: 'I miei ordini | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CLIENTE)],
    loadComponent: () =>
      import('./features/orders/my-orders-page/my-orders-page').then(
        ({ MyOrdersPage }) => MyOrdersPage,
      ),
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
