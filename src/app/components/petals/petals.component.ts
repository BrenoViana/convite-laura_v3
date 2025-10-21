import { Component } from '@angular/core';

interface Petal {
  left: number; delay: number; duration: number; size: number; drift: number; rotate: number;
}

@Component({
  selector: 'petals',
  standalone: true,
  templateUrl: './petals.component.html',
  styleUrls: ['./petals.component.scss']
})
export class PetalsComponent {
  petals: Petal[] = Array.from({length: 28}).map(() => ({
    left: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 10 + Math.random() * 12,
    size: 10 + Math.random() * 16,
    drift: -30 + Math.random() * 60,
    rotate: Math.random() * 360
  }));
}
