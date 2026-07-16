import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';

import {
  Order,
  OrderStatus,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
} from '../order';
import { OrderApi } from '../order-api';

type OrderActionType = 'PAY' | 'ASSISTANCE' | 'WAITER_PAYMENT';

interface OrderActionState {
  readonly orderId: string;
  readonly type: OrderActionType;
}

interface OrderActionNotice {
  readonly kind: 'success' | 'error';
  readonly message: string;
}

@Component({
  selector: 'app-my-orders-page',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './my-orders-page.html',
  styleUrl: './my-orders-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrdersPage implements OnInit {
  private readonly orderApi = inject(OrderApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 10;

  readonly statusOptions = Object.values(ORDER_STATUS);

  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly typeLabels = ORDER_TYPE_LABELS;
  readonly paymentLabels = PAYMENT_STATUS_LABELS;

  readonly orders = signal<readonly Order[]>([]);

  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly firstPage = signal(true);
  readonly lastPage = signal(true);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly actionInProgress = signal<OrderActionState | null>(null);
  readonly paymentConfirmationOrderId = signal<string | null>(null);
  readonly actionNotices = signal<Readonly<Record<string, OrderActionNotice>>>({});
  readonly assistedOrderIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly filtersForm = new FormGroup({
    status: new FormControl<OrderStatus | ''>('', {
      nonNullable: true,
    }),
    startDate: new FormControl('', {
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
    this.paymentConfirmationOrderId.set(null);

    this.orderApi
      .getMyOrders({
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
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

          this.orders.set([]);
          this.totalElements.set(0);
          this.currentPage.set(0);
          this.totalPages.set(0);
          this.firstPage.set(true);
          this.lastPage.set(true);

          this.errorMessage.set('Non è stato possibile caricare i tuoi ordini.');
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

  canPayNow(order: Order): boolean {
    return (
      order.status !== ORDER_STATUS.CANCELLED &&
      (order.paymentStatus === PAYMENT_STATUS.NOT_PAID ||
        order.paymentStatus === PAYMENT_STATUS.PAY_AT_COUNTER)
    );
  }

  canRequestWaiterPayment(order: Order): boolean {
    return (
      order.status !== ORDER_STATUS.CANCELLED &&
      order.table !== null &&
      order.paymentStatus === PAYMENT_STATUS.NOT_PAID
    );
  }

  canRequestAssistance(order: Order): boolean {
    return order.status !== ORDER_STATUS.CANCELLED && order.table !== null;
  }

  assistanceAlreadyRequested(orderId: string): boolean {
    return this.assistedOrderIds().has(orderId);
  }

  isActionInProgress(orderId: string, type: OrderActionType): boolean {
    const action = this.actionInProgress();
    return action?.orderId === orderId && action.type === type;
  }

  actionNotice(orderId: string): OrderActionNotice | null {
    return this.actionNotices()[orderId] ?? null;
  }

  openPaymentConfirmation(orderId: string): void {
    if (this.actionInProgress() !== null) {
      return;
    }

    this.clearNotice(orderId);
    this.paymentConfirmationOrderId.set(orderId);
  }

  closePaymentConfirmation(): void {
    if (this.actionInProgress() === null) {
      this.paymentConfirmationOrderId.set(null);
    }
  }

  confirmPayment(order: Order): void {
    this.runAction(
      order.id,
      'PAY',
      this.orderApi.payMyOrder(order.id),
      (updatedOrder) => {
        this.replaceOrder(updatedOrder);
        this.paymentConfirmationOrderId.set(null);
        this.setNotice(order.id, {
          kind: 'success',
          message: 'Pagamento simulato completato. L’ordine risulta pagato.',
        });
      },
      'Non è stato possibile completare il pagamento.',
    );
  }

  requestAssistance(order: Order): void {
    this.runAction(
      order.id,
      'ASSISTANCE',
      this.orderApi.requestAssistanceForOrder(order.id),
      () => {
        this.assistedOrderIds.update((current) => {
          const next = new Set(current);
          next.add(order.id);
          return next;
        });

        this.setNotice(order.id, {
          kind: 'success',
          message: `Richiesta inviata al cameriere per il tavolo ${order.table?.number}.`,
        });
      },
      'Non è stato possibile inviare la richiesta di assistenza.',
    );
  }

  requestWaiterPayment(order: Order): void {
    this.runAction(
      order.id,
      'WAITER_PAYMENT',
      this.orderApi.requestWaiterPayment(order.id),
      (updatedOrder) => {
        this.replaceOrder(updatedOrder);
        this.setNotice(order.id, {
          kind: 'success',
          message: 'Richiesta di pagamento inviata al cameriere.',
        });
      },
      'Non è stato possibile richiedere il pagamento al cameriere.',
    );
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

  private runAction<T>(
    orderId: string,
    type: OrderActionType,
    request$: Observable<T>,
    onSuccess: (response: T) => void,
    fallbackError: string,
  ): void {
    if (this.actionInProgress() !== null) {
      return;
    }

    this.clearNotice(orderId);
    this.actionInProgress.set({ orderId, type });

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionInProgress.set(null)),
      )
      .subscribe({
        next: onSuccess,
        error: (error: unknown) => {
          console.error(`Errore durante l’azione ${type} sull’ordine ${orderId}.`, error);

          this.setNotice(orderId, {
            kind: 'error',
            message: getApiErrorMessage(error, fallbackError),
          });
        },
      });
  }

  private replaceOrder(updatedOrder: Order): void {
    this.orders.update((orders) =>
      orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    );
  }

  private setNotice(orderId: string, notice: OrderActionNotice): void {
    this.actionNotices.update((notices) => ({
      ...notices,
      [orderId]: notice,
    }));
  }

  private clearNotice(orderId: string): void {
    this.actionNotices.update((notices) => {
      const next: Record<string, OrderActionNotice> = { ...notices };
      delete next[orderId];
      return next;
    });
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
