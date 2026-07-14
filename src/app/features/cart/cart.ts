import { type Dish } from '../dishes/dish';

export interface CartItem {
  readonly dish: Dish;
  readonly quantity: number;
}
