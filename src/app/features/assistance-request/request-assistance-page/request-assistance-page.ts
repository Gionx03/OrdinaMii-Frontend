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
import { finalize } from 'rxjs';

import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import {
  AssistanceRequest,
  ASSISTANCE_REQUEST_STATUS_LABELS,
  CreateAssistanceRequestPayload,
} from '../assistance-request';
import { AssistanceRequestApi } from '../assistance-request-api';

@Component({
  selector: 'app-request-assistance-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './request-assistance-page.html',
  styleUrl: './request-assistance-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestAssistancePage implements OnInit {
  private readonly assistanceApi = inject(AssistanceRequestApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly destroyRef = inject(DestroyRef);

  readonly quickMessages = [
    'Vorrei ordinare',
    'Avrei bisogno del conto',
    'Manca qualcosa al tavolo',
    'Ho bisogno di assistenza',
  ] as const;

  readonly statusLabels = ASSISTANCE_REQUEST_STATUS_LABELS;

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly loadingTables = signal(true);

  readonly tablesError = signal<string | null>(null);

  readonly submitting = signal(false);

  readonly submitError = signal<string | null>(null);

  readonly createdRequest = signal<AssistanceRequest | null>(null);

  readonly assistanceForm = new FormGroup({
    tableId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator()],
    }),
  });

  readonly tableIdControl = this.assistanceForm.controls.tableId;

  readonly messageControl = this.assistanceForm.controls.message;

  ngOnInit(): void {
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

  useQuickMessage(message: string): void {
    this.messageControl.setValue(message);
    this.messageControl.markAsTouched();
  }

  submitAssistanceRequest(): void {
    this.submitError.set(null);

    if (this.submitting()) {
      return;
    }

    if (this.assistanceForm.invalid) {
      this.assistanceForm.markAllAsTouched();
      return;
    }

    const formValue = this.assistanceForm.getRawValue();

    const request: CreateAssistanceRequestPayload = {
      tableId: formValue.tableId,
      message: formValue.message.trim(),
    };

    this.submitting.set(true);

    this.assistanceApi
      .createAssistanceRequest(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (createdRequest) => {
          this.createdRequest.set(createdRequest);

          this.assistanceForm.disable();
        },

        error: (error: unknown) => {
          console.error('Errore durante l’invio della richiesta.', error);

          this.submitError.set(
            getApiErrorMessage(error, 'Non è stato possibile inviare la richiesta.'),
          );
        },
      });
  }

  createAnotherRequest(): void {
    this.createdRequest.set(null);
    this.submitError.set(null);

    this.assistanceForm.enable();

    this.assistanceForm.reset({
      tableId: '',
      message: '',
    });
  }
}

function nonBlankValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    return control.value.trim().length > 0 ? null : { blank: true };
  };
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
