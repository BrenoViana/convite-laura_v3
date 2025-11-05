import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RsvpService } from '../../services/rsvp.service';

@Component({
  selector: 'rsvp-block',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <form [formGroup]="form" (ngSubmit)="send()">
    <input formControlName="name" placeholder="Seu nome" />
    <button type="submit">Confirmar</button>
  </form>
  `
})
export class RsvpBlockComponent {
  private fb = inject(FormBuilder);
  private api = inject(RsvpService);

  form = this.fb.group({
    name: ['', Validators.required],
    attending: [true],
    adults: [2]
  });

  async send(){
    if (this.form.invalid) return;
    await this.api.submit(this.form.value as any);
    this.form.reset({ attending: true, adults: 2 });
  }
}
