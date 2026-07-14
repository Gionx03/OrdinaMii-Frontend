import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DISH_CATEGORY_LABELS } from '../../dishes/dish';
import { CartStore } from '../cart-store';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  private readonly cartStore = inject(CartStore);

  readonly items = this.cartStore.items;
  readonly empty = this.cartStore.empty;
  readonly totalQuantity = this.cartStore.totalQuantity;
  readonly totalPrice = this.cartStore.totalPrice;

  readonly categoryLabels = DISH_CATEGORY_LABELS;

  increaseQuantity(dishId: string): void {
    this.cartStore.increaseQuantity(dishId);
  }

  decreaseQuantity(dishId: string): void {
    this.cartStore.decreaseQuantity(dishId);
  }

  removeDish(dishId: string): void {
    this.cartStore.removeDish(dishId);
  }

  clearCart(): void {
    this.cartStore.clear();
  }
}
