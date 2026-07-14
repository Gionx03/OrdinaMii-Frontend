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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { APP_ROLE } from '../../../core/auth/app-role';
import { AuthService } from '../../../core/auth/auth-service';
import { CartStore } from '../../cart/cart-store';
import { Dish, DishCategory, DISH_CATEGORIES, DISH_CATEGORY_LABELS } from '../../dishes/dish';
import { DishApi } from '../../dishes/dish-api';
import { DishCard } from '../../dishes/dish-card/dish-card';

@Component({
  selector: 'app-menu-page',
  imports: [ReactiveFormsModule, DishCard],
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage implements OnInit {
  private readonly dishApi = inject(DishApi);
  private readonly authService = inject(AuthService);
  private readonly cartStore = inject(CartStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 12;

  readonly categories = DISH_CATEGORIES;
  readonly categoryLabels = DISH_CATEGORY_LABELS;

  readonly dishes = signal<Dish[]>([]);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly canOrder = computed(
    () => this.authService.authenticated() && this.authService.hasRole(APP_ROLE.CLIENTE),
  );

  readonly filtersForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
    }),
    category: new FormControl<DishCategory | ''>('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadDishes();
  }

  loadDishes(page = 0): void {
    const requestedPage = Math.max(0, page);
    const filters = this.filtersForm.getRawValue();
    const name = filters.name.trim();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.dishApi
      .getDishes({
        name: name || undefined,
        category: filters.category || undefined,
        available: true,
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

          this.dishes.set([]);
          this.totalElements.set(0);
          this.totalPages.set(0);
          this.firstPage.set(true);
          this.lastPage.set(true);

          this.errorMessage.set('Non è stato possibile caricare il menu. Riprova tra poco.');
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

  addDishToCart(dish: Dish): void {
    this.cartStore.addDish(dish);
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
}
