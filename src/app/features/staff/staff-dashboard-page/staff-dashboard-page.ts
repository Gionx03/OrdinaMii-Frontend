import { DatePipe } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { APP_ROLE } from '../../../core/auth/app-role';
import { AuthService } from '../../../core/auth/auth-service';
import { ASSISTANCE_REQUEST_STATUS } from '../../assistance-request/assistance-request';
import { AssistanceRequestApi } from '../../assistance-request/assistance-request-api';
import { ORDER_STATUS } from '../../orders/order';
import { OrderApi } from '../../orders/order-api';
import { RESERVATION_STATUS } from '../../reservations/reservation';
import { ReservationApi } from '../../reservations/reservation-api';

type DashboardTone = 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'gold' | 'teal';

interface StaffAction {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly route: string;
  readonly tone: DashboardTone;
}

interface OverviewMetric {
  readonly label: string;
  readonly value: number;
  readonly description: string;
  readonly route: string;

  readonly tone: 'orange' | 'blue' | 'purple' | 'green';
}

@Component({
  selector: 'app-staff-dashboard-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './staff-dashboard-page.html',
  styleUrl: './staff-dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDashboardPage implements OnInit {
  private readonly authService = inject(AuthService);

  private readonly orderApi = inject(OrderApi);

  private readonly reservationApi = inject(ReservationApi);

  private readonly assistanceApi = inject(AssistanceRequestApi);

  private readonly destroyRef = inject(DestroyRef);

  private readonly today = toLocalIsoDate(new Date());

  readonly pendingOrders = signal(0);

  readonly preparingOrders = signal(0);

  readonly todayReservations = signal(0);

  readonly pendingAssistanceRequests = signal(0);

  readonly overviewLoading = signal(true);

  readonly overviewError = signal<string | null>(null);

  readonly overviewUpdatedAt = signal<Date | null>(null);

  readonly canManageDiningRoom = computed(() =>
    this.authService.hasAnyRole([APP_ROLE.ADMIN, APP_ROLE.CAMERIERE]),
  );

  readonly roleLabel = computed(() => {
    if (this.authService.hasRole(APP_ROLE.ADMIN)) {
      return 'Amministratore';
    }

    if (this.authService.hasRole(APP_ROLE.CAMERIERE)) {
      return 'Cameriere';
    }

    return 'Cuoco';
  });

  readonly overviewMetrics = computed<readonly OverviewMetric[]>(() => {
    const metrics: OverviewMetric[] = [
      {
        label: 'Ordini in attesa',
        value: this.pendingOrders(),

        description: 'Comande ancora da prendere in carico.',

        route: '/staff/orders',
        tone: 'orange',
      },
      {
        label: 'In preparazione',
        value: this.preparingOrders(),

        description: 'Comande attualmente in cucina.',

        route: '/staff/orders',
        tone: 'green',
      },
    ];

    if (this.canManageDiningRoom()) {
      metrics.push(
        {
          label: 'Prenotazioni di oggi',

          value: this.todayReservations(),

          description: 'Prenotazioni confermate previste oggi.',

          route: '/staff/reservations',

          tone: 'blue',
        },
        {
          label: 'Assistenza aperta',

          value: this.pendingAssistanceRequests(),

          description: 'Richieste della sala ancora da risolvere.',

          route: '/staff/assistance',

          tone: 'purple',
        },
      );
    }

    return metrics;
  });

  readonly actions = computed<readonly StaffAction[]>(() => {
    const actions: StaffAction[] = [];

    if (this.authService.hasAnyRole([APP_ROLE.ADMIN, APP_ROLE.CAMERIERE, APP_ROLE.CUOCO])) {
      actions.push(
        {
          code: 'ORD',
          title: 'Gestione ordini',

          description: 'Controlla gli ordini e aggiorna preparazione, servizio e pagamento.',

          route: '/staff/orders',
          tone: 'orange',
        },
        {
          code: 'PIA',
          title: 'Gestione piatti',

          description: 'Crea e modifica i piatti e controlla la loro disponibilità.',

          route: '/staff/dishes',
          tone: 'green',
        },
      );
    }

    if (this.canManageDiningRoom()) {
      actions.push(
        {
          code: 'COM',
          title: 'Nuovo ordine',

          description: 'Registra una comanda al tavolo o una richiesta d’asporto.',

          route: '/staff/orders/new',

          tone: 'gold',
        },
        {
          code: 'PRE',

          title: 'Gestione prenotazioni',

          description: 'Consulta le prenotazioni e aggiorna lo stato dei tavoli prenotati.',

          route: '/staff/reservations',

          tone: 'blue',
        },
        {
          code: 'NUO',

          title: 'Nuova prenotazione',

          description: 'Registra una prenotazione ricevuta al telefono o direttamente in sala.',

          route: '/staff/reservations/new',

          tone: 'teal',
        },
        {
          code: 'ASS',

          title: 'Richieste di assistenza',

          description: 'Visualizza le richieste inviate dalla sala e indica quelle risolte.',

          route: '/staff/assistance',

          tone: 'purple',
        },
      );
    }

    if (this.authService.hasRole(APP_ROLE.ADMIN)) {
      actions.push(
        {
          code: 'TAV',

          title: 'Gestione tavoli',

          description: 'Configura numero, capienza e disponibilità dei tavoli del locale.',

          route: '/staff/tables',

          tone: 'red',
        },
        {
          code: 'UTE',

          title: 'Gestione utenti',

          description: 'Consulta gli account registrati, gli ordini e le prenotazioni.',

          route: '/staff/users',

          tone: 'gold',
        },
      );
    }

    return actions;
  });

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.overviewLoading.set(true);
    this.overviewError.set(null);

    if (this.canManageDiningRoom()) {
      this.loadDiningRoomOverview();
      return;
    }

    this.loadKitchenOverview();
  }

  private loadKitchenOverview(): void {
    forkJoin({
      pendingOrders: this.orderApi.getOrders({
        status: ORDER_STATUS.PENDING,

        page: 0,
        size: 1,
      }),

      preparingOrders: this.orderApi.getOrders({
        status: ORDER_STATUS.PREPARING,

        page: 0,
        size: 1,
      }),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        finalize(() => this.overviewLoading.set(false)),
      )
      .subscribe({
        next: ({ pendingOrders, preparingOrders }) => {
          this.pendingOrders.set(pendingOrders.totalElements);

          this.preparingOrders.set(preparingOrders.totalElements);

          this.overviewUpdatedAt.set(new Date());
        },

        error: (error: unknown) => this.handleOverviewError(error),
      });
  }

  private loadDiningRoomOverview(): void {
    forkJoin({
      pendingOrders: this.orderApi.getOrders({
        status: ORDER_STATUS.PENDING,

        page: 0,
        size: 1,
      }),

      preparingOrders: this.orderApi.getOrders({
        status: ORDER_STATUS.PREPARING,

        page: 0,
        size: 1,
      }),

      reservations: this.reservationApi.getReservations({
        status: RESERVATION_STATUS.CONFIRMED,

        date: this.today,
        page: 0,
        size: 1,
      }),

      assistance: this.assistanceApi.getAssistanceRequests({
        status: ASSISTANCE_REQUEST_STATUS.PENDING,

        page: 0,
        size: 1,
      }),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        finalize(() => this.overviewLoading.set(false)),
      )
      .subscribe({
        next: ({ pendingOrders, preparingOrders, reservations, assistance }) => {
          this.pendingOrders.set(pendingOrders.totalElements);

          this.preparingOrders.set(preparingOrders.totalElements);

          this.todayReservations.set(reservations.totalElements);

          this.pendingAssistanceRequests.set(assistance.totalElements);

          this.overviewUpdatedAt.set(new Date());
        },

        error: (error: unknown) => this.handleOverviewError(error),
      });
  }

  private handleOverviewError(error: unknown): void {
    console.error('Errore durante il caricamento del riepilogo staff.', error);

    this.overviewError.set('Non è stato possibile aggiornare il riepilogo operativo.');
  }
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
