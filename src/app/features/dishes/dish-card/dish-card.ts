import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { environment } from '../../../../environments/environment';
import { FlyToCart } from '../../../shared/animations/fly-to-cart';
import { Dish, DISH_CATEGORY_LABELS } from '../dish';

@Component({
  selector: 'app-dish-card',
  imports: [CurrencyPipe],
  templateUrl: './dish-card.html',
  styleUrl: './dish-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishCard {
  private readonly destroyRef = inject(DestroyRef);

  private readonly hostElement: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly flyToCart = inject(FlyToCart);

  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;

  readonly dish = input.required<Dish>();
  readonly orderingEnabled = input(false);
  readonly addToCart = output<Dish>();

  readonly addedFeedback = signal(false);

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

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.feedbackTimer !== undefined) {
        clearTimeout(this.feedbackTimer);
      }
    });
  }

  markImageAsUnavailable(): void {
    this.imageLoadFailed.set(true);
  }

  requestAddToCart(): void {
    if (!this.orderingEnabled() || !this.dish().available) {
      return;
    }

    const imageContainer = this.hostElement.nativeElement.querySelector<HTMLElement>(
      '.dish-card__image-container',
    );

    if (imageContainer) {
      this.flyToCart.animate(imageContainer);
    }

    this.addToCart.emit(this.dish());
    this.showAddedFeedback();
  }

  private showAddedFeedback(): void {
    if (this.feedbackTimer !== undefined) {
      clearTimeout(this.feedbackTimer);
    }

    this.addedFeedback.set(true);

    this.feedbackTimer = setTimeout(() => {
      this.addedFeedback.set(false);
      this.feedbackTimer = undefined;
    }, 900);
  }
}
