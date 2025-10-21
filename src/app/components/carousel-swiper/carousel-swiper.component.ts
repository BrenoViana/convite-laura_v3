import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwiperModule } from 'swiper/angular';
import SwiperCore, { Autoplay, A11y, Pagination } from 'swiper';

SwiperCore.use([Autoplay, A11y, Pagination]);

@Component({
  selector: 'carousel-swiper',
  standalone: true,
  imports: [CommonModule, SwiperModule],
  templateUrl: './carousel-swiper.component.html',
  styleUrls: ['./carousel-swiper.component.scss']
})
export class CarouselSwiperComponent {
  @Input() images: string[] = [];
}
