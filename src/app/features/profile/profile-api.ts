import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UpdateProfileRequest, UserProfile } from './profile';

@Injectable({
  providedIn: 'root',
})
export class ProfileApi {
  private readonly http = inject(HttpClient);

  private readonly profileUrl = `${environment.apiBaseUrl.replace(/\/+$/, '')}/me`;

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.profileUrl);
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(this.profileUrl, request);
  }
}
