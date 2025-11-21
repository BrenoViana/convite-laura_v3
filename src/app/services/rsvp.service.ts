// src/app/services/rsvp.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface KidFrontend {
  name: string;
  age: number;
}

interface RsvpPayload {
  fullName: string;
  bringsChildren: boolean;
  children?: KidFrontend[];
}

interface RsvpSuccessResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class RsvpService {
  private http = inject(HttpClient);
  private workerUrl = 'https://convite-laura-rsvp-api.breno-viana.workers.dev/rsvp';

  constructor() { }

  submitRsvp(data: RsvpPayload): Observable<RsvpSuccessResponse> {
    return this.http.post<RsvpSuccessResponse>(this.workerUrl, data);
  }
}
