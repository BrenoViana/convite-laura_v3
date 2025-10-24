import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";

interface Petal {
  x: number; y: number; size: number; angle: number; spin: number;
  driftAmp: number; baseVY: number; vx: number;
}

@Component({
  selector: "petals-canvas",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./petals-canvas.component.html",
  styleUrls: ["./petals-canvas.component.scss"]
})
export class PetalsCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild("canvas", { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private petals: Petal[] = [];
  private dpr = 1;

  /** transparência global das pétalas (0 = invisível, 1 = opaco) */
  private alpha = 0.60;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    if (typeof window === "undefined") return;
    // respeita prefers-reduced-motion
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const c = this.canvasRef.nativeElement;
    this.ctx = c.getContext("2d", { alpha: true })!;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.resize();
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", this.visibility, { passive: true });

    this.spawnInitial();
    this.zone.runOutsideAngular(() => this.loop(performance.now()));
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.visibility);
  }

  private visibility = () => {
    if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; this.last = 0; }
    else { this.loop(performance.now()); }
  };

  private resize = () => {
    const c = this.canvasRef.nativeElement;
    const w = window.innerWidth, h = window.innerHeight, d = this.dpr;
    c.width = Math.floor(w * d);
    c.height = Math.floor(h * d);
    c.style.width = w + "px";
    c.style.height = h + "px";
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  };

  private spawnInitial() {
    const w = window.innerWidth;
    const n = w < 420 ? 18 : w < 768 ? 26 : 34;
    for (let i = 0; i < n; i++) this.petals.push(this.makePetal(Math.random() * w, Math.random() * window.innerHeight * -0.2));
  }

  private makePetal(x = Math.random() * window.innerWidth, y = -20): Petal {
    const size = 8 + Math.random() * 18;
    return {
      x, y, size,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() * 0.8 - 0.4) * 0.6,
      driftAmp: -40 + Math.random() * 80,
      baseVY: 22 + Math.random() * 38,
      vx: 0
    };
  }

  private wind(t: number) { return Math.sin(t * 0.0004) * 20 + Math.sin(t * 0.0013) * 10; }

  private loop = (ts: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) this.last = ts;
    const dt = Math.min(0.05, (ts - this.last) / 1000); // ~50ms cap
    this.last = ts;

    const ctx = this.ctx, W = window.innerWidth, H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);

    const wind = this.wind(ts);
    for (const p of this.petals) {
      p.angle += p.spin * dt;
      const sway = Math.sin((ts / 1000) + p.y * 0.01) * p.driftAmp;
      p.vx = (wind + sway * 0.05) * dt;

      p.y += p.baseVY * dt * (0.85 + p.size / 30);
      p.x += p.vx;

      this.draw(p);

      if (p.y - p.size > H + 20 || p.x < -60 || p.x > W + 60) {
        Object.assign(p, this.makePetal(Math.random() * W, -p.size - 10));
      }
    }
  };

  private draw(p: Petal) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.alpha;                // << torna as pétalas mais translúcidas
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    const s = p.size;
    const g = ctx.createLinearGradient(-s, -s, s, s);
    // cores suaves
    g.addColorStop(0,  "#ffe1ea");
    g.addColorStop(0.6,"#ffceda");
    g.addColorStop(1,  "#ffb7c5");

    ctx.fillStyle = g;
    ctx.shadowColor = "rgba(213,106,134,0.12)"; // sombra bem leve
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(0, -0.5 * s);
    ctx.bezierCurveTo(0.6 * s, -0.4 * s, 0.6 * s, 0.3 * s, 0, 0.5 * s);
    ctx.bezierCurveTo(-0.6 * s, 0.3 * s, -0.6 * s, -0.4 * s, 0, -0.5 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
