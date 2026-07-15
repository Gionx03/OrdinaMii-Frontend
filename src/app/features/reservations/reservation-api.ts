import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import {
  CreateMyReservationRequest,
  CreateStaffReservationRequest,
  MyReservationFilters,
  Reservation,
  ReservationStatus,
  StaffReservationFilters,
  UpdateReservationStatusPayload,
  UpdateStaffReservationRequest,
} from './reservation';

@Injectable({
  providedIn: 'root',
})
export class ReservationApi {
  private readonly http = inject(HttpClient);

  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  private readonly reservationsUrl = `${this.apiBaseUrl}/reservations`;

  private readonly myReservationsUrl = `${this.apiBaseUrl}/me/reservations`;

  createMyReservation(request: CreateMyReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.myReservationsUrl, request);
  }

  getMyReservations(filters: MyReservationFilters = {}): Observable<PageResponse<Reservation>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'date,asc');

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }

    return this.http.get<PageResponse<Reservation>>(this.myReservationsUrl, { params });
  }

  getReservations(filters: StaffReservationFilters = {}): Observable<PageResponse<Reservation>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'date,asc');

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.userId) {
      params = params.set('user_id', filters.userId);
    }

    if (filters.tableId) {
      params = params.set('table_id', filters.tableId);
    }

    if (filters.date) {
      params = params.set('data', filters.date);
    }

    return this.http.get<PageResponse<Reservation>>(this.reservationsUrl, { params });
  }

  getReservationById(reservationId: string): Observable<Reservation> {
    return this.http.get<Reservation>(
      `${this.reservationsUrl}/${encodeURIComponent(reservationId)}`,
    );
  }

  createReservation(request: CreateStaffReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.reservationsUrl, request);
  }

  updateReservation(
    reservationId: string,
    request: UpdateStaffReservationRequest,
  ): Observable<Reservation> {
    return this.http.put<Reservation>(
      `${this.reservationsUrl}/${encodeURIComponent(reservationId)}`,
      request,
    );
  }

  updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
  ): Observable<Reservation> {
    const request: UpdateReservationStatusPayload = {
      status,
    };

    return this.http.put<Reservation>(
      `${this.reservationsUrl}/${encodeURIComponent(reservationId)}/status`,
      request,
    );
  }
}
