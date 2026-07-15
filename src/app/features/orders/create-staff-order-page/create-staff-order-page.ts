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
import { finalize, forkJoin, startWith } from 'rxjs';

import { Dish, DISH_CATEGORY_LABELS } from '../../dishes/dish';
import { DishApi } from '../../dishes/dish-api';
import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import { UserLight } from '../../users/user';
import { UserApi } from '../../users/user-api';
import { CreateStaffOrderRequest, Order, OrderType, ORDER_TYPE, ORDER_TYPE_LABELS } from '../order';
import { OrderApi } from '../order-api';

interface StaffOrderLine {
  readonly dish: Dish;
  readonly quantity: number;
}

@Component({
  selector: 'app-create-staff-order-page',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './create-staff-order-page.html',
  styleUrl: './create-staff-order-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateStaffOrderPage implements OnInit {
  private readonly orderApi = inject(OrderApi);

  private readonly dishApi = inject(DishApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly userApi = inject(UserApi);

  private readonly destroyRef = inject(DestroyRef);

  readonly orderType = ORDER_TYPE;

  readonly orderTypeLabels = ORDER_TYPE_LABELS;

  readonly categoryLabels = DISH_CATEGORY_LABELS;

  readonly customers = signal<readonly UserLight[]>([]);

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly dishes = signal<readonly Dish[]>([]);

  readonly quantities = signal<Readonly<Record<string, number>>>({});

  readonly loadingOptions = signal(true);

  readonly optionsError = signal<string | null>(null);

  readonly submitting = signal(false);

  readonly submitError = signal<string | null>(null);

  readonly createdOrder = signal<Order | null>(null);

  readonly selectedOrderType = signal<OrderType>(ORDER_TYPE.TAKE_AWAY);

  readonly tableOrderSelected = computed(
    () => this.selectedOrderType() === ORDER_TYPE.ON_THE_TABLE,
  );

  readonly selectedLines = computed<readonly StaffOrderLine[]>(() => {
    const quantities = this.quantities();

    return this.dishes().flatMap((dish) => {
      const quantity = quantities[dish.id] ?? 0;

      return quantity > 0 ? [{ dish, quantity }] : [];
    });
  });

  readonly totalQuantity = computed(() =>
    this.selectedLines().reduce((total, line) => total + line.quantity, 0),
  );

  readonly totalPrice = computed(() =>
    this.selectedLines().reduce((total, line) => total + line.dish.price * line.quantity, 0),
  );

  readonly orderForm = new FormGroup({
    userId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    orderType: new FormControl<OrderType>(ORDER_TYPE.TAKE_AWAY, {
      nonNullable: true,
      validators: [Validators.required],
    }),

    tableId: new FormControl('', {
      nonNullable: true,
    }),
  });

  readonly userIdControl = this.orderForm.controls.userId;

  readonly orderTypeControl = this.orderForm.controls.orderType;

  readonly tableIdControl = this.orderForm.controls.tableId;

  ngOnInit(): void {
    this.observeOrderType();
    this.loadOptions();
  }

  loadOptions(): void {
    this.loadingOptions.set(true);
    this.optionsError.set(null);

    forkJoin({
      customers: this.userApi.getCustomers({
        page: 0,
        size: 100,
        sort: 'username,asc',
      }),

      tables: this.tableApi.getActiveTables(),

      dishes: this.dishApi.getDishes({
        available: true,
        page: 0,
        size: 100,
        sort: 'name,asc',
      }),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingOptions.set(false)),
      )
      .subscribe({
        next: ({ customers, tables, dishes }) => {
          this.customers.set(customers.content);

          this.tables.set(tables.content);

          this.dishes.set(dishes.content);
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento dei dati per il nuovo ordine.', error);

          this.customers.set([]);
          this.tables.set([]);
          this.dishes.set([]);

          this.optionsError.set(
            getApiErrorMessage(error, 'Non è stato possibile preparare il nuovo ordine.'),
          );
        },
      });
  }

  quantityFor(dishId: string): number {
    return this.quantities()[dishId] ?? 0;
  }

  increaseDish(dishId: string): void {
    this.quantities.update((quantities) => ({
      ...quantities,

      [dishId]: (quantities[dishId] ?? 0) + 1,
    }));
  }

  decreaseDish(dishId: string): void {
    this.quantities.update((quantities) => {
      const currentQuantity = quantities[dishId] ?? 0;

      if (currentQuantity <= 1) {
        const nextQuantities: Record<string, number> = {
          ...quantities,
        };

        delete nextQuantities[dishId];

        return nextQuantities;
      }

      return {
        ...quantities,
        [dishId]: currentQuantity - 1,
      };
    });
  }

  removeDish(dishId: string): void {
    this.quantities.update((quantities) => {
      const nextQuantities: Record<string, number> = {
        ...quantities,
      };

      delete nextQuantities[dishId];

      return nextQuantities;
    });
  }

  submitOrder(): void {
    this.submitError.set(null);

    if (this.submitting()) {
      return;
    }

    const selectedCustomerExists = this.customers().some(
      (customer) => customer.id === this.userIdControl.value,
    );

    if (this.userIdControl.value && !selectedCustomerExists) {
      this.userIdControl.setErrors({
        unavailable: true,
      });
    }

    if (this.tableOrderSelected()) {
      const selectedTableExists = this.tables().some(
        (table) => table.id === this.tableIdControl.value && table.active,
      );

      if (this.tableIdControl.value && !selectedTableExists) {
        this.tableIdControl.setErrors({
          unavailable: true,
        });
      }
    }

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const lines = this.selectedLines();

    if (lines.length === 0) {
      this.submitError.set('Aggiungi almeno un piatto alla comanda.');

      return;
    }

    const formValue = this.orderForm.getRawValue();

    const request: CreateStaffOrderRequest = {
      userId: formValue.userId,

      orderType: formValue.orderType,

      tableId: formValue.orderType === ORDER_TYPE.ON_THE_TABLE ? formValue.tableId : null,

      items: lines.map((line) => ({
        dishId: line.dish.id,
        quantity: line.quantity,
      })),
    };

    this.submitting.set(true);

    this.orderApi
      .createOrder(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (order) => {
          this.createdOrder.set(order);
          this.orderForm.disable();
        },

        error: (error: unknown) => {
          console.error('Errore durante la creazione dell’ordine staff.', error);

          this.submitError.set(
            getApiErrorMessage(error, 'Non è stato possibile registrare l’ordine.'),
          );
        },
      });
  }

  createAnotherOrder(): void {
    this.createdOrder.set(null);
    this.submitError.set(null);
    this.quantities.set({});

    this.orderForm.enable();

    this.orderForm.reset({
      userId: '',
      orderType: ORDER_TYPE.TAKE_AWAY,
      tableId: '',
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
