import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { environment } from "../environments/environment";
import { RsvpService } from "./services/rsvp.service";

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
export class AppComponent implements OnInit {
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

  // Injetamos o RsvpService no construtor
  constructor(private fb: FormBuilder, private rsvpService: RsvpService) {
    this.form = this.fb.group({
      name: this.fb.control<string | null>(null, { validators: [Validators.required, Validators.minLength(2)] }),
      hasChildren: this.fb.control<boolean>(false, { nonNullable: true }),
      children: this.fb.array<FormGroup<KidFG>>([])
    });

    // Limpa crianças se desmarcar
    this.form.get("hasChildren")!.valueChanges.subscribe(v => { if (!v) this.children.clear(); });
  }

  ngOnInit() {
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
      ? addrAndCepRaw.replace(new RegExp(`\s*,?\s*${this.cep}\s*`), "").trim()
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

  // Envio - ADAPTADO PARA USAR O SERVIÇO RSVP E ENVIAR DADOS COMPATÍVEIS COM O WORKER
  submitRsvp() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError = true; // Indicar erro de validação do formulário
      return;
    }

    this.isSubmitting = true;
    this.submitOk = false;
    this.submitError = false;

    const v = this.form.value;
    const payload = {
      fullName: (v.name || "").trim(), // Mapeia 'name' do formulário para 'fullName' do Worker
      bringsChildren: !!v.hasChildren, // Mapeia 'hasChildren' para 'bringsChildren'
      // ATENÇÃO: Os detalhes do array 'children' NÃO serão enviados ao Worker com a configuração atual.
      // Se precisar armazená-los, o esquema do D1 e o código do Worker precisam ser estendidos.
    };

    this.rsvpService.submitRsvp(payload).subscribe({
      next: (response: { message: string }) => { // <-- CORREÇÃO AQUI
        // A API retorna um JSON com { message: '...' } em caso de sucesso
        console.log("RSVP enviado com sucesso:", response.message);
        this.submitOk = true;
        this.submitError = false;
        this.form.reset({ name: null, hasChildren: false }); // Limpa o formulário
        this.children.clear(); // Limpa o FormArray de crianças
        setTimeout(() => this.closeRsvp(), 1200); // Fecha o modal após um pequeno delay
      },
      error: (err: any) => { // <-- CORREÇÃO AQUI
        console.error("Erro ao enviar RSVP:", err);
        this.submitError = true;
        this.submitOk = false;
        // O erro do Worker pode vir em err.error?.error ou err.error?.details
        // Você pode mostrar isso ao usuário se quiser:
        // this.errorMessage = err.error?.error || err.error?.details || 'Falha ao enviar. Tente novamente.';
      },
      complete: () => {
        this.isSubmitting = false; // Finaliza o estado de submissão
      }
    });
  }
}
