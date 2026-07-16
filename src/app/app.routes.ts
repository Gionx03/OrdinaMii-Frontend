import { Routes } from '@angular/router';

import { APP_ROLE } from './core/auth/app-role';
import { authGuard } from './core/auth/auth-guard';
import { roleGuard } from './core/auth/role-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'OrdinaMii',
    loadComponent: () =>
      import('./features/home/home-page/home-page').then(({ HomePage }) => HomePage),
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
    path: 'reservations/new',
    title: 'Prenota un tavolo | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CLIENTE)],
    loadComponent: () =>
      import('./features/reservations/create-reservation-page/create-reservation-page').then(
        ({ CreateReservationPage }) => CreateReservationPage,
      ),
  },
  {
    path: 'my-reservations',
    title: 'Le mie prenotazioni | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CLIENTE)],
    loadComponent: () =>
      import('./features/reservations/my-reservations-page/my-reservations-page').then(
        ({ MyReservationsPage }) => MyReservationsPage,
      ),
  },
  {
    path: 'assistance',
    title: 'Richiedi assistenza | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CLIENTE)],
    loadComponent: () =>
      import('./features/assistance-request/request-assistance-page/request-assistance-page').then(
        ({ RequestAssistancePage }) => RequestAssistancePage,
      ),
  },
  {
    path: 'staff',
    pathMatch: 'full',
    title: 'Pannello staff | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CUOCO, APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/staff/staff-dashboard-page/staff-dashboard-page').then(
        ({ StaffDashboardPage }) => StaffDashboardPage,
      ),
  },
  {
    path: 'staff/assistance',
    title: 'Gestione assistenza | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/assistance-request/manage-assistance-page/manage-assistance-page').then(
        ({ ManageAssistancePage }) => ManageAssistancePage,
      ),
  },
  {
    path: 'staff/orders/new',
    title: 'Nuovo ordine | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/orders/create-staff-order-page/create-staff-order-page').then(
        ({ CreateStaffOrderPage }) => CreateStaffOrderPage,
      ),
  },
  {
    path: 'staff/orders/:id/edit',
    title: 'Modifica ordine | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/orders/edit-staff-order-page/edit-staff-order-page').then(
        ({ EditStaffOrderPage }) => EditStaffOrderPage,
      ),
  },
  {
    path: 'staff/orders',
    title: 'Gestione ordini | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CUOCO, APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/orders/manage-orders-page/manage-orders-page').then(
        ({ ManageOrdersPage }) => ManageOrdersPage,
      ),
  },

  {
    path: 'staff/reservations/new',
    title: 'Nuova prenotazione | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/reservations/create-staff-reservation-page/create-staff-reservation-page').then(
        ({ CreateStaffReservationPage }) => CreateStaffReservationPage,
      ),
  },
  {
    path: 'staff/reservations/:id/edit',
    title: 'Modifica prenotazione | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/reservations/edit-staff-reservation-page/edit-staff-reservation-page').then(
        ({ EditStaffReservationPage }) => EditStaffReservationPage,
      ),
  },
  {
    path: 'staff/reservations',
    title: 'Gestione prenotazioni | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/reservations/manage-reservations-page/manage-reservations-page').then(
        ({ ManageReservationsPage }) => ManageReservationsPage,
      ),
  },
  {
    path: 'staff/dishes',
    title: 'Gestione piatti | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.CUOCO, APP_ROLE.CAMERIERE, APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/dishes/manage-dishes-page/manage-dishes-page').then(
        ({ ManageDishesPage }) => ManageDishesPage,
      ),
  },
  {
    path: 'staff/tables',
    title: 'Gestione tavoli | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/tables/manage-tables-page/manage-tables-page').then(
        ({ ManageTablesPage }) => ManageTablesPage,
      ),
  },

  {
    path: 'staff/users',
    title: 'Gestione utenti | OrdinaMii',
    canActivate: [roleGuard(APP_ROLE.ADMIN)],
    loadComponent: () =>
      import('./features/users/manage-users-page/manage-users-page').then(
        ({ ManageUsersPage }) => ManageUsersPage,
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
