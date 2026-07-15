import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { APP_ROLE } from '../../../core/auth/app-role';
import { AuthService } from '../../../core/auth/auth-service';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
} from '../order';
import { OrderApi } from '../order-api';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-manage-orders-page',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './manage-orders-page.html',
  styleUrl: './manage-orders-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageOrdersPage implements OnInit {
  private readonly orderApi = inject(OrderApi);

  private readonly authService = inject(AuthService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly pageSize = 10;

  readonly orderStatus = ORDER_STATUS;
  readonly paymentStatus = PAYMENT_STATUS;
  readonly statusOptions = ORDER_STATUSES;

  readonly orderStatusLabels = ORDER_STATUS_LABELS;

  readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;

  readonly orderTypeLabels = ORDER_TYPE_LABELS;

  readonly orders = signal<readonly Order[]>([]);

  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  readonly updatingOrderId = signal<string | null>(null);

  readonly actionError = signal<string | null>(null);

  readonly canManagePayments = computed(
    () =>
      this.authService.authenticated() &&
      this.authService.hasAnyRole([APP_ROLE.CAMERIERE, APP_ROLE.ADMIN]),
  );

  readonly canCreateOrders = computed(
    () =>
      this.authService.authenticated() &&
      this.authService.hasAnyRole([APP_ROLE.CAMERIERE, APP_ROLE.ADMIN]),
  );

  readonly filtersForm = new FormGroup({
    status: new FormControl<OrderStatus | ''>('', {
      nonNullable: true,
    }),

    date: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(page = 0): void {
    const requestedPage = Math.max(0, page);

    const filters = this.filtersForm.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);
    this.actionError.set(null);

    this.orderApi
      .getOrders({
        status: filters.status || undefined,

        date: filters.date || undefined,

        page: requestedPage,
        size: this.pageSize,
        sort: 'orderDate,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.orders.set(response.content);

          this.totalElements.set(response.totalElements);

          this.currentPage.set(response.number);

          this.totalPages.set(response.totalPages);

          this.firstPage.set(response.first);

          this.lastPage.set(response.last);
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento degli ordini.', error);

          this.resetPageState();

          this.errorMessage.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare gli ordini.'),
          );
        },
      });
  }

  applyFilters(): void {
    this.loadOrders(0);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadOrders(0);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    if (this.updatingOrderId()) {
      return;
    }

    this.updatingOrderId.set(orderId);
    this.actionError.set(null);

    this.orderApi
      .updateOrderStatus(orderId, status)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingOrderId.set(null)),
      )
      .subscribe({
        next: (updatedOrder) => {
          const selectedStatus = this.filtersForm.controls.status.value;

          if (selectedStatus && selectedStatus !== updatedOrder.status) {
            this.loadOrders(this.currentPage());

            return;
          }

          this.replaceOrder(updatedOrder);
        },

        error: (error: unknown) => {
          console.error('Errore durante l’aggiornamento dell’ordine.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile aggiornare lo stato dell’ordine.'),
          );
        },
      });
  }

  canEditOrder(order: Order): boolean {
    return (
      this.canCreateOrders() &&
      order.status !== ORDER_STATUS.SERVED &&
      order.status !== ORDER_STATUS.CANCELLED &&
      order.paymentStatus !== PAYMENT_STATUS.PAID &&
      order.paymentStatus !== PAYMENT_STATUS.CANCELLED
    );
  }

  updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): void {
    if (this.updatingOrderId() || !this.canManagePayments()) {
      return;
    }

    this.updatingOrderId.set(orderId);
    this.actionError.set(null);

    this.orderApi
      .updatePaymentStatus(orderId, paymentStatus)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingOrderId.set(null)),
      )
      .subscribe({
        next: (updatedOrder) => {
          this.replaceOrder(updatedOrder);
        },

        error: (error: unknown) => {
          console.error('Errore durante l’aggiornamento del pagamento.', error);

          this.actionError.set(
            getApiErrorMessage(error, 'Non è stato possibile aggiornare il pagamento.'),
          );
        },
      });
  }

  goToPreviousPage(): void {
    if (!this.firstPage() && !this.loading()) {
      this.loadOrders(this.currentPage() - 1);
    }
  }

  goToNextPage(): void {
    if (!this.lastPage() && !this.loading()) {
      this.loadOrders(this.currentPage() + 1);
    }
  }

  private replaceOrder(updatedOrder: Order): void {
    this.orders.update((orders) =>
      orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    );
  }

  private resetPageState(): void {
    this.orders.set([]);
    this.totalElements.set(0);
    this.currentPage.set(0);
    this.totalPages.set(0);
    this.firstPage.set(true);
    this.lastPage.set(true);
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof HttpErrorResponse &&
    isRecord(error.error) &&
    typeof error.error['message'] === 'string'
  ) {
    return error.error['message'];
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
