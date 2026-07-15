import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/http/page-response';
import {
  AssistanceRequest,
  AssistanceRequestFilters,
  AssistanceRequestStatus,
  CreateAssistanceRequestPayload,
  UpdateAssistanceRequestStatusPayload,
} from './assistance-request';

@Injectable({
  providedIn: 'root',
})
export class AssistanceRequestApi {
  private readonly http = inject(HttpClient);

  private readonly assistanceRequestsUrl = `${environment.apiBaseUrl.replace(
    /\/+$/,
    '',
  )}/assistance-requests`;

  createAssistanceRequest(request: CreateAssistanceRequestPayload): Observable<AssistanceRequest> {
    return this.http.post<AssistanceRequest>(this.assistanceRequestsUrl, request);
  }

  getAssistanceRequests(
    filters: AssistanceRequestFilters = {},
  ): Observable<PageResponse<AssistanceRequest>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10)
      .set('sort', filters.sort ?? 'createdAt,desc');

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.tableId) {
      params = params.set('table_id', filters.tableId);
    }

    return this.http.get<PageResponse<AssistanceRequest>>(this.assistanceRequestsUrl, { params });
  }

  updateAssistanceRequestStatus(
    requestId: string,
    status: AssistanceRequestStatus,
  ): Observable<AssistanceRequest> {
    const request: UpdateAssistanceRequestStatusPayload = {
      status,
    };

    return this.http.put<AssistanceRequest>(
      `${this.assistanceRequestsUrl}/${requestId}/status`,
      request,
    );
  }
}
