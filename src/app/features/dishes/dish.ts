export const DISH_CATEGORIES = [
  'ANTIPASTO',
  'PRIMO',
  'SECONDO',
  'CONTORNO',
  'DOLCE',
  'BEVANDE',
] as const;

export type DishCategory = (typeof DISH_CATEGORIES)[number];

export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  ANTIPASTO: 'Antipasto',
  PRIMO: 'Primo',
  SECONDO: 'Secondo',
  CONTORNO: 'Contorno',
  DOLCE: 'Dolce',
  BEVANDE: 'Bevande',
};

export interface Dish {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly category: DishCategory;
  readonly available: boolean;
  readonly imageUrl: string | null;
}

export interface DishFilters {
  readonly category?: DishCategory;
  readonly name?: string;
  readonly description?: string;
  readonly available?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface UpsertDishPayload {
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly category: DishCategory;
  readonly available: boolean;
  readonly imageUrl: string | null;
}
