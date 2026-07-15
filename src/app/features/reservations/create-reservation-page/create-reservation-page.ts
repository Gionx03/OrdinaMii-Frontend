import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, startWith } from 'rxjs';

import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import { CreateMyReservationRequest, Reservation } from '../reservation';
import { ReservationApi } from '../reservation-api';

@Component({
  selector: 'app-create-reservation-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './create-reservation-page.html',
  styleUrl: './create-reservation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateReservationPage implements OnInit {
  private readonly reservationApi = inject(ReservationApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly destroyRef = inject(DestroyRef);

  readonly today = toLocalIsoDate(new Date());

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly numberOfPeople = signal(2);

  readonly loadingTables = signal(true);

  readonly tablesError = signal<string | null>(null);

  readonly submitting = signal(false);

  readonly submitError = signal<string | null>(null);

  readonly createdReservation = signal<Reservation | null>(null);

  readonly availableTables = computed(() => {
    const requiredSeats = this.numberOfPeople();

    return this.tables().filter((table) => table.active && table.seats >= requiredSeats);
  });

  readonly reservationForm = new FormGroup({
    date: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    time: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    numberOfPeople: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),

    tableId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly dateControl = this.reservationForm.controls.date;

  readonly timeControl = this.reservationForm.controls.time;

  readonly peopleControl = this.reservationForm.controls.numberOfPeople;

  readonly tableIdControl = this.reservationForm.controls.tableId;

  ngOnInit(): void {
    this.observeNumberOfPeople();
    this.loadTables();
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

          this.clearInvalidTableSelection();
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei tavoli.', error);

          this.tables.set([]);

          this.tablesError.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare i tavoli.'),
          );
        },
      });
  }

  submitReservation(): void {
    this.submitError.set(null);

    if (this.submitting()) {
      return;
    }

    if (this.dateControl.value < this.today) {
      this.dateControl.setErrors({
        pastDate: true,
      });
    }

    const selectedTableExists = this.availableTables().some(
      (table) => table.id === this.tableIdControl.value,
    );

    if (this.tableIdControl.value && !selectedTableExists) {
      this.tableIdControl.setErrors({
        unavailable: true,
      });
    }

    if (this.reservationForm.invalid) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    const formValue = this.reservationForm.getRawValue();

    const request: CreateMyReservationRequest = {
      date: formValue.date,
      time: formValue.time,
      numberOfPeople: formValue.numberOfPeople,
      tableId: formValue.tableId,
    };

    this.submitting.set(true);

    this.reservationApi
      .createMyReservation(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (reservation) => {
          this.createdReservation.set(reservation);

          this.reservationForm.disable();
        },

        error: (error: unknown) => {
          console.error('Errore durante la creazione della prenotazione.', error);

          this.submitError.set(
            getApiErrorMessage(error, 'Non è stato possibile creare la prenotazione.'),
          );
        },
      });
  }

  createAnotherReservation(): void {
    this.createdReservation.set(null);
    this.submitError.set(null);

    this.reservationForm.enable();

    this.reservationForm.reset({
      date: '',
      time: '',
      numberOfPeople: 2,
      tableId: '',
    });
  }

  private observeNumberOfPeople(): void {
    this.peopleControl.valueChanges
      .pipe(startWith(this.peopleControl.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((numberOfPeople) => {
        this.numberOfPeople.set(Math.max(1, numberOfPeople));

        this.clearInvalidTableSelection();
      });
  }

  private clearInvalidTableSelection(): void {
    const selectedTableId = this.tableIdControl.value;

    const tableStillAvailable = this.availableTables().some(
      (table) => table.id === selectedTableId,
    );

    if (selectedTableId && !tableStillAvailable) {
      this.tableIdControl.setValue('');
    }
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

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
