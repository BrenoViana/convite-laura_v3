import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'petals-canvas',
  standalone: true,
  imports: [CommonModule],
  styles:[`
    :host{position:fixed; inset:0; z-index:0; pointer-events:none;}
    canvas{width:100%; height:100%;}
  `],
  template:`<canvas #c></canvas>`
})
export class PetalsCanvasComponent implements OnDestroy {
  @ViewChild('c', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D | null;
  private petals: {x:number;y:number;vx:number;vy:number;size:number;rot:number;vr:number;alpha:number}[] = [];
  private raf?: number;
  private onResize = () => this.resize();

  ngAfterViewInit(){
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.resize();
    for(let i=0;i<40;i++) this.spawn(true);
    const loop = () => { this.step(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    addEventListener('resize', this.onResize);
  }
  ngOnDestroy(){ if(this.raf) cancelAnimationFrame(this.raf); removeEventListener('resize', this.onResize); }

  private resize(){
    const c = this.canvasRef.nativeElement;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.floor(innerWidth * dpr);
    c.height = Math.floor(innerHeight * dpr);
    if(this.ctx) this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  private spawn(randomY=false){
    const x = Math.random()*innerWidth;
    const y = randomY ? Math.random()*innerHeight : -20;
    this.petals.push({
      x, y,
      vx: (Math.random()-0.5)*0.6,
      vy: 0.6 + Math.random()*0.8,
      size: 6 + Math.random()*10,
      rot: Math.random()*Math.PI*2,
      vr: (Math.random()-0.5)*0.04,
      alpha: 0.7 + Math.random()*0.3
    });
  }
  private step(){
    const ctx = this.ctx; if(!ctx) return;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.save();
    for(const p of this.petals){
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if(p.y > innerHeight + 20) { p.x = Math.random()*innerWidth; p.y = -20; }
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#FFB7C5';
      this.drawPetal(ctx, p.size);
      ctx.setTransform(1,0,0,1,0,0);
    }
    ctx.restore();
  }
  private drawPetal(ctx:CanvasRenderingContext2D, s:number){
    ctx.beginPath();
    ctx.moveTo(0, -s*0.6);
    ctx.bezierCurveTo(s*0.9, -s*0.9, s*0.9, s*0.6, 0, s);
    ctx.bezierCurveTo(-s*0.9, s*0.6, -s*0.9, -s*0.9, 0, -s*0.6);
    ctx.closePath();
    ctx.fill();
  }
}
