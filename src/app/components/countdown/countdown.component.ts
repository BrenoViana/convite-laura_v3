import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="countdown" role="timer" aria-live="polite" *ngIf="ready">
    <div class="box"><span>{{d}}</span><small>dias</small></div>
    <div class="box"><span>{{h}}</span><small>horas</small></div>
    <div class="box"><span>{{m}}</span><small>min</small></div>
    <div class="box"><span>{{s}}</span><small>seg</small></div>
  </div>
  `
})
export class CountdownComponent implements OnDestroy {
  @Input({ required: true }) targetISO!: string;

  d = 0; h = 0; m = 0; s = 0; ready = false;
  private t?: any;

  ngOnInit() {
    this.tick();
    this.t = setInterval(() => this.tick(), 1000);
  }
  ngOnDestroy() {
    if (this.t) clearInterval(this.t);
  }

  private tick() {
    if (!this.targetISO) return;
    const target = new Date(this.targetISO).getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const sec = Math.floor(diff / 1000);
    this.d = Math.floor(sec / 86400);
    this.h = Math.floor((sec % 86400) / 3600);
    this.m = Math.floor((sec % 3600) / 60);
    this.s = Math.floor(sec % 60);
    this.ready = true;
  }
}
