import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { APP_ROLES, type AppRole } from '../../../core/auth/app-role';
import {
  Order,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../orders/order';
import { Reservation, RESERVATION_STATUS_LABELS } from '../../reservations/reservation';
import { AppUser, USER_ROLE_LABELS } from '../user';
import { UserApi } from '../user-api';

@Component({
  selector: 'app-manage-users-page',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './manage-users-page.html',
  styleUrl: './manage-users-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsersPage implements OnInit {
  private readonly userApi = inject(UserApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 12;

  readonly roles = APP_ROLES;
  readonly roleLabels = USER_ROLE_LABELS;

  readonly orderStatusLabels = ORDER_STATUS_LABELS;

  readonly orderTypeLabels = ORDER_TYPE_LABELS;

  readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;

  readonly reservationStatusLabels = RESERVATION_STATUS_LABELS;

  readonly users = signal<readonly AppUser[]>([]);

  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedUser = signal<AppUser | null>(null);

  readonly userOrders = signal<readonly Order[]>([]);

  readonly userReservations = signal<readonly Reservation[]>([]);

  readonly detailsLoading = signal(false);

  readonly detailsError = signal<string | null>(null);

  readonly filtersForm = new FormGroup({
    role: new FormControl<AppRole | ''>('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(page = 0): void {
    const requestedPage = Math.max(0, page);
    const role = this.filtersForm.controls.role.value;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.closeDetails();

    this.userApi
      .getUsers({
        role: role || undefined,
        page: requestedPage,
        size: this.pageSize,
        sort: 'username,asc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.users.set(response.content);
          this.totalElements.set(response.totalElements);
          this.currentPage.set(response.number);
          this.totalPages.set(response.totalPages);
          this.firstPage.set(response.first);
          this.lastPage.set(response.last);
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento degli utenti.', error);

          this.resetPageState();

          this.errorMessage.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare gli utenti.'),
          );
        },
      });
  }

  applyFilters(): void {
    this.loadUsers(0);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadUsers(0);
  }

  openDetails(user: AppUser): void {
    if (this.detailsLoading()) {
      return;
    }

    this.selectedUser.set(user);
    this.userOrders.set([]);
    this.userReservations.set([]);
    this.detailsError.set(null);
    this.detailsLoading.set(true);

    forkJoin({
      user: this.userApi.getUserById(user.id),

      orders: this.userApi.getUserOrders(user.id, {
        page: 0,
        size: 5,
        sort: 'orderDate,desc',
      }),

      reservations: this.userApi.getUserReservations(user.id, {
        page: 0,
        size: 5,
        sort: 'date,desc',
      }),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.detailsLoading.set(false)),
      )
      .subscribe({
        next: ({ user: detailedUser, orders, reservations }) => {
          this.selectedUser.set(detailedUser);
          this.userOrders.set(orders.content);

          this.userReservations.set(reservations.content);
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei dettagli utente.', error);

          this.detailsError.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare lo storico dell’utente.'),
          );
        },
      });
  }

  closeDetails(): void {
    this.selectedUser.set(null);
    this.userOrders.set([]);
    this.userReservations.set([]);
    this.detailsError.set(null);
  }

  goToPreviousPage(): void {
    if (!this.firstPage() && !this.loading()) {
      this.loadUsers(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (!this.lastPage() && !this.loading()) {
      this.loadUsers(this.currentPage() + 1);
    }
  }

  private resetPageState(): void {
    this.users.set([]);
    this.totalElements.set(0);
    this.currentPage.set(0);
    this.totalPages.set(0);
    this.firstPage.set(true);
    this.lastPage.set(true);
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof HttpErrorResponse &&
    isRecord(error.error) &&
    typeof error.error['message'] === 'string'
  ) {
    return error.error['message'];
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
