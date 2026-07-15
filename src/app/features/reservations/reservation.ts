import { RestaurantTable } from '../tables/restaurant-table';

export const RESERVATION_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUSES: readonly ReservationStatus[] = Object.values(RESERVATION_STATUS);

export interface CreateMyReservationRequest {
  readonly date: string;
  readonly time: string;
  readonly numberOfPeople: number;
  readonly tableId: string;
}

export interface UpdateReservationStatusPayload {
  readonly status: ReservationStatus;
}

export interface ReservationUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
}

export interface Reservation {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly numberOfPeople: number;
  readonly status: ReservationStatus;
  readonly user: ReservationUser;
  readonly table: RestaurantTable;
}

export interface MyReservationFilters {
  readonly startDate?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface StaffReservationFilters {
  readonly status?: ReservationStatus;
  readonly userId?: string;
  readonly tableId?: string;
  readonly date?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: 'Confermata',
  CANCELLED: 'Annullata',
  COMPLETED: 'Completata',
};

export interface CreateStaffReservationRequest {
  readonly date: string;
  readonly time: string;
  readonly numberOfPeople: number;
  readonly userId: string;
  readonly tableId: string;
}
export type UpdateStaffReservationRequest = CreateStaffReservationRequest;
