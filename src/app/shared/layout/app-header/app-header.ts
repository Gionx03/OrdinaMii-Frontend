import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { APP_ROLE } from '../../../core/auth/app-role';
import { AuthService } from '../../../core/auth/auth-service';
import { CartStore } from '../../../features/cart/cart-store';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  private readonly authService = inject(AuthService);
  private readonly cartStore = inject(CartStore);

  readonly authenticated = this.authService.authenticated;

  readonly actionPending = signal(false);

  readonly cartQuantity = this.cartStore.totalQuantity;

  readonly isCustomer = computed(
    () => this.authService.authenticated() && this.authService.hasRole(APP_ROLE.CLIENTE),
  );

  async login(): Promise<void> {
    if (this.actionPending()) {
      return;
    }

    this.actionPending.set(true);

    try {
      await this.authService.login();
    } catch (error: unknown) {
      console.error('Impossibile avviare il login.', error);
    } finally {
      this.actionPending.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.actionPending()) {
      return;
    }

    this.actionPending.set(true);

    try {
      await this.authService.logout();
    } catch (error: unknown) {
      console.error('Impossibile eseguire il logout.', error);
    } finally {
      this.actionPending.set(false);
    }
  }
}
