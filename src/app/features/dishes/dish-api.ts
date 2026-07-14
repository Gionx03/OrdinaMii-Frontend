import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResponse } from '../../core/http/page-response';
import { environment } from '../../../environments/environment';
import { Dish, DishFilters } from './dish';

@Injectable({
  providedIn: 'root',
})
export class DishApi {
  private readonly http = inject(HttpClient);

  private readonly dishesUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/dishes`;

  getDishes(filters: DishFilters = {}): Observable<PageResponse<Dish>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 12)
      .set('sort', filters.sort ?? 'name,asc');

    if (filters.category) {
      params = params.set('category', filters.category);
    }

    const name = filters.name?.trim();

    if (name) {
      params = params.set('name', name);
    }

    const description = filters.description?.trim();

    if (description) {
      params = params.set('descr', description);
    }

    if (filters.available !== undefined) {
      params = params.set('available', filters.available);
    }

    return this.http.get<PageResponse<Dish>>(this.dishesUrl, {
      params,
    });
  }

  getDishById(id: string): Observable<Dish> {
    return this.http.get<Dish>(`${this.dishesUrl}/${encodeURIComponent(id)}`);
  }
}
