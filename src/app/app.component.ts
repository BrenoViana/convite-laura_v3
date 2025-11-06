import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { environment } from "../environments/environment";

import { CountdownComponent } from "./components/countdown/countdown.component";
import { CarouselSwiperComponent } from "./components/carousel-swiper/carousel-swiper.component";
import { PetalsCanvasComponent } from "./components/petals-canvas/petals-canvas.component";

type KidFG = {
  name: FormControl<string | null>;
  age: FormControl<number | null>;
};

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CountdownComponent,
    CarouselSwiperComponent,
    PetalsCanvasComponent
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  env = environment;

  giftsOpen = false;
  rsvpOpen = false;

  form: FormGroup<{
    name: FormControl<string | null>;
    hasChildren: FormControl<boolean>;
    children: FormArray<FormGroup<KidFG>>;
  }>;

  isSubmitting = false;
  submitOk = false;
  submitError = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: this.fb.control<string | null>(null, { validators: [Validators.required, Validators.minLength(2)] }),
      hasChildren: this.fb.control<boolean>(false, { nonNullable: true }),
      children: this.fb.array<FormGroup<KidFG>>([])
    });

    this.form.get('hasChildren')!.valueChanges.subscribe(val => {
      if (!val) this.children.clear();
    });

    this.prepareAddressParts();
  }

  get photosSafe(): string[] {
    const arr = Array.isArray(this.env.photos) ? this.env.photos : [];
    return arr.length ? arr : ["/assets/photos/placeholder.svg"];
  }

  private eventDate = new Date(this.env.eventDateISO);
  get dateStr(): string {
    return this.eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  get timeStr(): string {
    return this.eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  get mapsUrl(): string {
    const q = encodeURIComponent(this.env.mapsQuery || this.addressMain);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  get icsUrl(): string {
    return this.env.icsPath || "assets/event.ics";
  }

  addressMain = "";
  cep: string | null = null;
  venue: string | null = null;

  private prepareAddressParts() {
    const raw = this.env.addressText || "";
    const [addrAndCepRaw, venueRaw] = raw.split("|").map(s => (s ?? "").trim());
    this.venue = venueRaw || null;

    const cepMatch = addrAndCepRaw.match(/\b\d{5}-?\d{3}\b/);
    this.cep = cepMatch ? cepMatch[0] : null;

    this.addressMain = this.cep
      ? addrAndCepRaw.replace(new RegExp(`\\s*,?\\s*${this.cep}\\s*`), "").trim()
      : addrAndCepRaw.trim();
  }

  openGifts(ev?: Event) { ev?.preventDefault(); this.giftsOpen = true; }
  closeGifts() { this.giftsOpen = false; }

  async copyAddress() {
    const address = "Rua Treze de Maio, 300 – São Luiz, Antônio Prado/RS | 95250-000";
    try {
      await navigator.clipboard.writeText(address);
      alert("Endereço copiado! 📋");
    } catch {
      const ta = document.createElement('textarea');
      ta.value = address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert("Endereço copiado! 📋");
    }
  }
