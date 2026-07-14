import { CurrencyPipe } from '@angular/common';
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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, startWith } from 'rxjs';

import { CartStore } from '../../cart/cart-store';
import { CreateMyOrderRequest, Order, OrderType, ORDER_TYPE } from '../../orders/order';
import { OrderApi } from '../../orders/order-api';
import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage implements OnInit {
  private readonly cartStore = inject(CartStore);
  private readonly orderApi = inject(OrderApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly destroyRef = inject(DestroyRef);

  readonly orderType = ORDER_TYPE;

  readonly items = this.cartStore.items;
  readonly empty = this.cartStore.empty;
  readonly totalQuantity = this.cartStore.totalQuantity;
  readonly totalPrice = this.cartStore.totalPrice;

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly loadingTables = signal(false);
  readonly tablesError = signal<string | null>(null);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly createdOrder = signal<Order | null>(null);

  readonly selectedOrderType = signal<OrderType>(ORDER_TYPE.TAKE_AWAY);

  readonly tableOrderSelected = computed(
    () => this.selectedOrderType() === ORDER_TYPE.ON_THE_TABLE,
  );

  readonly checkoutForm = new FormGroup({
    orderType: new FormControl<OrderType>(ORDER_TYPE.TAKE_AWAY, {
      nonNullable: true,
      validators: [Validators.required],
    }),

    tableId: new FormControl('', {
      nonNullable: true,
    }),
  });

  readonly orderTypeControl = this.checkoutForm.controls.orderType;

  readonly tableIdControl = this.checkoutForm.controls.tableId;

  ngOnInit(): void {
    this.observeOrderType();
    this.loadTables();
  }

  loadTables(): void {
    this.loadingTables.set(true);
    this.tablesError.set(null);

    this.tableApi
      .getActiveTables()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingTables.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.tables.set(response.content);
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei tavoli.', error);

          this.tables.set([]);

          this.tablesError.set(
            getApiErrorMessage(error, 'Non è stato possibile caricare i tavoli.'),
          );
        },
      });
  }

  submitOrder(): void {
    if (this.empty() || this.submitting()) {
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    const formValue = this.checkoutForm.getRawValue();

    const request: CreateMyOrderRequest = {
      orderType: formValue.orderType,

      tableId: formValue.orderType === ORDER_TYPE.ON_THE_TABLE ? formValue.tableId : null,

      items: this.items().map((item) => ({
        dishId: item.dish.id,
        quantity: item.quantity,
      })),
    };

    this.submitting.set(true);
    this.submitError.set(null);

    this.orderApi
      .createMyOrder(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (order) => {
          this.createdOrder.set(order);

          this.cartStore.clear();
          this.checkoutForm.disable();
        },

        error: (error: unknown) => {
          console.error('Errore durante la creazione dell’ordine.', error);

          this.submitError.set(getApiErrorMessage(error, 'Non è stato possibile creare l’ordine.'));
        },
      });
  }

  private observeOrderType(): void {
    this.orderTypeControl.valueChanges
      .pipe(startWith(this.orderTypeControl.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((orderType) => {
        this.selectedOrderType.set(orderType);
        this.configureTableValidation(orderType);
      });
  }

  private configureTableValidation(orderType: OrderType): void {
    if (orderType === ORDER_TYPE.ON_THE_TABLE) {
      this.tableIdControl.setValidators([Validators.required]);
    } else {
      this.tableIdControl.clearValidators();

      this.tableIdControl.setValue('', {
        emitEvent: false,
      });
    }

    this.tableIdControl.updateValueAndValidity({
      emitEvent: false,
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
