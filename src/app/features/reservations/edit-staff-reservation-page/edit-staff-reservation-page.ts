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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, startWith } from 'rxjs';

import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import {
  Reservation,
  RESERVATION_STATUS,
  RESERVATION_STATUS_LABELS,
  UpdateStaffReservationRequest,
} from '../reservation';
import { ReservationApi } from '../reservation-api';

@Component({
  selector: 'app-edit-staff-reservation-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-staff-reservation-page.html',
  styleUrl: './edit-staff-reservation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditStaffReservationPage implements OnInit {
  private readonly reservationApi = inject(ReservationApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  private readonly reservationId = this.route.snapshot.paramMap.get('id');

  readonly today = toLocalIsoDate(new Date());

  readonly statusLabels = RESERVATION_STATUS_LABELS;

  readonly reservation = signal<Reservation | null>(null);

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly numberOfPeople = signal(1);

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly submitting = signal(false);

  readonly submitError = signal<string | null>(null);

  readonly updatedReservation = signal<Reservation | null>(null);

  readonly canEdit = computed(() => this.reservation()?.status === RESERVATION_STATUS.CONFIRMED);

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

    numberOfPeople: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), integerValidator()],
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

    if (!this.reservationId) {
      this.loading.set(false);

      this.loadError.set('Identificativo della prenotazione non valido.');

      return;
    }

    this.loadReservation();
  }

  loadReservation(): void {
    if (!this.reservationId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.submitError.set(null);

    forkJoin({
      reservation: this.reservationApi.getReservationById(this.reservationId),

      tables: this.tableApi.getActiveTables(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ reservation, tables }) => {
          this.reservation.set(reservation);

          this.tables.set(tables.content);

          this.reservationForm.reset({
            date: reservation.date,

            time: normalizeTime(reservation.time),

            numberOfPeople: reservation.numberOfPeople,

            tableId: reservation.table.id,
          });

          this.clearInvalidTableSelection();
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento della prenotazione.', error);

          this.reservation.set(null);
          this.tables.set([]);

          this.loadError.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare la prenotazione.'),
          );
        },
      });
  }

  submitChanges(): void {
    this.submitError.set(null);

    const reservation = this.reservation();

    if (!reservation || !this.reservationId || !this.canEdit()) {
      return;
    }

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

    const request: UpdateStaffReservationRequest = {
      userId: reservation.user.id,

      date: formValue.date,

      time: formValue.time,

      numberOfPeople: formValue.numberOfPeople,

      tableId: formValue.tableId,
    };

    this.submitting.set(true);

    this.reservationApi
      .updateReservation(this.reservationId, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (updatedReservation) => {
          this.reservation.set(updatedReservation);

          this.updatedReservation.set(updatedReservation);

          this.reservationForm.disable();
        },

        error: (error: unknown) => {
          console.error('Errore durante la modifica della prenotazione.', error);

          this.submitError.set(
            getApiErrorMessage(error, 'Non è stato possibile modificare la prenotazione.'),
          );
        },
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

function integerValidator(): ValidatorFn {
  return (control: AbstractControl<number>): ValidationErrors | null =>
    Number.isInteger(control.value) ? null : { integer: true };
}

function normalizeTime(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
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
