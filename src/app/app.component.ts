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

  // Modais
  giftsOpen = false;
  rsvpOpen = false;

  // Formulário
  form: FormGroup<{
    name: FormControl<string | null>;
    hasChildren: FormControl<boolean>;
    children: FormArray<FormGroup<KidFG>>;
  }>;

  // Status envio
  isSubmitting = false;
  submitOk = false;
  submitError = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: this.fb.control<string | null>(null, { validators: [Validators.required, Validators.minLength(2)] }),
      hasChildren: this.fb.control<boolean>(false, { nonNullable: true }),
      children: this.fb.array<FormGroup<KidFG>>([])
    });

    // Limpa crianças se desmarcar
    this.form.get("hasChildren")!.valueChanges.subscribe(v => { if (!v) this.children.clear(); });

    this.prepareAddressParts();
  }

  // Fotos carrossel
  get photosSafe(): string[] {
    const arr = Array.isArray(this.env.photos) ? this.env.photos : [];
    return arr.length ? arr : ["/assets/photos/placeholder.svg"];
  }

  // Data e hora
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
  get icsUrl(): string { return this.env.icsPath || "assets/event.ics"; }

  // Endereço
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

  // Gifts modal
  openGifts(e?: Event) { e?.preventDefault(); this.giftsOpen = true; }
  closeGifts() { this.giftsOpen = false; }

  async copyAddress() {
    const address = "Rua Treze de Maio, 300 – São Luiz, Antônio Prado/RS | 95250-000";
    try {
      await navigator.clipboard.writeText(address);
      alert("Endereço copiado! 📋");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Endereço copiado! 📋");
    }
  }

  // RSVP modal
  openRsvp(e?: Event) {
    e?.preventDefault();
    this.submitOk = false;
    this.submitError = false;
    this.isSubmitting = false;
    this.rsvpOpen = true;
  }
  closeRsvp() { this.rsvpOpen = false; }

  // Helpers de crianças (getter EXISTE!)
  get children(): FormArray<FormGroup<KidFG>> {
    return this.form.get("children") as FormArray<FormGroup<KidFG>>;
  }
  addChild() {
    const g = this.fb.group<KidFG>({
      name: this.fb.control<string | null>(null, { validators: [Validators.required, Validators.minLength(2)] }),
      age: this.fb.control<number | null>(null, { validators: [Validators.required, Validators.min(0), Validators.max(18)] })
    });
    this.children.push(g);
  }
  removeChild(i: number) { this.children.removeAt(i); }

  // Envio
  async submitRsvp() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isSubmitting = true;
    this.submitOk = false;
    this.submitError = false;

    const v = this.form.value;
    const payload = {
      name: (v.name || "").trim(),
      hasChildren: !!v.hasChildren,
      children: !!v.hasChildren
        ? this.children.getRawValue()
            .filter(k => (k.name ?? "").trim())
            .map(k => ({ name: (k.name ?? "").trim(), age: Number(k.age ?? 0) }))
        : []
    };

    try {
      const resp = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        console.error("RSVP POST falhou:", resp.status, txt);
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json().catch(() => ({} as any));
      if (!data?.ok) throw new Error(data?.error || "Falha inesperada");

      this.submitOk = true;
      this.form.reset({ name: null, hasChildren: false });
      this.children.clear();
      setTimeout(() => this.closeRsvp(), 1200);
    } catch (err) {
      console.error(err);
      this.submitError = true;
    } finally {
      this.isSubmitting = false;
    }
  }
}
