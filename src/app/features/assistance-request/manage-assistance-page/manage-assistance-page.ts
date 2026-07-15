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
  AssistanceRequest,
  AssistanceRequestStatus,
  ASSISTANCE_REQUEST_STATUS,
  ASSISTANCE_REQUEST_STATUSES,
  ASSISTANCE_REQUEST_STATUS_LABELS,
} from '../assistance-request';
import { AssistanceRequestApi } from '../assistance-request-api';

@Component({
  selector: 'app-manage-assistance-page',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './manage-assistance-page.html',
  styleUrl: './manage-assistance-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageAssistancePage implements OnInit {
  private readonly assistanceApi = inject(AssistanceRequestApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly destroyRef = inject(DestroyRef);

  private readonly pageSize = 10;

  readonly status = ASSISTANCE_REQUEST_STATUS;

  readonly statusOptions = ASSISTANCE_REQUEST_STATUSES;

  readonly statusLabels = ASSISTANCE_REQUEST_STATUS_LABELS;

  readonly requests = signal<readonly AssistanceRequest[]>([]);

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

  readonly updatingRequestId = signal<string | null>(null);

  readonly actionError = signal<string | null>(null);

  readonly filtersForm = new FormGroup({
    status: new FormControl<AssistanceRequestStatus | ''>('', {
      nonNullable: true,
    }),

    tableId: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadTables();
    this.loadRequests();
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

  loadRequests(page = 0): void {
    const requestedPage = Math.max(0, page);

    const filters = this.filtersForm.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);
    this.actionError.set(null);

    this.assistanceApi
      .getAssistanceRequests({
        status: filters.status || undefined,

        tableId: filters.tableId || undefined,

        page: requestedPage,
        size: this.pageSize,
        sort: 'createdAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.requests.set(response.content);

          this.totalElements.set(response.totalElements);

          this.currentPage.set(response.number);

          this.totalPages.set(response.totalPages);

          this.firstPage.set(response.first);

          this.lastPage.set(response.last);
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento delle richieste.', error);

          this.resetPageState();

          this.errorMessage.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare le richieste di assistenza.'),
          );
        },
      });
  }

  applyFilters(): void {
    this.loadRequests(0);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadRequests(0);
  }

  updateStatus(requestId: string, newStatus: AssistanceRequestStatus): void {
    if (this.updatingRequestId()) {
      return;
    }

    this.updatingRequestId.set(requestId);

    this.actionError.set(null);

    this.assistanceApi
      .updateAssistanceRequestStatus(requestId, newStatus)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingRequestId.set(null)),
      )
      .subscribe({
        next: (updatedRequest) => {
          const selectedStatus = this.filtersForm.controls.status.value;

          if (selectedStatus && selectedStatus !== updatedRequest.status) {
            this.loadRequests(this.currentPage());

            return;
          }

          this.requests.update((requests) =>
            requests.map((request) =>
              request.id === updatedRequest.id ? updatedRequest : request,
            ),
          );
        },

        error: (error: unknown) => {
          console.error('Errore durante l’aggiornamento della richiesta.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile aggiornare la richiesta.'),
          );
        },
      });
  }

  goToPreviousPage(): void {
    if (!this.firstPage() && !this.loading()) {
      this.loadRequests(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (!this.lastPage() && !this.loading()) {
      this.loadRequests(this.currentPage() + 1);
    }
  }

  private resetPageState(): void {
    this.requests.set([]);
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
