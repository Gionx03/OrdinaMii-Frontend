import { DatePipe } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Reservation, RESERVATION_STATUS_LABELS } from '../reservation';
import { ReservationApi } from '../reservation-api';

@Component({
  selector: 'app-my-reservations-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './my-reservations-page.html',
  styleUrl: './my-reservations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyReservationsPage implements OnInit {
  private readonly reservationApi = inject(ReservationApi);

  private readonly destroyRef = inject(DestroyRef);

  private readonly pageSize = 10;

  readonly statusLabels = RESERVATION_STATUS_LABELS;

  readonly reservations = signal<readonly Reservation[]>([]);

  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  readonly filtersForm = new FormGroup({
    startDate: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(page = 0): void {
    const requestedPage = Math.max(0, page);

    const filters = this.filtersForm.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.reservationApi
      .getMyReservations({
        startDate: filters.startDate || undefined,
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

          this.reservations.set([]);
          this.totalElements.set(0);
          this.currentPage.set(0);
          this.totalPages.set(0);
          this.firstPage.set(true);
          this.lastPage.set(true);

          this.errorMessage.set('Non è stato possibile caricare le tue prenotazioni.');
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
}
