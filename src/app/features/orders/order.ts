import { DishCategory } from '../dishes/dish';
import { RestaurantTable } from '../tables/restaurant-table';

export const ORDER_TYPE = {
  TAKE_AWAY: 'TAKE_AWAY',
  ON_THE_TABLE: 'ON_THE_TABLE',
} as const;

export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  SERVED: 'SERVED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  NOT_PAID: 'NOT_PAID',
  PENDING: 'PENDING',
  PAID: 'PAID',
  PAY_AT_COUNTER: 'PAY_AT_COUNTER',
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export interface CreateOrderItemRequest {
  readonly dishId: string;
  readonly quantity: number;
}

export interface CreateMyOrderRequest {
  readonly orderType: OrderType;
  readonly tableId: string | null;
  readonly items: CreateOrderItemRequest[];
}

export interface OrderUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
}

export interface OrderDish {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly available: boolean;
  readonly category: DishCategory;
}

export interface OrderItem {
  readonly id: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly dish: OrderDish;
}

export interface Order {
  readonly id: string;
  readonly orderDate: string;
  readonly total: number;
  readonly status: OrderStatus;
  readonly paymentStatus: PaymentStatus;
  readonly orderType: OrderType;
  readonly user: OrderUser;
  readonly table: RestaurantTable | null;
  readonly items: OrderItem[];
}

export interface MyOrderFilters {
  readonly status?: OrderStatus;
  readonly startDate?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  TAKE_AWAY: 'Asporto',
  ON_THE_TABLE: 'Al tavolo',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'In attesa',
  PREPARING: 'In preparazione',
  SERVED: 'Servito',
  CANCELLED: 'Annullato',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_PAID: 'Non pagato',
  PENDING: 'Pagamento in attesa',
  PAID: 'Pagato',
  PAY_AT_COUNTER: 'Pagamento alla cassa',
  CANCELLED: 'Pagamento annullato',
};
