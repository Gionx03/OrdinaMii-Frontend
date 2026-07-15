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
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, startWith } from 'rxjs';

import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import { UserLight } from '../../users/user';
import { UserApi } from '../../users/user-api';
import { CreateStaffReservationRequest, Reservation } from '../reservation';
import { ReservationApi } from '../reservation-api';

@Component({
  selector: 'app-create-staff-reservation-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './create-staff-reservation-page.html',
  styleUrl: './create-staff-reservation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateStaffReservationPage implements OnInit {
  private readonly reservationApi = inject(ReservationApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly userApi = inject(UserApi);

  private readonly destroyRef = inject(DestroyRef);

  readonly today = toLocalIsoDate(new Date());

  readonly customers = signal<readonly UserLight[]>([]);

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly numberOfPeople = signal(2);

  readonly loadingOptions = signal(true);

  readonly optionsError = signal<string | null>(null);

  readonly submitting = signal(false);

  readonly submitError = signal<string | null>(null);

  readonly createdReservation = signal<Reservation | null>(null);

  readonly availableTables = computed(() => {
    const requiredSeats = this.numberOfPeople();

    return this.tables().filter((table) => table.active && table.seats >= requiredSeats);
  });

  readonly reservationForm = new FormGroup({
    userId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

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
      validators: [Validators.required, Validators.min(1), integerValidator()],
    }),

    tableId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly userIdControl = this.reservationForm.controls.userId;

  readonly dateControl = this.reservationForm.controls.date;

  readonly timeControl = this.reservationForm.controls.time;

  readonly peopleControl = this.reservationForm.controls.numberOfPeople;

  readonly tableIdControl = this.reservationForm.controls.tableId;

  ngOnInit(): void {
    this.observeNumberOfPeople();
    this.loadOptions();
  }

  loadOptions(): void {
    this.loadingOptions.set(true);
    this.optionsError.set(null);

    forkJoin({
      customers: this.userApi.getCustomers({
        page: 0,
        size: 200,
        sort: 'username,asc',
      }),

      tables: this.tableApi.getActiveTables(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingOptions.set(false)),
      )
      .subscribe({
        next: ({ customers, tables }) => {
          this.customers.set(customers.content);

          this.tables.set(tables.content);

          this.clearInvalidSelections();
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento di clienti e tavoli.', error);

          this.customers.set([]);
          this.tables.set([]);

          this.optionsError.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare clienti e tavoli.'),
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

    const selectedCustomerExists = this.customers().some(
      (customer) => customer.id === this.userIdControl.value,
    );

    if (this.userIdControl.value && !selectedCustomerExists) {
      this.userIdControl.setErrors({
        unavailable: true,
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

    const request: CreateStaffReservationRequest = {
      userId: formValue.userId,
      date: formValue.date,
      time: formValue.time,
      numberOfPeople: formValue.numberOfPeople,
      tableId: formValue.tableId,
    };

    this.submitting.set(true);

    this.reservationApi
      .createReservation(request)
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
          console.error('Errore durante la creazione della prenotazione staff.', error);

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
      userId: '',
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

  private clearInvalidSelections(): void {
    const selectedCustomerId = this.userIdControl.value;

    const customerStillAvailable = this.customers().some(
      (customer) => customer.id === selectedCustomerId,
    );

    if (selectedCustomerId && !customerStillAvailable) {
      this.userIdControl.setValue('');
    }

    this.clearInvalidTableSelection();
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
