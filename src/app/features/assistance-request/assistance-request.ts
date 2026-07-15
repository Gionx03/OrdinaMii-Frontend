import { RestaurantTable } from '../tables/restaurant-table';

export const ASSISTANCE_REQUEST_STATUS = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;

export type AssistanceRequestStatus =
  (typeof ASSISTANCE_REQUEST_STATUS)[keyof typeof ASSISTANCE_REQUEST_STATUS];

export const ASSISTANCE_REQUEST_STATUSES: readonly AssistanceRequestStatus[] =
  Object.values(ASSISTANCE_REQUEST_STATUS);

export interface CreateAssistanceRequestPayload {
  readonly message: string;
  readonly tableId: string;
}

export interface UpdateAssistanceRequestStatusPayload {
  readonly status: AssistanceRequestStatus;
}

export interface AssistanceRequestFilters {
  readonly status?: AssistanceRequestStatus;
  readonly tableId?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface AssistanceRequest {
  readonly id: string;
  readonly message: string;
  readonly status: AssistanceRequestStatus;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
  readonly table: RestaurantTable;
}

export const ASSISTANCE_REQUEST_STATUS_LABELS: Record<AssistanceRequestStatus, string> = {
  PENDING: 'In attesa',
  RESOLVED: 'Risolta',
  CANCELLED: 'Annullata',
};
