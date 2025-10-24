import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

interface Petal {
  left: number; delay: number; duration: number; size: number; drift: number; rotate: number;
}

@Component({
  selector: "petals",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./petals.component.html",
  styleUrls: ["./petals.component.scss"]
})
export class PetalsComponent {
  petals: Petal[] = [];

  constructor(){
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const base = w < 420 ? 16 : w < 768 ? 22 : 28; // menos em telas pequenas
    this.petals = Array.from({length: base}).map(() => this.randPetal());
  }

  rand(min:number,max:number){ return min + Math.random()*(max-min); }
  randInt(min:number,max:number){ return Math.floor(this.rand(min,max)); }

  randPetal(): Petal {
    return {
      left: this.rand(0,100),
      delay: this.rand(0,6),
      duration: this.rand(9,18),
      size: this.rand(10,22),
      drift: this.rand(-40,40),
      rotate: this.rand(0,360)
    };
  }

  track(i:number){ return i; }

  respawn(i:number){
    // gera uma nova semente e força a troca (para variar a próxima queda)
    this.petals[i] = this.randPetal();
    this.petals = [...this.petals];
  }
}
