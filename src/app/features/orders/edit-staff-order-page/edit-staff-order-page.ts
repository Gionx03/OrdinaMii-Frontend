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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, startWith } from 'rxjs';

import { Dish, DISH_CATEGORY_LABELS } from '../../dishes/dish';
import { DishApi } from '../../dishes/dish-api';
import { RestaurantTable } from '../../tables/restaurant-table';
import { RestaurantTableApi } from '../../tables/restaurant-table-api';
import { UserLight } from '../../users/user';
import { UserApi } from '../../users/user-api';
import {
  Order,
  OrderType,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  UpdateStaffOrderRequest,
} from '../order';
import { OrderApi } from '../order-api';

interface StaffOrderLine {
  readonly dish: Dish;
  readonly quantity: number;
}

@Component({
  selector: 'app-edit-staff-order-page',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-staff-order-page.html',
  styleUrl: './edit-staff-order-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditStaffOrderPage implements OnInit {
  private readonly orderApi = inject(OrderApi);

  private readonly dishApi = inject(DishApi);

  private readonly tableApi = inject(RestaurantTableApi);

  private readonly userApi = inject(UserApi);

  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  private readonly orderId = this.route.snapshot.paramMap.get('id');

  readonly orderType = ORDER_TYPE;

  readonly orderTypeLabels = ORDER_TYPE_LABELS;

  readonly orderStatusLabels = ORDER_STATUS_LABELS;

  readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;

  readonly categoryLabels = DISH_CATEGORY_LABELS;

  readonly order = signal<Order | null>(null);

  readonly customers = signal<readonly UserLight[]>([]);

  readonly tables = signal<readonly RestaurantTable[]>([]);

  readonly dishes = signal<readonly Dish[]>([]);

  readonly quantities = signal<Readonly<Record<string, number>>>({});

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly submitting = signal(false);

  readonly submitError = signal<string | null>(null);

  readonly updatedOrder = signal<Order | null>(null);

  readonly selectedOrderType = signal<OrderType>(ORDER_TYPE.TAKE_AWAY);

  readonly canEdit = computed(() => {
    const order = this.order();

    return (
      order !== null &&
      order.status !== ORDER_STATUS.SERVED &&
      order.status !== ORDER_STATUS.CANCELLED &&
      order.paymentStatus !== PAYMENT_STATUS.PAID &&
      order.paymentStatus !== PAYMENT_STATUS.CANCELLED
    );
  });

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

  readonly hasUnavailableSelectedDishes = computed(() =>
    this.selectedLines().some((line) => !line.dish.available),
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

    if (!this.orderId) {
      this.loading.set(false);

      this.loadError.set('Identificativo dell’ordine non valido.');

      return;
    }

    this.loadOrder();
  }

  loadOrder(): void {
    if (!this.orderId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.submitError.set(null);

    forkJoin({
      order: this.orderApi.getOrderById(this.orderId),

      customers: this.userApi.getCustomers({
        page: 0,
        size: 100,
        sort: 'username,asc',
      }),

      tables: this.tableApi.getActiveTables(),

      dishes: this.dishApi.getDishes({
        page: 0,
        size: 100,
        sort: 'name,asc',
      }),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ order, customers, tables, dishes }) => {
          const customerOptions = mergeCurrentCustomer(customers.content, order);

          const dishOptions = mergeCurrentDishes(dishes.content, order);

          const currentTableIsActive =
            order.table !== null && tables.content.some((table) => table.id === order.table?.id);

          this.order.set(order);

          this.customers.set(customerOptions);

          this.tables.set(tables.content);

          this.dishes.set(dishOptions);

          this.quantities.set(
            Object.fromEntries(order.items.map((item) => [item.dish.id, item.quantity])),
          );

          this.orderForm.reset({
            userId: order.user.id,

            orderType: order.orderType,

            tableId: currentTableIsActive ? (order.table?.id ?? '') : '',
          });
        },

        error: (error: unknown) => {
          console.error('Errore durante il caricamento dell’ordine.', error);

          this.order.set(null);
          this.customers.set([]);
          this.tables.set([]);
          this.dishes.set([]);

          this.loadError.set(getApiErrorMessage(error, 'Non è stato possibile caricare l’ordine.'));
        },
      });
  }

  quantityFor(dishId: string): number {
    return this.quantities()[dishId] ?? 0;
  }

  increaseDish(dishId: string): void {
    const dish = this.dishes().find((candidate) => candidate.id === dishId);

    if (!dish?.available) {
      return;
    }

    this.quantities.update((quantities) => ({
      ...quantities,

      [dishId]: (quantities[dishId] ?? 0) + 1,
    }));
  }

  decreaseDish(dishId: string): void {
    this.quantities.update((quantities) => {
      const currentQuantity = quantities[dishId] ?? 0;

      if (currentQuantity <= 1) {
        return removeQuantity(quantities, dishId);
      }

      return {
        ...quantities,
        [dishId]: currentQuantity - 1,
      };
    });
  }

  removeDish(dishId: string): void {
    this.quantities.update((quantities) => removeQuantity(quantities, dishId));
  }

  submitChanges(): void {
    this.submitError.set(null);

    if (!this.orderId || !this.canEdit() || this.submitting()) {
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
      this.submitError.set('L’ordine deve contenere almeno un piatto.');

      return;
    }

    if (this.hasUnavailableSelectedDishes()) {
      this.submitError.set('Rimuovi dalla comanda i piatti non più disponibili prima di salvare.');

      return;
    }

    const formValue = this.orderForm.getRawValue();

    const request: UpdateStaffOrderRequest = {
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
      .updateOrder(this.orderId, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (updatedOrder) => {
          this.order.set(updatedOrder);

          this.updatedOrder.set(updatedOrder);

          this.orderForm.disable();
        },

        error: (error: unknown) => {
          console.error('Errore durante la modifica dell’ordine.', error);

          this.submitError.set(
            getApiErrorMessage(error, 'Non è stato possibile modificare l’ordine.'),
          );
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

function mergeCurrentCustomer(customers: readonly UserLight[], order: Order): readonly UserLight[] {
  if (customers.some((customer) => customer.id === order.user.id)) {
    return customers;
  }

  return [order.user, ...customers];
}

function mergeCurrentDishes(dishes: readonly Dish[], order: Order): readonly Dish[] {
  const knownDishIds = new Set(dishes.map((dish) => dish.id));

  const missingDishes: Dish[] = order.items
    .filter((item) => !knownDishIds.has(item.dish.id))
    .map((item) => ({
      id: item.dish.id,
      name: item.dish.name,
      description: null,
      price: item.dish.price,
      category: item.dish.category,
      available: item.dish.available,
      imageUrl: null,
    }));

  return [...dishes, ...missingDishes].sort((first, second) =>
    first.name.localeCompare(second.name, 'it'),
  );
}

function removeQuantity(
  quantities: Readonly<Record<string, number>>,
  dishId: string,
): Readonly<Record<string, number>> {
  const nextQuantities: Record<string, number> = {
    ...quantities,
  };

  delete nextQuantities[dishId];

  return nextQuantities;
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
