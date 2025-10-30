import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { RsvpService } from "../../services/rsvp.service";

@Component({
  selector: "app-rsvp-block",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: "./rsvp-block.component.html",
  styleUrls: ["./rsvp-block.component.scss"],
})
export class RsvpBlockComponent {
  @Output() close = new EventEmitter<void>();
  sending = false; ok = false; err = "";

  form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    attending: [true, Validators.required],
    adults: [1],
    children: [0],
    phone: [""],
    message: [""],
  });

  constructor(private fb: FormBuilder, private rsvp: RsvpService) {}

  send() {
    this.ok = false; this.err = "";
    if (this.form.invalid) return;
    this.sending = true;
    this.rsvp.submit(this.form.value as any).subscribe({
      next: () => { this.sending = false; this.ok = true; },
      error: () => { this.sending = false; this.err = "Falha ao enviar. Tente novamente."; },
    });
  }
  closeModal(){ this.close.emit(); }
}