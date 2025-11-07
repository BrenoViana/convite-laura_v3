import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RsvpService } from '../../services/rsvp.service';
import { firstValueFrom } from 'rxjs'; // Importe firstValueFrom para usar async/await com Observables

// Defina a interface exata que seu Worker espera.
// Você pode até importar esta interface se tiver um arquivo de tipos compartilhado.
interface WorkerRsvpPayload {
  fullName: string;
  bringsChildren: boolean;
  // Se o Worker espera 'children', adicione aqui também e mapeie do form se necessário.
  // Por enquanto, seu Worker só usa fullName e bringsChildren.
}

@Component({
  selector: 'rsvp-block',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <form [formGroup]="form" (ngSubmit)="send()">
    <input formControlName="name" placeholder="Seu nome completo" />
    <br>
    <!-- Assumindo que 'attending' no seu form significa 'bringsChildren' para o Worker -->
    <label>
      <input type="checkbox" formControlName="attending" />
      Eu trarei crianças
    </label>
    <br>
    <button type="submit">Confirmar Presença</button>
  </form>
  `
})
export class RsvpBlockComponent {
  private fb = inject(FormBuilder);
  private api = inject(RsvpService);

  form = this.fb.group({
    name: ['', Validators.required],
    attending: [false], // Padrão: não trará crianças
    adults: [2] // Este campo não é usado pelo Worker atualmente, mas pode permanecer no form
  });

  async send(){
    if (this.form.invalid) {
      console.error('Frontend: Formulário inválido. Verifique os campos.');
      // Opcional: mostrar uma mensagem de erro ao usuário
      return;
    }

    const formData = this.form.value;

    // Constrói o payload exatamente como o Worker espera
    const payload: WorkerRsvpPayload = {
      fullName: formData.name || '',           // Mapeia 'name' do form para 'fullName' do Worker
      bringsChildren: !!formData.attending,     // Mapeia 'attending' do form para 'bringsChildren' do Worker
                                                // !! converte para boolean e trata null/undefined
    };

    console.log('Frontend: Payload a ser enviado para o Worker:', payload);

    try {
      // Usamos firstValueFrom para converter o Observable em Promise,
      // permitindo o uso de async/await.
      const response = await firstValueFrom(this.api.submitRsvp(payload));

      console.log('Frontend: RSVP enviado com sucesso:', response.message);
      // Resetar o formulário após o sucesso
      this.form.reset({ name: '', attending: false, adults: 2 });
      // Adicione lógica para mostrar mensagem de sucesso ao usuário
    } catch (error: any) {
      console.error('Frontend: Erro ao enviar RSVP:', error);
      // Adicione lógica para mostrar mensagem de erro ao usuário,
      // talvez com detalhes do error.error se o Worker retornar um JSON de erro.
    }
  }
}
