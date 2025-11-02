import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RsvpService } from './services/rsvp.service';

// Valor dos campos (não os controles)
type KidValue = { name: string; age: number };

// Controles do formulário da criança (tipagem correta p/ Angular Typed Forms)
type KidControls = {
  name: FormControl<string>;
  age: FormControl<number>;
};

// FormGroup tipado da criança
type KidFormGroup = FormGroup<KidControls>;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private fb = inject(FormBuilder);
  private rsvp = inject(RsvpService);

  // Infos do evento (ajuste conforme seu convite)
  eventDate = new Date('2025-12-20T16:00:00-03:00');
  dateStr  = this.eventDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  timeStr  = this.eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  mapsUrl  = 'https://maps.google.com/?q=Clube+Exemplo';
  icsUrl   = '/assets/event.ics';

  // Estado do modal/formulário
  rsvpOpen = false;
  isSubmitting = false;
  submitOk = false;
  submitError = false;

  // Form principal tipado corretamente
  form = this.fb.group({
    name: this.fb.nonNullable.control<string>('', [Validators.required, Validators.minLength(2)]),
    hasCompanion: this.fb.nonNullable.control<boolean>(false),
    companionName: this.fb.nonNullable.control<string>(''),
    hasChildren: this.fb.nonNullable.control<boolean>(false),
    children: this.fb.array<KidFormGroup>([])
  });

  get children(): FormArray<KidFormGroup> {
    return this.form.controls.children;
  }

  constructor() {
    // validação dinâmica do acompanhante
    this.form.controls.hasCompanion.valueChanges.subscribe(v => {
      const c = this.form.controls.companionName;
      if (v) {
        c.addValidators([Validators.required, Validators.minLength(2)]);
      } else {
        c.clearValidators();
        c.setValue('');
      }
      c.updateValueAndValidity();
    });

    // liga/desliga a seção de crianças
    this.form.controls.hasChildren.valueChanges.subscribe(v => {
      if (!v) {
        this.children.clear();
      } else if (this.children.length === 0) {
        this.onAddChild();
      }
    });
  }

  openRsvp() {
    this.submitOk = false;
    this.submitError = false;
    this.rsvpOpen = true;
  }

  closeRsvp(ev?: MouseEvent) {
    if (ev?.target && (ev.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.rsvpOpen = false;
      return;
    }
    if (!ev) this.rsvpOpen = false;
  }

  onAddChild() {
    const fg: KidFormGroup = this.fb.group<KidControls>({
      name: this.fb.nonNullable.control<string>('', [Validators.required, Validators.minLength(2)]),
      age:  this.fb.nonNullable.control<number>(0,  [Validators.required, Validators.min(0), Validators.max(15)]),
    });
    this.children.push(fg);
  }

  onDelChild(i: number) {
    this.children.removeAt(i);
  }

  submitRsvp() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.submitOk = false;
    this.submitError = false;

    const v = this.form.getRawValue();
    const adults = 1 + (v.hasCompanion ? 1 : 0);
    const kids: KidValue[] = v.hasChildren ? v.children.map(k => ({ name: k.name, age: k.age })) : [];
    const childrenCount = kids.length;

    this.rsvp.submit({
      name: v.name,
      attending: true,
      adults,
      children: childrenCount,
      extras: {
        companionName: v.hasCompanion ? v.companionName : '',
        kids
      }
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitOk = true;
        setTimeout(() => (this.rsvpOpen = false), 1500);
      },
      error: err => {
        console.error(err);
        this.isSubmitting = false;
        this.submitError = true;
      }
    });
  }
}
