import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

export type RsvpPayload = {
  name: string;
  attending: boolean;
  adults?: number;
  children?: number;
  phone?: string;
  message?: string;
};

@Injectable({ providedIn: "root" })
export class RsvpService {
  constructor(private http: HttpClient) {}
  submit(data: RsvpPayload) {
    return this.http.post<{ ok: boolean; id: string }>("/api/rsvp", data);
  }
}