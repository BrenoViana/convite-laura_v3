import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'carousel-swiper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sakura-swiper" #root>
      <div class="slides">
        <img *ngFor="let img of images" [src]="img" alt="" />
      </div>
      <button class="nav prev" type="button" (click)="prev()" aria-label="Anterior">‹</button>
      <button class="nav next" type="button" (click)="next()" aria-label="Próximo">›</button>
    </div>
  `,
  styles: [`
    .sakura-swiper{position:relative; width:100%; height:100%; overflow:hidden}
    .slides{display:flex; width:100%; height:100%; transition:transform .5s ease}
    .slides img{flex:0 0 100%; width:100%; height:100%; object-fit:cover; display:block}
    .nav{opacity: 50%;
  color: #e44a83; position:absolute; top:50%; transform:translateY(-50%); background:#ffffffcc; border:1px solid #ffd3df; border-radius:999px; width:32px;height:32px; display:grid;place-items:center; font-size:18px; cursor:pointer}
    .nav.prev{left:8px}
    .nav.next{right:8px}
  `]
})
export class CarouselSwiperComponent implements OnInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() autoplayMs = 3500;

  @ViewChild('root', { static: true }) root!: ElementRef<HTMLDivElement>;

  private idx = 0;
  private timer?: any;

  ngOnInit(): void {
    this.resetAutoplay();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private applyTransform() {
    const slides = this.root.nativeElement.querySelector('.slides') as HTMLDivElement;
    slides.style.transform = `translateX(-${this.idx * 100}%)`;
  }

  next() {
    if (!this.images?.length) return;
    this.idx = (this.idx + 1) % this.images.length;
    this.applyTransform();
    this.resetAutoplay();
  }
  prev() {
    if (!this.images?.length) return;
    this.idx = (this.idx - 1 + this.images.length) % this.images.length;
    this.applyTransform();
    this.resetAutoplay();
  }

  private resetAutoplay() {
    clearInterval(this.timer);
    if (this.autoplayMs && this.autoplayMs > 0 && this.images?.length > 1) {
      this.timer = setInterval(() => this.next(), this.autoplayMs);
    }
  }
}
