import { DatePipe } from '@angular/common';
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
import { finalize } from 'rxjs';

import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import {
  Reservation,
  ReservationStatus,
  RESERVATION_STATUS,
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABELS,
} from '../reservation';
import { ReservationApi } from '../reservation-api';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-manage-reservations-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './manage-reservations-page.html',
  styleUrl: './manage-reservations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageReservationsPage implements OnInit {
  private readonly reservationApi = inject(ReservationApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly destroyRef = inject(DestroyRef);

  private readonly pageSize = 10;

  readonly status = RESERVATION_STATUS;

  readonly statusOptions = RESERVATION_STATUSES;

  readonly statusLabels = RESERVATION_STATUS_LABELS;

  readonly reservations = signal<readonly Reservation[]>([]);

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);
  readonly loadingTables = signal(true);

  readonly errorMessage = signal<string | null>(null);

  readonly tablesError = signal<string | null>(null);

  readonly updatingReservationId = signal<string | null>(null);

  readonly actionError = signal<string | null>(null);

  readonly filtersForm = new FormGroup({
    status: new FormControl<ReservationStatus | ''>('', {
      nonNullable: true,
    }),

    tableId: new FormControl('', {
      nonNullable: true,
    }),

    date: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadTables();
    this.loadReservations();
  }

  loadTables(): void {
    this.loadingTables.set(true);
    this.tablesError.set(null);

    this.tableApi
      .getActiveTables()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingTables.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.tables.set(response.content);
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei tavoli.', error);

          this.tables.set([]);

          this.tablesError.set(
            getApiErrorMessage(error, 'Filtro tavoli temporaneamente non disponibile.'),
          );
        },
      });
  }

  loadReservations(page = 0): void {
    const requestedPage = Math.max(0, page);

    const filters = this.filtersForm.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);
    this.actionError.set(null);

    this.reservationApi
      .getReservations({
        status: filters.status || undefined,

        tableId: filters.tableId || undefined,

        date: filters.date || undefined,

        page: requestedPage,
        size: this.pageSize,
        sort: 'date,asc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.reservations.set(response.content);

          this.totalElements.set(response.totalElements);

          this.currentPage.set(response.number);

          this.totalPages.set(response.totalPages);

          this.firstPage.set(response.first);

          this.lastPage.set(response.last);
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento delle prenotazioni.', error);

          this.resetPageState();

          this.errorMessage.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare le prenotazioni.'),
          );
        },
      });
  }

  applyFilters(): void {
    this.loadReservations(0);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadReservations(0);
  }

  canComplete(reservation: Reservation): boolean {
    return getReservationDateTime(reservation).getTime() <= Date.now();
  }

  updateStatus(reservationId: string, status: ReservationStatus): void {
    if (this.updatingReservationId()) {
      return;
    }

    this.updatingReservationId.set(reservationId);

    this.actionError.set(null);

    this.reservationApi
      .updateReservationStatus(reservationId, status)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingReservationId.set(null)),
      )
      .subscribe({
        next: (updatedReservation) => {
          const selectedStatus = this.filtersForm.controls.status.value;

          if (selectedStatus && selectedStatus !== updatedReservation.status) {
            this.loadReservations(this.currentPage());

            return;
          }

          this.reservations.update((reservations) =>
            reservations.map((reservation) =>
              reservation.id === updatedReservation.id ? updatedReservation : reservation,
            ),
          );
        },

        error: (error: unknown) => {
          console.error('Errore durante l’aggiornamento della prenotazione.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile aggiornare la prenotazione.'),
          );
        },
      });
  }

  goToPreviousPage(): void {
    if (!this.firstPage() && !this.loading()) {
      this.loadReservations(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (!this.lastPage() && !this.loading()) {
      this.loadReservations(this.currentPage() + 1);
    }
  }

  private resetPageState(): void {
    this.reservations.set([]);
    this.totalElements.set(0);
    this.currentPage.set(0);
    this.totalPages.set(0);
    this.firstPage.set(true);
    this.lastPage.set(true);
  }
}

function getReservationDateTime(reservation: Reservation): Date {
  const normalizedTime =
    reservation.time.length === 5 ? `${reservation.time}:00` : reservation.time;

  return new Date(`${reservation.date}T${normalizedTime}`);
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
