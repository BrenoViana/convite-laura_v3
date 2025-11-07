// src/app/rsvp.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Defina uma interface para o objeto de RSVP que o Worker espera
interface RsvpPayload {
  fullName: string;
  bringsChildren: boolean;
}

// Interface para a resposta de sucesso do Worker
interface RsvpSuccessResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class RsvpService {
  // **IMPORTANTE**: Substitua esta URL pela URL do seu Worker + o path '/rsvp'
  // Sua URL deployada é: https://convite-laura-rsvp-api.breno-viana.workers.dev
  private workerUrl = 'https://convite-laura-rsvp-api.breno-viana.workers.dev/rsvp';

  constructor(private http: HttpClient) { }

  // Garanta que esta função submitRsvp esteja aqui e salva.
  submitRsvp(data: RsvpPayload): Observable<RsvpSuccessResponse> {
    return this.http.post<RsvpSuccessResponse>(this.workerUrl, data);
  }
}
