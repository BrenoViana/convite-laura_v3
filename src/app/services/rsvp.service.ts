import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RsvpService {
  constructor(private http: HttpClient) {}
  submit(payload: any): Observable<any> {
    return this.http.post('/api/rsvp', payload);
  }
}
