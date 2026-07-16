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
import { EMPTY, expand, finalize, reduce } from 'rxjs';

import { APP_ROLE } from '../../../core/auth/app-role';
import { AuthService } from '../../../core/auth/auth-service';
import { CartStore } from '../../cart/cart-store';
import { Dish, DishCategory, DISH_CATEGORIES, DISH_CATEGORY_LABELS } from '../../dishes/dish';
import { DishApi } from '../../dishes/dish-api';
import { DishCard } from '../../dishes/dish-card/dish-card';

interface DishCategoryGroup {
  readonly category: DishCategory;
  readonly label: string;
  readonly dishes: Dish[];
}

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

  /*
   * Numero di piatti richiesti per ogni pagina.
   * Se il backend restituisce più pagine, vengono caricate automaticamente.
   */
  private readonly pageSize = 50;

  readonly categories = DISH_CATEGORIES;
  readonly categoryLabels = DISH_CATEGORY_LABELS;

  readonly dishes = signal<Dish[]>([]);
  readonly totalElements = signal(0);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /*
   * Stringa vuota significa "Tutte le categorie".
   */
  readonly selectedCategory = signal<DishCategory | ''>('');

  readonly canOrder = computed(
    () => this.authService.authenticated() && this.authService.hasRole(APP_ROLE.CLIENTE),
  );

  /*
   * I gruppi vengono costruiti seguendo l'ordine di DISH_CATEGORIES:
   * antipasti, primi, secondi, contorni, dolci e bevande.
   *
   * Le categorie senza piatti non vengono mostrate.
   */
  readonly categoryGroups = computed<DishCategoryGroup[]>(() => {
    const loadedDishes = this.dishes();

    return this.categories
      .map((category) => ({
        category,
        label: this.categoryLabels[category],
        dishes: loadedDishes.filter((dish) => dish.category === category),
      }))
      .filter((group) => group.dishes.length > 0);
  });

  readonly filtersForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadDishes();
  }

  loadDishes(): void {
    const name = this.filtersForm.controls.name.value.trim();
    const category = this.selectedCategory();

    const commonFilters = {
      name: name || undefined,
      category: category || undefined,
      available: true,
      size: this.pageSize,
      sort: 'name,asc',
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    /*
     * La prima richiesta carica la pagina zero.
     *
     * expand() continua a richiedere le pagine successive finché
     * la risposta del backend non contiene last = true.
     *
     * reduce() unisce tutti i piatti in un unico array.
     */
    this.dishApi
      .getDishes({
        ...commonFilters,
        page: 0,
      })
      .pipe(
        expand((response) => {
          if (response.last) {
            return EMPTY;
          }

          return this.dishApi.getDishes({
            ...commonFilters,
            page: response.number + 1,
          });
        }),
        reduce((allDishes, response) => [...allDishes, ...response.content], [] as Dish[]),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (dishes) => {
          this.dishes.set(dishes);
          this.totalElements.set(dishes.length);
        },
        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei piatti.', error);

          this.dishes.set([]);
          this.totalElements.set(0);

          this.errorMessage.set('Non è stato possibile caricare il menu. Riprova tra poco.');
        },
      });
  }

  selectCategory(category: DishCategory | ''): void {
    if (this.loading() || this.selectedCategory() === category) {
      return;
    }

    this.selectedCategory.set(category);
    this.loadDishes();
  }

  applyFilters(): void {
    this.loadDishes();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.selectedCategory.set('');
    this.loadDishes();
  }

  addDishToCart(dish: Dish): void {
    this.cartStore.addDish(dish);
  }
}
