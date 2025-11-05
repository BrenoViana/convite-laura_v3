import { Injectable } from '@angular/core';

export type Kid = { name: string; age: number };
export type RsvpPayload = {
  name: string;
  attending: boolean;
  adults: number;
  hasCompanion?: boolean;
  companionName?: string;
  hasChildren?: boolean;
  children?: Kid[] | number;
  phone?: string;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class RsvpService {
  private base = '/api/rsvp';

  async submit(data: RsvpPayload): Promise<{ ok: boolean; id: string } | undefined> {
    const r = await fetch(this.base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
}
