import { Component } from '@angular/core';
import { CarouselComponent } from './components/carousel/carousel.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { PetalsComponent } from './components/petals/petals.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CarouselComponent, CountdownComponent, PetalsComponent],
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
