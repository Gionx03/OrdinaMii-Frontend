export interface RestaurantTable {
  readonly id: string;
  readonly number: number;
  readonly seats: number;
  readonly active: boolean;
}

export interface RestaurantTableFilters {
  readonly active?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface UpsertRestaurantTablePayload {
  readonly number: number;
  readonly seats: number;
}
