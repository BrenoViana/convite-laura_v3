import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'countdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss']
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input({ required: true }) targetISO!: string;

  d = signal(0); h = signal(0); m = signal(0); s = signal(0);
  private sub?: Subscription;

  ngOnInit(): void {
    const target = new Date(this.targetISO).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      this.d.set(days); this.h.set(hours); this.m.set(minutes); this.s.set(seconds);
    };
    tick();
    this.sub = interval(1000).subscribe(tick);
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
