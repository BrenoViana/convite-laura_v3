import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "countdown",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./countdown.component.html",
  styleUrls: ["./countdown.component.scss"]
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input() targetISO!: string;
  days = 0; hours = 0; minutes = 0; seconds = 0;
  private t?: any;

  ngOnInit(){ this.tick(); this.t = setInterval(() => this.tick(), 1000); }
  ngOnDestroy(){ if(this.t) clearInterval(this.t); }

  private tick(){
    const target = new Date(this.targetISO).getTime();
    const now = Date.now();
    let diff = Math.max(0, Math.floor((target - now)/1000));
    this.days = Math.floor(diff / 86400); diff -= this.days*86400;
    this.hours = Math.floor(diff / 3600); diff -= this.hours*3600;
    this.minutes = Math.floor(diff / 60); diff -= this.minutes*60;
    this.seconds = diff;
  }
}
