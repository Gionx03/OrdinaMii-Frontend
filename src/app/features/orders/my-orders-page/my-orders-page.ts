import { CurrencyPipe, DatePipe } from '@angular/common';
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
import { finalize } from 'rxjs';

import {
  Order,
  OrderStatus,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../order';
import { OrderApi } from '../order-api';

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
}
