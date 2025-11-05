import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { environment } from "../environments/environment";

import { CountdownComponent } from "./components/countdown/countdown.component";
import { CarouselSwiperComponent } from "./components/carousel-swiper/carousel-swiper.component";
import { PetalsCanvasComponent } from "./components/petals-canvas/petals-canvas.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, CountdownComponent, CarouselSwiperComponent, PetalsCanvasComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  env = environment;

  // Modais
  giftsOpen = false;
  rsvpOpen  = false;

  // Fotos seguras
  get photosSafe(): string[] {
    const arr = Array.isArray(this.env.photos) ? this.env.photos : [];
    return arr.length ? arr : ["/assets/photos/placeholder.svg"];
  }

  // Data/Hora
  private eventDate = new Date(this.env.eventDateISO);
  get dateStr(): string {
    return this.eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  get timeStr(): string {
    return this.eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  // Links
  get mapsUrl(): string {
    const q = encodeURIComponent(this.env.mapsQuery || this.addressMain);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  get icsUrl(): string {
    return this.env.icsPath || "assets/event.ics";
  }

  // Endereço
  addressMain = "";
  cep: string | null = null;
  venue: string | null = null;

  constructor() {
    const raw = this.env.addressText || "";
    const [addrAndCepRaw, venueRaw] = raw.split("|").map(s => (s ?? "").trim());
    this.venue = venueRaw || null;

    const cepMatch = addrAndCepRaw.match(/\b\d{5}-?\d{3}\b/);
    this.cep = cepMatch ? cepMatch[0] : null;

    this.addressMain = this.cep
      ? addrAndCepRaw.replace(new RegExp(`\\s*,?\\s*${this.cep}\\s*`), "").trim()
      : addrAndCepRaw.trim();
  }

  // Presentes (modal)
  openGifts(ev?: Event){ ev?.preventDefault(); this.giftsOpen = true; }
  closeGifts(){ this.giftsOpen = false; }

  async copyAddress(){
    const text = "Rua Treze de Maio, nº 300 - Bairro São Luiz - Antônio Prado/RS - CEP: 95250-000";
    try {
      await navigator.clipboard.writeText(text);
      // feedback simples
      alert("Endereço copiado!");
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
      alert("Endereço copiado!");
    }
  }

  // RSVP (modal inicial)
  openRsvp(ev?: Event){ ev?.preventDefault(); this.rsvpOpen = true; }
  closeRsvp(){ this.rsvpOpen = false; }
}
