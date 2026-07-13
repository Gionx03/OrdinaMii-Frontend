export const APP_ROLE = {
  CLIENTE: 'CLIENTE',
  ADMIN: 'ADMIN',
  CUOCO: 'CUOCO',
  CAMERIERE: 'CAMERIERE',
} as const;

export type AppRole = (typeof APP_ROLE)[keyof typeof APP_ROLE];

export const APP_ROLES: readonly AppRole[] = Object.values(APP_ROLE);
