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

  // Fotos seguras (evita tela em branco se array vier vazio)
  get photosSafe(): string[] {
    const arr = Array.isArray(this.env.photos) ? this.env.photos : [];
    return arr.length ? arr : ["/assets/photos/placeholder.svg"];
  }

  // Data/Hora
  private eventDate = new Date(environment.eventDateISO);
  get dateStr(): string {
    return this.eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  get timeStr(): string {
    return this.eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  // Ações
  get mapsUrl(): string {
    return `https://www.google.com/maps/search/?api=1&query=${environment.mapsQuery}`;
  }
  icsUrl = "assets/event.ics";

  // Endereço: sem link no CEP; destaque do local (após "|")
  addressMain = "";
  cep: string | null = null;
  venue: string | null = null;

  constructor() {
    const raw = environment.addressText || "";

    // separa parte do endereço e o local (após "|")
    const [addrAndCepRaw, venueRaw] = raw.split("|").map(s => (s ?? "").trim());
    this.venue = venueRaw || null;

    // detecta CEP e remove da string principal
    const cepMatch = addrAndCepRaw.match(/\b\d{5}-?\d{3}\b/);
    this.cep = cepMatch ? cepMatch[0] : null;

    this.addressMain = this.cep
      ? addrAndCepRaw.replace(new RegExp(`\\s*,?\\s*${this.cep}\\s*`), "").trim()
      : addrAndCepRaw.trim();
  }
}
