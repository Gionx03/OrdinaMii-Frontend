import { type AppRole } from '../../core/auth/app-role';

export interface UserProfile {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly role: AppRole;
  readonly phone: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UpdateProfileRequest {
  readonly phone: string;
}

export const USER_ROLE_LABELS: Record<AppRole, string> = {
  CLIENTE: 'Cliente',
  ADMIN: 'Amministratore',
  CUOCO: 'Cuoco',
  CAMERIERE: 'Cameriere',
};
