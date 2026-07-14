import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import { RestaurantTable } from './restaurant-table';

@Injectable({
  providedIn: 'root',
})
export class RestaurantTableApi {
  private readonly http = inject(HttpClient);

  private readonly tablesUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/tables`;

  getActiveTables(): Observable<PageResponse<RestaurantTable>> {
    const params = new HttpParams()
      .set('active', true)
      .set('page', 0)
      .set('size', 100)
      .set('sort', 'number,asc');

    return this.http.get<PageResponse<RestaurantTable>>(this.tablesUrl, { params });
  }
}
