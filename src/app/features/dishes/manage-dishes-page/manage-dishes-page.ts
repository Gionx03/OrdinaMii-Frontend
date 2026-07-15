import { CurrencyPipe } from '@angular/common';
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
import { finalize } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { APP_ROLE } from '../../../core/auth/app-role';
import { AuthService } from '../../../core/auth/auth-service';
import {
  Dish,
  DishCategory,
  DISH_CATEGORIES,
  DISH_CATEGORY_LABELS,
  UpsertDishPayload,
} from '../dish';
import { DishApi } from '../dish-api';

type AvailabilityFilter = 'true' | 'false';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-manage-dishes-page',
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './manage-dishes-page.html',
  styleUrl: './manage-dishes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageDishesPage implements OnInit {
  private readonly dishApi = inject(DishApi);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 12;

  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  readonly categories = DISH_CATEGORIES;
  readonly categoryLabels = DISH_CATEGORY_LABELS;

  readonly dishes = signal<readonly Dish[]>([]);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly editorOpen = signal(false);
  readonly editingDish = signal<Dish | null>(null);
  readonly saving = signal(false);
  readonly deletingDishId = signal<string | null>(null);

  readonly uploadingImage = signal(false);
  readonly imageUploadError = signal<string | null>(null);
  readonly editorImagePreviewUrl = signal<string | null>(null);

  readonly canDelete = computed(
    () => this.authService.authenticated() && this.authService.hasRole(APP_ROLE.ADMIN),
  );

  readonly filtersForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
    }),
    category: new FormControl<DishCategory | ''>('', {
      nonNullable: true,
    }),
    available: new FormControl<AvailabilityFilter>('true', {
      nonNullable: true,
    }),
  });

  readonly editorForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator()],
    }),
    description: new FormControl('', {
      nonNullable: true,
    }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    category: new FormControl<DishCategory>('ANTIPASTO', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    available: new FormControl(true, {
      nonNullable: true,
    }),
    imageUrl: new FormControl('', {
      nonNullable: true,
    }),
  });

  readonly nameControl = this.editorForm.controls.name;
  readonly priceControl = this.editorForm.controls.price;

  ngOnInit(): void {
    this.loadDishes();
  }

  loadDishes(page = 0): void {
    const requestedPage = Math.max(0, page);
    const filters = this.filtersForm.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);
    this.actionError.set(null);

    this.dishApi
      .getDishes({
        name: filters.name.trim() || undefined,
        category: filters.category || undefined,
        available: filters.available === 'true',
        page: requestedPage,
        size: this.pageSize,
        sort: 'name,asc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.dishes.set(response.content);
          this.totalElements.set(response.totalElements);
          this.currentPage.set(response.number);
          this.totalPages.set(response.totalPages);
          this.firstPage.set(response.first);
          this.lastPage.set(response.last);
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei piatti.', error);

          this.resetPageState();

          this.errorMessage.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare i piatti.'),
          );
        },
      });
  }

  applyFilters(): void {
    this.loadDishes(0);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadDishes(0);
  }

  startCreate(): void {
    this.editingDish.set(null);
    this.actionError.set(null);
    this.imageUploadError.set(null);
    this.editorImagePreviewUrl.set(null);

    this.editorForm.reset({
      name: '',
      description: '',
      price: null,
      category: 'ANTIPASTO',
      available: true,
      imageUrl: '',
    });

    this.editorOpen.set(true);
  }

  startEdit(dish: Dish): void {
    this.editingDish.set(dish);
    this.actionError.set(null);
    this.imageUploadError.set(null);
    this.editorImagePreviewUrl.set(this.resolveImageUrl(dish.imageUrl));

    this.editorForm.reset({
      name: dish.name,
      description: dish.description ?? '',
      price: dish.price,
      category: dish.category,
      available: dish.available,
      imageUrl: dish.imageUrl ?? '',
    });

    this.editorOpen.set(true);
  }

  closeEditor(): void {
    if (this.saving() || this.uploadingImage()) {
      return;
    }

    this.editorOpen.set(false);
    this.editingDish.set(null);
    this.imageUploadError.set(null);
    this.editorImagePreviewUrl.set(null);
    this.editorForm.reset();
  }
  onImageSelected(event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];

    // Permette di riselezionare lo stesso file.
    input.value = '';

    if (!file || this.uploadingImage()) {
      return;
    }

    this.imageUploadError.set(null);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      this.imageUploadError.set('Formato non supportato. Usa JPG, PNG oppure WEBP.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      this.imageUploadError.set('L’immagine non può superare 5 MB.');
      return;
    }

    this.uploadingImage.set(true);

    this.dishApi
      .uploadImage(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.uploadingImage.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.editorForm.controls.imageUrl.setValue(response.imageUrl);

          this.editorImagePreviewUrl.set(this.resolveImageUrl(response.imageUrl));
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento dell’immagine.', error);

          this.imageUploadError.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare l’immagine.'),
          );
        },
      });
  }

  removeImage(): void {
    if (this.uploadingImage() || this.saving()) {
      return;
    }

    this.editorForm.controls.imageUrl.setValue('');
    this.editorImagePreviewUrl.set(null);
    this.imageUploadError.set(null);
  }
  saveDish(): void {
    this.actionError.set(null);

    if (this.saving() || this.uploadingImage()) {
      return;
    }

    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const formValue = this.editorForm.getRawValue();
    const price = formValue.price;

    if (price === null) {
      return;
    }

    const request: UpsertDishPayload = {
      name: formValue.name.trim(),
      description: formValue.description.trim() || null,
      price,
      category: formValue.category,
      available: formValue.available,
      imageUrl: formValue.imageUrl.trim() || null,
    };

    const editingDish = this.editingDish();

    const operation = editingDish
      ? this.dishApi.updateDish(editingDish.id, request)
      : this.dishApi.createDish(request);

    this.saving.set(true);

    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editorOpen.set(false);
          this.editingDish.set(null);
          this.imageUploadError.set(null);
          this.editorImagePreviewUrl.set(null);

          this.loadDishes(editingDish ? this.currentPage() : 0);
        },
        error: (error: unknown) => {
          console.error('Errore durante il salvataggio del piatto.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile salvare il piatto.'),
          );
        },
      });
  }

  deleteDish(dish: Dish): void {
    if (!this.canDelete() || this.deletingDishId()) {
      return;
    }

    const confirmed = window.confirm(`Vuoi rendere non disponibile “${dish.name}”?`);

    if (!confirmed) {
      return;
    }

    this.deletingDishId.set(dish.id);
    this.actionError.set(null);

    this.dishApi
      .deleteDish(dish.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingDishId.set(null)),
      )
      .subscribe({
        next: () => {
          this.loadDishes(this.currentPage());
        },
        error: (error: unknown) => {
          console.error('Errore durante la disattivazione del piatto.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile disattivare il piatto.'),
          );
        },
      });
  }

  resolveImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    try {
      return new URL(imageUrl, `${this.apiBaseUrl}/`).toString();
    } catch {
      return null;
    }
  }

  hideBrokenImage(event: Event): void {
    const image = event.target;

    if (image instanceof HTMLImageElement) {
      image.hidden = true;
    }
  }

  goToPreviousPage(): void {
    if (!this.firstPage() && !this.loading()) {
      this.loadDishes(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (!this.lastPage() && !this.loading()) {
      this.loadDishes(this.currentPage() + 1);
    }
  }

  private resetPageState(): void {
    this.dishes.set([]);
    this.totalElements.set(0);
    this.currentPage.set(0);
    this.totalPages.set(0);
    this.firstPage.set(true);
    this.lastPage.set(true);
  }
}

function nonBlankValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    control.value.trim().length > 0 ? null : { blank: true };
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
