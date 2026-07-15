import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import { Order } from '../orders/order';
import { Reservation } from '../reservations/reservation';
import {
  AppUser,
  CustomerFilters,
  UserFilters,
  UserLight,
  UserOrderFilters,
  UserReservationFilters,
} from './user';

@Injectable({
  providedIn: 'root',
})
export class UserApi {
  private readonly http = inject(HttpClient);

  private readonly usersUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/users`;

  getUsers(filters: UserFilters = {}): Observable<PageResponse<AppUser>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 12)
      .set('sort', filters.sort ?? 'username,asc');

    if (filters.role) {
      params = params.set('role', filters.role);
    }

    return this.http.get<PageResponse<AppUser>>(this.usersUrl, { params });
  }

  getUserById(id: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.usersUrl}/${encodeURIComponent(id)}`);
  }

  getUserOrders(id: string, filters: UserOrderFilters = {}): Observable<PageResponse<Order>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 5)
      .set('sort', filters.sort ?? 'orderDate,desc');

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }

    return this.http.get<PageResponse<Order>>(`${this.usersUrl}/${encodeURIComponent(id)}/orders`, {
      params,
    });
  }

  getUserReservations(
    id: string,
    filters: UserReservationFilters = {},
  ): Observable<PageResponse<Reservation>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 5)
      .set('sort', filters.sort ?? 'date,desc');

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }

    return this.http.get<PageResponse<Reservation>>(
      `${this.usersUrl}/${encodeURIComponent(id)}/reservations`,
      { params },
    );
  }
  getCustomers(filters: CustomerFilters = {}): Observable<PageResponse<UserLight>> {
    const params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 100)
      .set('sort', filters.sort ?? 'username,asc');

    return this.http.get<PageResponse<UserLight>>(`${this.usersUrl}/customers`, { params });
  }
}
