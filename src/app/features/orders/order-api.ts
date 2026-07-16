import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import { AssistanceRequest } from '../assistance-request/assistance-request';
import {
  CreateMyOrderRequest,
  MyOrderFilters,
  Order,
  OrderStatus,
  PaymentStatus,
  StaffOrderFilters,
  UpdateOrderStatusPayload,
  UpdatePaymentStatusPayload,
  CreateStaffOrderRequest,
  UpdateStaffOrderRequest,
} from './order';

@Injectable({
  providedIn: 'root',
})
export class OrderApi {
  private readonly http = inject(HttpClient);

  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  private readonly ordersUrl = `${this.apiBaseUrl}/orders`;

  private readonly myOrdersUrl = `${this.apiBaseUrl}/me/orders`;

  createMyOrder(request: CreateMyOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.myOrdersUrl, request);
  }

  payMyOrder(orderId: string): Observable<Order> {
    return this.http.post<Order>(`${this.myOrdersUrl}/${encodeURIComponent(orderId)}/pay`, null);
  }

  requestWaiterPayment(orderId: string): Observable<Order> {
    return this.http.post<Order>(
      `${this.myOrdersUrl}/${encodeURIComponent(orderId)}/request-payment`,
      null,
    );
  }

  requestAssistanceForOrder(orderId: string): Observable<AssistanceRequest> {
    return this.http.post<AssistanceRequest>(
      `${this.myOrdersUrl}/${encodeURIComponent(orderId)}/assistance`,
      null,
    );
  }

  createOrder(request: CreateStaffOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.ordersUrl, request);
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

  getOrders(filters: StaffOrderFilters = {}): Observable<PageResponse<Order>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'orderDate,desc');

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.customerId) {
      params = params.set('customer_id', filters.customerId);
    }

    if (filters.date) {
      params = params.set('data', filters.date);
    }

    return this.http.get<PageResponse<Order>>(this.ordersUrl, { params });
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<Order> {
    const request: UpdateOrderStatusPayload = {
      status,
    };

    return this.http.put<Order>(`${this.ordersUrl}/${orderId}/status`, request);
  }

  updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Observable<Order> {
    const request: UpdatePaymentStatusPayload = {
      paymentStatus,
    };

    return this.http.put<Order>(`${this.ordersUrl}/${orderId}/payment-status`, request);
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.ordersUrl}/${encodeURIComponent(orderId)}`);
  }

  updateOrder(orderId: string, request: UpdateStaffOrderRequest): Observable<Order> {
    return this.http.put<Order>(`${this.ordersUrl}/${encodeURIComponent(orderId)}`, request);
  }
}
