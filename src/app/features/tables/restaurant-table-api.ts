import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import {
  RestaurantTable,
  RestaurantTableFilters,
  UpsertRestaurantTablePayload,
} from './restaurant-table';

@Injectable({
  providedIn: 'root',
})
export class RestaurantTableApi {
  private readonly http = inject(HttpClient);

  private readonly tablesUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/tables`;

  getTables(filters: RestaurantTableFilters = {}): Observable<PageResponse<RestaurantTable>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'number,asc');

    if (filters.active !== undefined) {
      params = params.set('active', filters.active);
    }

    return this.http.get<PageResponse<RestaurantTable>>(this.tablesUrl, { params });
  }

  getActiveTables(): Observable<PageResponse<RestaurantTable>> {
    return this.getTables({
      active: true,
      page: 0,
      size: 100,
      sort: 'number,asc',
    });
  }

  getTableById(id: string): Observable<RestaurantTable> {
    return this.http.get<RestaurantTable>(`${this.tablesUrl}/${encodeURIComponent(id)}`);
  }

  createTable(request: UpsertRestaurantTablePayload): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>(this.tablesUrl, request);
  }

  updateTable(id: string, request: UpsertRestaurantTablePayload): Observable<RestaurantTable> {
    return this.http.put<RestaurantTable>(`${this.tablesUrl}/${encodeURIComponent(id)}`, request);
  }

  deleteTable(id: string): Observable<RestaurantTable> {
    return this.http.delete<RestaurantTable>(`${this.tablesUrl}/${encodeURIComponent(id)}`);
  }
}
