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
import { finalize } from 'rxjs';

import { RestaurantTable, UpsertRestaurantTablePayload } from '../restaurant-table';
import { RestaurantTableApi } from '../restaurant-table-api';

type TableStatusFilter = 'true' | 'false';

@Component({
  selector: 'app-manage-tables-page',
  imports: [ReactiveFormsModule],
  templateUrl: './manage-tables-page.html',
  styleUrl: './manage-tables-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageTablesPage implements OnInit {
  private readonly tableApi = inject(RestaurantTableApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 12;

  readonly tables = signal<readonly RestaurantTable[]>([]);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly editorOpen = signal(false);
  readonly editingTable = signal<RestaurantTable | null>(null);
  readonly saving = signal(false);
  readonly deletingTableId = signal<string | null>(null);

  readonly filtersForm = new FormGroup({
    active: new FormControl<TableStatusFilter>('true', {
      nonNullable: true,
    }),
  });

  readonly editorForm = new FormGroup({
    number: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), integerValidator()],
    }),
    seats: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), integerValidator()],
    }),
  });

  readonly numberControl = this.editorForm.controls.number;
  readonly seatsControl = this.editorForm.controls.seats;

  ngOnInit(): void {
    this.loadTables();
  }

  loadTables(page = 0): void {
    const requestedPage = Math.max(0, page);
    const active = this.filtersForm.controls.active.value === 'true';

    this.loading.set(true);
    this.errorMessage.set(null);
    this.actionError.set(null);

    this.tableApi
      .getTables({
        active,
        page: requestedPage,
        size: this.pageSize,
        sort: 'number,asc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.tables.set(response.content);
          this.totalElements.set(response.totalElements);
          this.currentPage.set(response.number);
          this.totalPages.set(response.totalPages);
          this.firstPage.set(response.first);
          this.lastPage.set(response.last);
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei tavoli.', error);

          this.resetPageState();

          this.errorMessage.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare i tavoli.'),
          );
        },
      });
  }

  applyFilters(): void {
    this.loadTables(0);
  }

  startCreate(): void {
    this.editingTable.set(null);
    this.actionError.set(null);

    this.editorForm.reset({
      number: null,
      seats: null,
    });

    this.editorOpen.set(true);
  }

  startEdit(table: RestaurantTable): void {
    this.editingTable.set(table);
    this.actionError.set(null);

    this.editorForm.reset({
      number: table.number,
      seats: table.seats,
    });

    this.editorOpen.set(true);
  }

  closeEditor(): void {
    if (this.saving()) {
      return;
    }

    this.editorOpen.set(false);
    this.editingTable.set(null);
    this.editorForm.reset();
  }

  saveTable(): void {
    this.actionError.set(null);

    if (this.saving()) {
      return;
    }

    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const { number, seats } = this.editorForm.getRawValue();

    if (number === null || seats === null) {
      return;
    }

    const request: UpsertRestaurantTablePayload = {
      number,
      seats,
    };

    const editingTable = this.editingTable();

    const operation = editingTable
      ? this.tableApi.updateTable(editingTable.id, request)
      : this.tableApi.createTable(request);

    this.saving.set(true);

    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editorOpen.set(false);
          this.editingTable.set(null);

          this.loadTables(editingTable ? this.currentPage() : 0);
        },
        error: (error: unknown) => {
          console.error('Errore durante il salvataggio del tavolo.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile salvare il tavolo.'),
          );
        },
      });
  }

  disableTable(table: RestaurantTable): void {
    if (!table.active || this.deletingTableId()) {
      return;
    }

    const confirmed = window.confirm(`Vuoi disattivare il tavolo ${table.number}?`);

    if (!confirmed) {
      return;
    }

    this.deletingTableId.set(table.id);
    this.actionError.set(null);

    this.tableApi
      .deleteTable(table.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingTableId.set(null)),
      )
      .subscribe({
        next: () => {
          this.loadTables(this.currentPage());
        },
        error: (error: unknown) => {
          console.error('Errore durante la disattivazione del tavolo.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile disattivare il tavolo.'),
          );
        },
      });
  }

  goToPreviousPage(): void {
    if (!this.firstPage() && !this.loading()) {
      this.loadTables(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (!this.lastPage() && !this.loading()) {
      this.loadTables(this.currentPage() + 1);
    }
  }

  private resetPageState(): void {
    this.tables.set([]);
    this.totalElements.set(0);
    this.currentPage.set(0);
    this.totalPages.set(0);
    this.firstPage.set(true);
    this.lastPage.set(true);
  }
}

function integerValidator(): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    const value = control.value;

    return value === null || Number.isInteger(value) ? null : { integer: true };
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
