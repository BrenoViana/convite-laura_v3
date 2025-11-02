import { Component, OnInit, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

type ChildItem = { name: string; age: number | null };

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  // === Dados do evento / links (ajuste se quiser) ===
  env = {
    eventDateISO: '2025-12-19T19:00:00-03:00', // usado pelo <countdown>
    giftListUrl: '', // opcional
  };

  // Endereço/agenda (ajuste conforme seu convite)
  venue = 'Salão de Festas';
  addressMain = 'Rua Exemplo, 123 - Bairro';
  cep = '00000-000';
  get mapsUrl(): string {
    const q = encodeURIComponent(`${this.venue ? this.venue + ' - ' : ''}${this.addressMain} ${this.cep ?? ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  icsUrl = '/assets/event.ics';

  // Fotos no carrossel (se tiver); deixe vazio se não usar
  photosSafe: string[] = [];

  // Datas para chips
  dateStr = '';
  timeStr = '';

  // === Modal / estado de envio ===
  rsvpOpen = false;
  isSubmitting = false;
  submitOk = false;
  submitError = false;

  // === Formulário ===
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    // Cria o form no construtor (evita TS2729: uso do fb antes da init)
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      hasCompanion: [false],
      companionName: [''],
      hasChildren: [false],
      children: this.fb.array<FormGroup<{
        name: FormControl<string | null>;
        age: FormControl<number | null>;
      }>>([]),
    });

    // Regras dinâmicas
    this.form.get('hasCompanion')!.valueChanges.subscribe((on: boolean) => {
      const c = this.form.get('companionName')!;
      if (on) {
        c.addValidators([Validators.required, Validators.minLength(2)]);
      } else {
        c.clearValidators();
        c.setValue('');
      }
      c.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('hasChildren')!.valueChanges.subscribe((on: boolean) => {
      if (!on) {
        // limpa lista ao desmarcar
        while (this.children.length) this.children.removeAt(0);
      } else if (on && this.children.length === 0) {
        // sugere primeira linha
        this.onAddChild();
      }
    });
  }

  ngOnInit(): void {
    // Monta strings de data/hora para chips
    const d = new Date(this.env.eventDateISO);
    const optsDate: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    const optsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    this.dateStr = d.toLocaleDateString('pt-BR', optsDate);
    this.timeStr = d.toLocaleTimeString('pt-BR', optsTime);
  }

  // Acesso fácil ao FormArray de crianças
  get children(): FormArray<FormGroup<{
    name: FormControl<string | null>;
    age: FormControl<number | null>;
  }>> {
    return this.form.get('children') as any;
  }

  // Helpers de criação/remoção de criança
  newChild(name = '', age: number | null = null) {
    return this.fb.group({
      name: new FormControl<string | null>(name, [Validators.required, Validators.minLength(2)]),
      age: new FormControl<number | null>(age, [Validators.required, Validators.min(0), Validators.max(15)]),
    });
  }
  onAddChild(): void {
    this.children.push(this.newChild());
  }
  onDelChild(i: number): void {
    this.children.removeAt(i);
  }

  // Abre/fecha modal
  openRsvp(): void {
    this.submitOk = false;
    this.submitError = false;
    this.isSubmitting = false;
    this.rsvpOpen = true;
    // foca no primeiro campo após abrir (pequeno delay para render)
    setTimeout(() => {
      const el = document.getElementById('name');
      el?.focus();
    }, 50);
  }
  closeRsvp(ev?: Event): void {
    this.rsvpOpen = false;
  }

  // Monta texto detalhado para o "message" (administrativo)
  private buildDetailsMessage(): string {
    const v = this.form.value as any;
    const parts: string[] = [];

    if (v.hasCompanion && v.companionName) {
      parts.push(`Acompanhante: ${v.companionName}`);
    }
    if (v.hasChildren && Array.isArray(v.children) && v.children.length) {
      const kids = (v.children as ChildItem[])
        .filter(k => (k?.name || '').trim().length > 0)
        .map(k => `${k.name}${k.age != null ? `(${k.age})` : ''}`);
      if (kids.length) parts.push(`Crianças: ${kids.join(', ')}`);
    }

    return parts.join(' | ');
  }

  // Submete para /api/rsvp
  async submitRsvp(): Promise<void> {
    this.submitOk = false;
    this.submitError = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value as any;

    const adults = 1 + (v.hasCompanion && v.companionName ? 1 : 0);
    const childrenCount =
      v.hasChildren && Array.isArray(v.children) ? (v.children as ChildItem[]).filter(k => !!(k?.name || '').trim()).length : 0;

    const payload = {
      name: (v.name as string).trim(),
      attending: true,
      adults,
      children: childrenCount,
      phone: '',
      message: this.buildDetailsMessage(),
    };

    this.isSubmitting = true;
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      this.submitOk = true;
      // opcional: fechar após alguns segundos
      // setTimeout(() => this.closeRsvp(), 2200);
    } catch (e) {
      console.error('RSVP submit error:', e);
      this.submitError = true;
    } finally {
      this.isSubmitting = false;
    }
  }
}
