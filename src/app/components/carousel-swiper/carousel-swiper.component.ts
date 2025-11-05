import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'carousel-swiper',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .wrap{position:relative; width:100%; height:100%;}
    .slide{position:absolute; inset:0; opacity:0; transition:opacity .35s ease; display:grid; place-items:center;}
    .slide.active{opacity:1;}
    img{width:100%; height:100%; object-fit:cover; display:block;}
    .dots{position:absolute; left:0; right:0; bottom:8px; display:flex; gap:6px; justify-content:center;}
    .dot{width:8px; height:8px; border-radius:999px; background:rgba(0,0,0,.15); border:1px solid rgba(255,255,255,.7)}
    .dot.active{background:rgba(255,255,255,.9);}
    .nav{position:absolute; top:50%; transform:translateY(-50%); background:rgba(255,255,255,.8); border:1px solid #ffd3df; border-radius:8px; padding:4px 8px; cursor:pointer; user-select:none;}
    .prev{left:8px;} .next{right:8px;}
  `],
  template: `
  <div class="wrap sakura-swiper" *ngIf="imgs.length">
    <div class="slide" *ngFor="let src of imgs; let i = index" [class.active]="i===idx()">
      <img [src]="src" alt="foto {{i+1}}">
    </div>
    <button class="nav prev" type="button" (click)="prev()" aria-label="Anterior">‹</button>
    <button class="nav next" type="button" (click)="next()" aria-label="Próximo">›</button>
    <div class="dots">
      <span class="dot" *ngFor="let _ of imgs; let i=index" [class.active]="i===idx()" (click)="go(i)"></span>
    </div>
  </div>
  `
})
export class CarouselSwiperComponent {
  @Input() images: string[] = [];
  imgs: string[] = [];
  idx = signal(0);

  ngOnChanges() {
    this.imgs = Array.isArray(this.images) ? this.images : [];
    if (this.imgs.length && this.idx() >= this.imgs.length) this.idx.set(0);
  }
  prev(){ this.idx.set((this.idx() - 1 + this.imgs.length) % this.imgs.length); }
  next(){ this.idx.set((this.idx() + 1) % this.imgs.length); }
  go(i:number){ if(i>=0 && i<this.imgs.length) this.idx.set(i); }
}
