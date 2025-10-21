import { Component } from '@angular/core';
import { CountdownComponent } from './components/countdown/countdown.component';
import { PetalsComponent } from './components/petals/petals.component';
import { CarouselSwiperComponent } from './components/carousel-swiper/carousel-swiper.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CarouselSwiperComponent, CountdownComponent, PetalsComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  env = environment;

  get mapsUrl(): string {
    return `https://www.google.com/maps/search/?api=1&query=${environment.mapsQuery}`;
  }

  icsUrl = 'assets/event.ics';
}
