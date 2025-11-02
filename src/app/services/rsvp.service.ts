import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface RsvpPayload {
  name: string;
  attending: boolean;
  adults: number;
  children: number;
  phone?: string;
  message?: string;
  extras?: {
    companionName?: string;
    kids?: Array<{ name: string; age: number }>;
  };
}

@Injectable({ providedIn: 'root' })
export class RsvpService {
  private http = inject(HttpClient);
  private base = '/api/rsvp';

  // Retorna Observable para funcionar com .subscribe() nos componentes existentes
  submit(payload: RsvpPayload): Observable<{ ok: boolean; id: string }> {
    return this.http.post<{ ok: boolean; id: string }>(this.base, payload);
  }
}
