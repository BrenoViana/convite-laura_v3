import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";              // <-- ADICIONADO
import { CountdownComponent } from "./components/countdown/countdown.component";
import { CarouselSwiperComponent } from "./components/carousel-swiper/carousel-swiper.component";
import { PetalsCanvasComponent } from "./components/petals-canvas/petals-canvas.component";
import { environment } from "../environments/environment";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,                                           // <-- ADICIONADO
    CarouselSwiperComponent,
    CountdownComponent,
    PetalsCanvasComponent
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  env = environment;

  get photosSafe(): string[] {
    const arr = Array.isArray(this.env.photos) ? this.env.photos : [];
    return arr.length ? arr : ["/assets/photos/placeholder.svg"];
  }

  private eventDate = new Date(environment.eventDateISO);
  get dateStr(): string {
    return this.eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  get timeStr(): string {
    return this.eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  get mapsUrl(): string {
    return `https://www.google.com/maps/search/?api=1&query=${environment.mapsQuery}`;
  }
  icsUrl = "assets/event.ics";

  addressMain = "";
  venue = "";

  constructor() {
    const res = this.parseAddress(environment.addressText || "");
    this.addressMain = res.main;
    this.venue = res.venue;
  }

  private parseAddress(text: string): { main: string; venue: string } {
    if (!text) return { main: "", venue: "" };

    let clean = text.replace(/<\/?a\b[^>]*>/gi, "").trim();
    const lastPipe = clean.lastIndexOf("|");
    if (lastPipe > -1) {
      const main = clean.slice(0, lastPipe).trim().replace(/\s*\|\s*$/, "");
      const venue = clean.slice(lastPipe + 1).trim();
      return { main, venue };
    }
    const fb = clean.match(/^(.*?)(Casa\s+da\s+Alegria.*)$/i);
    if (fb) {
      return { main: fb[1].trim().replace(/\s*\|\s*$/, ""), venue: fb[2].trim() };
    }
    return { main: clean, venue: "" };
  }
}
