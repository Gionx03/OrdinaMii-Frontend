import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import { CreateMyOrderRequest, MyOrderFilters, Order } from './order';

@Injectable({
  providedIn: 'root',
})
export class OrderApi {
  private readonly http = inject(HttpClient);

  private readonly myOrdersUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/me/orders`;

  createMyOrder(request: CreateMyOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.myOrdersUrl, request);
  }

  getMyOrders(filters: MyOrderFilters = {}): Observable<PageResponse<Order>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'orderDate,desc');

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }

    return this.http.get<PageResponse<Order>>(this.myOrdersUrl, { params });
  }
}
