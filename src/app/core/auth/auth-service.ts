import { Injectable, signal } from '@angular/core';

import { APP_ROLES, type AppRole } from './app-role';
import { keycloakClient } from './keycloak';

const TOKEN_MIN_VALIDITY_SECONDS = 30;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authenticatedState = signal(false);
  private readonly rolesState = signal<readonly AppRole[]>([]);

  readonly authenticated = this.authenticatedState.asReadonly();
  readonly roles = this.rolesState.asReadonly();

  async initialize(): Promise<void> {
    this.configureCallbacks();

    try {
      await keycloakClient.init({
        onLoad: 'check-sso',
        flow: 'standard',
        pkceMethod: 'S256',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        silentCheckSsoFallback: false,
      });

      this.synchronizeState();
    } catch (error: unknown) {
      this.clearState();
      console.error('Impossibile inizializzare Keycloak.', error);
    }
  }

  async login(redirectUri: string = window.location.href): Promise<void> {
    await keycloakClient.login({
      redirectUri: new URL(redirectUri, window.location.origin).toString(),
    });
  }
  async register(redirectUri: string = window.location.href,): Promise<void> {
    await keycloakClient.register({
      redirectUri: new URL(
        redirectUri,
        window.location.origin,
      ).toString(),
    });
  }

  async logout(): Promise<void> {
    await keycloakClient.logout({
      redirectUri: `${window.location.origin}/`,
    });
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!keycloakClient.authenticated) {
      return null;
    }

    try {
      await keycloakClient.updateToken(TOKEN_MIN_VALIDITY_SECONDS);
      this.synchronizeState();

      return keycloakClient.token ?? null;
    } catch (error: unknown) {
      console.error('Impossibile aggiornare il token di accesso.', error);
      keycloakClient.clearToken();

      return null;
    }
  }

  hasRole(role: AppRole): boolean {
    return this.rolesState().includes(role);
  }

  hasAnyRole(roles: readonly AppRole[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  private configureCallbacks(): void {
    keycloakClient.onAuthSuccess = () => this.synchronizeState();
    keycloakClient.onAuthRefreshSuccess = () => this.synchronizeState();
    keycloakClient.onAuthLogout = () => this.clearState();
    keycloakClient.onAuthError = () => this.clearState();
    keycloakClient.onAuthRefreshError = () => keycloakClient.clearToken();
    keycloakClient.onTokenExpired = () => void this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      await keycloakClient.updateToken(TOKEN_MIN_VALIDITY_SECONDS);
      this.synchronizeState();
    } catch (error: unknown) {
      console.error('La sessione Keycloak è scaduta.', error);
      keycloakClient.clearToken();
    }
  }

  private synchronizeState(): void {
    const authenticated = keycloakClient.authenticated;
    const realmRoles = keycloakClient.realmAccess?.roles ?? [];

    this.authenticatedState.set(authenticated);

    this.rolesState.set(authenticated ? APP_ROLES.filter((role) => realmRoles.includes(role)) : []);
  }

  private clearState(): void {
    this.authenticatedState.set(false);
    this.rolesState.set([]);
  }
}
