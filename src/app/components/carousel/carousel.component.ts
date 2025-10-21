import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent implements OnInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() autoPlay = true;
  @Input() intervalMs = 3500;

  @ViewChild('track') trackRef!: ElementRef<HTMLDivElement>;

  index = 0;
  private timer?: any;
  private startX = 0; private currentX = 0; private dragging = false;

  ngOnInit(): void {
    if (this.autoPlay && this.images?.length > 1) {
      this.timer = setInterval(() => this.next(), this.intervalMs);
    }
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  next(){ this.index = (this.index + 1) % this.images.length; this.updateTransform(); }
  prev(){ this.index = (this.index - 1 + this.images.length) % this.images.length; this.updateTransform(); }

  private updateTransform(){
    const track = this.trackRef?.nativeElement;
    if (track) track.style.transform = `translateX(-${this.index * 100}%)`;
  }

  onPointerDown(e: PointerEvent){
    if (!this.images?.length) return;
    this.dragging = true; this.startX = e.clientX; this.currentX = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (this.timer) clearInterval(this.timer);
  }
  onPointerMove(e: PointerEvent){
    if(!this.dragging) return;
    this.currentX = e.clientX;
  }
  onPointerUp(){
    if(!this.dragging) return;
    const delta = this.currentX - this.startX;
    this.dragging = false;
    if (delta > 50) this.prev();
    else if (delta < -50) this.next();
    if (this.autoPlay && this.images?.length > 1) {
      this.timer = setInterval(() => this.next(), this.intervalMs);
    }
  }
}
