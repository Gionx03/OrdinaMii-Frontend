import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { Dish, DISH_CATEGORY_LABELS } from '../dish';

@Component({
  selector: 'app-dish-card',
  imports: [CurrencyPipe],
  templateUrl: './dish-card.html',
  styleUrl: './dish-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishCard {
  readonly dish = input.required<Dish>();

  private readonly imageLoadFailed = signal(false);

  readonly categoryLabel = computed(() => DISH_CATEGORY_LABELS[this.dish().category]);

  readonly imageUrl = computed(() => {
    const imageUrl = this.dish().imageUrl;

    if (!imageUrl || this.imageLoadFailed()) {
      return null;
    }

    const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

    return new URL(imageUrl, `${apiBaseUrl}/`).toString();
  });

  markImageAsUnavailable(): void {
    this.imageLoadFailed.set(true);
  }
}
