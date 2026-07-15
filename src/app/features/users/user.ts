import { type AppRole } from '../../core/auth/app-role';
import { type OrderStatus } from '../orders/order';

export interface AppUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly role: AppRole;
  readonly phone: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UserFilters {
  readonly role?: AppRole;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface UserOrderFilters {
  readonly status?: OrderStatus;
  readonly startDate?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface UserReservationFilters {
  readonly startDate?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export const USER_ROLE_LABELS: Record<AppRole, string> = {
  CLIENTE: 'Cliente',
  ADMIN: 'Amministratore',
  CUOCO: 'Cuoco',
  CAMERIERE: 'Cameriere',
};

export interface UserLight {
  readonly id: string;
  readonly username: string;
  readonly email: string;
}

export interface CustomerFilters {
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}
