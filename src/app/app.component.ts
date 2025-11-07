// src/app/app.component.ts
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { environment } from "../environments/environment";
import { RsvpService } from "./services/rsvp.service";
import { firstValueFrom } from 'rxjs'; // Importação para converter Observable em Promise

import { CountdownComponent } from "./components/countdown/countdown.component";
import { CarouselSwiperComponent } from "./components/carousel-swiper/carousel-swiper.component";
import { PetalsCanvasComponent } from "./components/petals-canvas/petals-canvas.component";

// Interfaces para garantir a tipagem correta do payload
interface KidFrontend {
  name: string;
  age: number;
}

interface AppRsvpPayload { // Usando um nome diferente para evitar conflito de nome, mas com a mesma estrutura do RsvpService
  fullName: string;
  bringsChildren: boolean;
  children?: KidFrontend[];
}

interface RsvpSuccessResponse {
  message: string;
}
// Fim das Interfaces

type KidFG = {
  name: FormControl<string | null>;
  age: FormControl<number | null>;
};

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Mantido aqui pois o formulário continua no AppComponent
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
  announcementOpen = false; // Novo: para o modal de comunicado importante

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

  // Propriedades para o conteúdo dinâmico do modal de comunicado importante
  announcementTitle: string = '<strong>(Comunicado Importante)</strong>';
  announcementMessage: string = `Em razão do tema, indicamos o uso de tons <strong>(Terrosos, Rosa ou Verde)</strong> e solicitamos a gentileza de evitar o <strong>(Vermelho)</strong>, reservado à Aniversariante, a fim de preservar a harmonia visual do evento.`;


  // Injetamos o RsvpService no construtor
  constructor(private fb: FormBuilder, private rsvpService: RsvpService) {
    this.form = this.fb.group({
      name: this.fb.control<string | null>(null, { validators: [Validators.required, Validators.minLength(2)] }),
      hasChildren: this.fb.control<boolean>(false, { nonNullable: true }),
      children: this.fb.array<FormGroup<KidFG>>([])
    });

    // Limpa crianças se desmarcar 'hasChildren'
    this.form.get("hasChildren")!.valueChanges.subscribe(v => {
      if (!v) {
        this.children.clear();
      } else {
        // Se 'hasChildren' for marcado e não houver crianças, adiciona um campo para UX
        if (this.children.length === 0) {
          this.addChild();
        }
      }
    });
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
    this.announcementOpen = false; // Garante que o modal de comunicado esteja fechado ao abrir o RSVP
  }
  closeRsvp() {
    this.rsvpOpen = false;
    this.form.reset({ name: null, hasChildren: false }); // Limpa o formulário ao fechar
    this.children.clear(); // Limpa o FormArray de crianças
  }

  // Métodos para controlar o modal de Comunicado Importante.
  openAnnouncementModal() {
    this.rsvpOpen = false; // Fecha o modal de RSVP antes de abrir o comunicado
    this.announcementOpen = true; // Abre o modal de comunicado
  }
  closeAnnouncementModal() {
    this.announcementOpen = false;
  }

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
  async submitRsvp() {
    // Marca todos os controles como 'touched' para exibir mensagens de erro
    this.form.markAllAsTouched();

    // Validação adicional para garantir crianças se 'hasChildren' for true
    if (this.form.get('hasChildren')?.value && this.children.length === 0) {
      console.error('AppComponent: Se você trará crianças, adicione pelo menos uma.');
      this.submitError = true; // Define o erro para feedback visual
      return;
    }

    if (this.form.invalid) {
      console.error('AppComponent: Formulário inválido. Verifique os campos.');
      this.submitError = true;
      return;
    }

    this.isSubmitting = true;
    this.submitOk = false;
    this.submitError = false;

    const v = this.form.value;
    const payload: AppRsvpPayload = { // Usando a interface AppRsvpPayload
      fullName: (v.name || "").trim(),
      bringsChildren: !!v.hasChildren,
      // CORREÇÃO CRUCIAL: Incluir o array 'children' no payload
      children: v.hasChildren ? (v.children as KidFrontend[] || []) : []
    };

    console.log('AppComponent Debug: Payload CONSTRUÍDO PARA O WORKER:', payload);

    try {
      // Usando firstValueFrom para transformar o Observable em Promise
      const response: RsvpSuccessResponse = await firstValueFrom(this.rsvpService.submitRsvp(payload));
      console.log("AppComponent: RSVP enviado com sucesso:", response.message);
      this.submitOk = true;
      this.submitError = false;
      this.isSubmitting = false; // Desativa o estado de envio

      // Fecha o modal de RSVP e abre o modal de comunicado após o sucesso
      this.rsvpOpen = false; // Fechar o modal de RSVP explicitamente
      this.openAnnouncementModal();

    } catch (err: any) {
      console.error("AppComponent: Erro ao enviar RSVP:", err);
      this.submitError = true;
      this.submitOk = false;
      this.isSubmitting = false; // Desativa o estado de envio
      const errorMessage = err.error?.error || err.error?.details || 'Falha ao enviar. Por favor, tente novamente.';
      alert(`Erro ao confirmar RSVP: ${errorMessage}`);
    }
  }
}
