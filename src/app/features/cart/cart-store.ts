import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { Dish, DishCategory, DISH_CATEGORIES } from '../dishes/dish';
import { CartItem } from './cart';

const CART_STORAGE_KEY = 'ordinamii-cart';

@Injectable({
  providedIn: 'root',
})
export class CartStore {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly itemsState = signal<readonly CartItem[]>([]);

  readonly items = this.itemsState.asReadonly();

  readonly empty = computed(() => this.itemsState().length === 0);

  readonly totalQuantity = computed(() =>
    this.itemsState().reduce((total, item) => total + item.quantity, 0),
  );

  readonly totalPrice = computed(() =>
    this.itemsState().reduce((total, item) => total + item.dish.price * item.quantity, 0),
  );

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.itemsState.set(this.readStoredItems());

    effect(() => {
      const items = this.itemsState();

      try {
        if (items.length === 0) {
          window.localStorage.removeItem(CART_STORAGE_KEY);

          return;
        }

        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error: unknown) {
        console.warn('Impossibile salvare il carrello nel browser.', error);
      }
    });
  }

  addDish(dish: Dish): void {
    if (!dish.available) {
      return;
    }

    this.itemsState.update((items) => {
      const existingItem = items.find((item) => item.dish.id === dish.id);

      if (!existingItem) {
        return [
          ...items,
          {
            dish,
            quantity: 1,
          },
        ];
      }

      return items.map((item) =>
        item.dish.id === dish.id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      );
    });
  }

  increaseQuantity(dishId: string): void {
    this.itemsState.update((items) =>
      items.map((item) =>
        item.dish.id === dishId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      ),
    );
  }

  decreaseQuantity(dishId: string): void {
    this.itemsState.update((items) =>
      items
        .map((item) =>
          item.dish.id === dishId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  removeDish(dishId: string): void {
    this.itemsState.update((items) => items.filter((item) => item.dish.id !== dishId));
  }

  clear(): void {
    this.itemsState.set([]);
  }

  private readStoredItems(): readonly CartItem[] {
    try {
      const storedValue = window.localStorage.getItem(CART_STORAGE_KEY);

      if (!storedValue) {
        return [];
      }

      const parsedValue: unknown = JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue.filter(isCartItem);
    } catch (error: unknown) {
      console.warn('Impossibile ripristinare il carrello dal browser.', error);

      return [];
    }
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }

  const quantity = value['quantity'];

  return (
    isDish(value['dish']) &&
    typeof quantity === 'number' &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
}

function isDish(value: unknown): value is Dish {
  if (!isRecord(value)) {
    return false;
  }

  const description = value['description'];
  const imageUrl = value['imageUrl'];

  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    (typeof description === 'string' || description === null) &&
    typeof value['price'] === 'number' &&
    Number.isFinite(value['price']) &&
    value['price'] >= 0 &&
    isDishCategory(value['category']) &&
    typeof value['available'] === 'boolean' &&
    (typeof imageUrl === 'string' || imageUrl === null)
  );
}

function isDishCategory(value: unknown): value is DishCategory {
  return typeof value === 'string' && DISH_CATEGORIES.some((category) => category === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
