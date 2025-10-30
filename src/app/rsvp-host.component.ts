import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { RsvpBlockComponent } from "./components/rsvp-block/rsvp-block.component";

@Component({
  selector: "rsvp-host",
  standalone: true,
  imports: [CommonModule, HttpClientModule, RsvpBlockComponent],
  template: `
    <button class="rsvp-fab" type="button" (click)="open()">Lista de presença</button>

    <div class="overlay" *ngIf="openModal" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <app-rsvp-block (close)="close()"></app-rsvp-block>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0 auto auto 0; pointer-events: none; }
    .rsvp-fab {
      position: fixed; right: 16px; bottom: 16px;
      pointer-events: auto;
      padding: 12px 16px; border-radius: 999px; border: 0; cursor: pointer;
      background: #ffd3df; color: #6a2240; font-weight: 800; box-shadow: 0 8px 20px rgba(0,0,0,.15);
    }
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.35);
      display: grid; place-items: center; z-index: 9999; pointer-events: auto;
    }
    .modal { width: min(96vw, 720px); }
  `],
})
export class RsvpHostComponent {
  openModal = false;
  open() { this.openModal = true; }
  close() { this.openModal = false; }
}