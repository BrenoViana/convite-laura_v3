# Rebuild-Invite.ps1
$ErrorActionPreference = "Stop"

function Ensure-Dir($p){ if(-not (Test-Path $p)){ New-Item -ItemType Directory -Path $p -Force | Out-Null } }
function Read-Text($p){ if(-not(Test-Path $p)){ return "" } Get-Content $p -Raw }
function Write-Text($p,$t){ $dir=Split-Path -Parent $p; Ensure-Dir $dir; Set-Content $p $t -Encoding UTF8 }
function Log($m,$c="Gray"){ Write-Host $m -ForegroundColor $c }

# ============ 1) environments ============
$envTs = @'
export const environment = {
  production: false,
  birthdayGirl: 'Laura',
  eventDateISO: '2025-12-19T20:00:00-03:00',
  addressText: 'Rua Alfredina Amaral, 75 - Milionários, Belo Horizonte/MG, 30620-220 | Casa da Alegria',
  mapsQuery: 'Rua%20Alfredina%20Amaral%2C%2075%20-%20Milion%C3%A1rios%2C%20Belo%20Horizonte%2FMG%2C%2030620-220%20%7C%20Casa%20da%20Alegria',
  theme: {
    petalWhite: '#FFF7FA',
    sakuraPink: '#FFB7C5'
  },
  photos: [
    'assets/photos/01.webp',
    'assets/photos/02.webp',
    'assets/photos/03.webp',
    'assets/photos/04.webp'
  ],
  giftListUrl: '#',
  rsvpUrl: '#'
};
'@
Write-Text "src/environments/environment.ts" $envTs
$envProd = $envTs -replace "production: false","production: true"
Write-Text "src/environments/environment.prod.ts" $envProd
Log "✓ environments escritos." "Green"

# ============ 2) styles globais ============
$styles = @'
:root{
  --petal-white: #FFF7FA;
  --sakura-pink: #FFB7C5;
  --sakura-pink-2: #f3a3b5;
  --text-dark: #2A2A2A;
  --glass: rgba(255,255,255,.7);
  --chip-bg: #fff5f9;
}
*{ box-sizing: border-box; }
html, body{
  height: 100%;
  margin: 0;
  color: var(--text-dark);
  background:
    radial-gradient(1200px 600px at -10% -10%, #ffeef3 0%, transparent 60%),
    radial-gradient(1000px 700px at 110% 110%, #ffe2ec 0%, transparent 60%),
    var(--petal-white);
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
.container{ width:100%; max-width: 560px; margin: 0 auto; padding: clamp(12px, 4vw, 24px); }
'@
Write-Text "src/styles.scss" $styles
Log "✓ styles.scss escrito." "Green"

# ============ 3) Countdown (standalone) ============
$cd_ts = @'
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
  @Input() targetISO = '';
  t?: any;
  d=0; h=0; m=0; s=0;
  ngOnInit(){ this.tick(); this.t = setInterval(()=>this.tick(), 1000); }
  ngOnDestroy(){ if(this.t) clearInterval(this.t); }
  private tick(){
    const target = new Date(this.targetISO).getTime();
    const now = Date.now();
    let diff = Math.max(0, Math.floor((target - now)/1000));
    this.d = Math.floor(diff/86400); diff%=86400;
    this.h = Math.floor(diff/3600);  diff%=3600;
    this.m = Math.floor(diff/60);    diff%=60;
    this.s = diff;
  }
}
'@
$cd_html = @'
<div class="countdown">
  <div class="box"><span>{{d}}</span><small>Dias</small></div>
  <div class="box"><span>{{h}}</span><small>Horas</small></div>
  <div class="box"><span>{{m}}</span><small>Min</small></div>
  <div class="box"><span>{{s}}</span><small>Seg</small></div>
</div>
'@
$cd_scss = @'
.countdown{
  display:flex; justify-content:center; gap:8px; padding: 6px 0 10px;
  .box{
    min-width:68px; padding:8px 0; text-align:center; border-radius:999px;
    background: var(--chip-bg); border:1px solid #ffd3df;
    box-shadow: 0 8px 18px rgba(255,183,197,.22);
    span{ display:block; font-size:18px; font-weight:900; line-height:1.1; }
    small{ display:block; opacity:.85; font-size:12px }
  }
}
'@
Write-Text "src/app/components/countdown/countdown.component.ts" $cd_ts
Write-Text "src/app/components/countdown/countdown.component.html" $cd_html
Write-Text "src/app/components/countdown/countdown.component.scss" $cd_scss
Log "✓ Countdown pronto." "Green"

# ============ 4) Pétalas Canvas ============
$pet_ts = @'
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";

interface Petal {
  x:number; y:number; size:number; angle:number; spin:number; driftAmp:number; baseVY:number; vx:number;
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
  private ctx!: CanvasRenderingContext2D; private raf = 0; private last = 0; private petals: Petal[] = []; private dpr = 1;
  constructor(private zone: NgZone) {}
  ngAfterViewInit(): void {
    if (typeof window === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext("2d", { alpha: true })!; this.ctx = ctx; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.resize(); window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", this.visibility, { passive: true });
    this.spawnInitial();
    this.zone.runOutsideAngular(() => this.loop(performance.now()));
  }
  ngOnDestroy(): void { cancelAnimationFrame(this.raf); window.removeEventListener("resize", this.resize); document.removeEventListener("visibilitychange", this.visibility); }
  private visibility = () => { if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; this.last = 0; } else { this.loop(performance.now()); } };
  private resize = () => { const c = this.canvasRef.nativeElement; const w = innerWidth, h = innerHeight, d = this.dpr;
    c.width = Math.floor(w*d); c.height = Math.floor(h*d); c.style.width = w+"px"; c.style.height = h+"px"; this.ctx.setTransform(d,0,0,d,0,0); };
  private spawnInitial(){ const w = innerWidth; const count = w < 420 ? 18 : w < 768 ? 26 : 34;
    for(let i=0;i<count;i++){ this.petals.push(this.makePetal(Math.random()*w, Math.random()*innerHeight*-0.2)); } }
  private makePetal(x=Math.random()*innerWidth, y=-20): Petal{
    const size = 8 + Math.random()*18;
    return { x, y, size, angle: Math.random()*Math.PI*2, spin:(Math.random()*0.8-0.4)*0.6, driftAmp:-40+Math.random()*80, baseVY:22+Math.random()*38, vx:0 };
  }
  private wind(t:number){ return Math.sin(t*0.0004)*20 + Math.sin(t*0.0013)*10; }
  private loop = (ts:number) => {
    this.raf = requestAnimationFrame(this.loop); if(!this.last) this.last = ts; const dt = Math.min(0.05, (ts-this.last)/1000); this.last = ts;
    const ctx = this.ctx, W = innerWidth, H = innerHeight; ctx.clearRect(0,0,W,H); const wind = this.wind(ts);
    for(const p of this.petals){
      p.angle += p.spin*dt; const sway = Math.sin((ts/1000)+p.y*0.01)*p.driftAmp; p.vx = (wind + sway*0.05)*dt;
      p.y += p.baseVY*dt*(0.85 + p.size/30); p.x += p.vx; this.drawPetal(p);
      if (p.y - p.size > H + 20 || p.x < -60 || p.x > W + 60) { Object.assign(p, this.makePetal(Math.random()*W, -p.size-10)); }
    }
  };
  private drawPetal(p:Petal){
    const ctx = this.ctx; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    const s=p.size; const g = ctx.createLinearGradient(-s,-s,s,s); g.addColorStop(0,"#ffe1ea"); g.addColorStop(0.6,"#ffceda"); g.addColorStop(1,"#ffb7c5");
    ctx.fillStyle = g; ctx.shadowColor = "rgba(213,106,134,0.25)"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(0,-0.5*s); ctx.bezierCurveTo(0.6*s,-0.4*s,0.6*s,0.3*s,0,0.5*s); ctx.bezierCurveTo(-0.6*s,0.3*s,-0.6*s,-0.4*s,0,-0.5*s);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
'@
$pet_html = '<canvas #canvas class="petals-canvas" aria-hidden="true"></canvas>'
$pet_scss = @'
:host{ position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.petals-canvas{ display:block; width:100%; height:100%; }
@media (prefers-reduced-motion: reduce){ :host{ display:none; } }
'@
Write-Text "src/app/components/petals-canvas/petals-canvas.component.ts" $pet_ts
Write-Text "src/app/components/petals-canvas/petals-canvas.component.html" $pet_html
Write-Text "src/app/components/petals-canvas/petals-canvas.component.scss" $pet_scss
Log "✓ Pétalas Canvas pronto." "Green"

# ============ 5) Carrossel (Swiper Element Web Components) ============
$car_ts = @'
import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "carousel-swiper",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./carousel-swiper.component.html",
  styleUrls: ["./carousel-swiper.component.scss"],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CarouselSwiperComponent implements AfterViewInit, OnChanges {
  @Input() images: string[] = [];
  @ViewChild("swc") swc?: ElementRef<any>;
  /** deixe false até gerar -640/-960/-1280; depois pode mudar para true */
  enableSrcset = false;

  ngAfterViewInit(){ this.initSwiper(); }
  ngOnChanges(changes: SimpleChanges){ if (changes["images"]) setTimeout(()=> this.initSwiper()); }

  private initSwiper(){
    const el = this.swc?.nativeElement; if(!el) return;
    if (el.swiper) { try { el.swiper.update(); } catch {} return; }
    if (typeof el.initialize === "function") el.initialize();
  }
  onImgError(ev: Event){
    const img = ev.target as HTMLImageElement;
    if(!img) return; img.onerror = null; img.src = "assets/photos/placeholder.svg";
  }
  sizes(): string { return "(max-width: 1000px) 100vw, 1000px"; }
  buildSrcSet(src: string): string | null {
    if (!src || /\.svg$/i.test(src)) return null;
    const m = src.match(/^(.*)\.(\w+)$/); const base = m ? m[1] : src;
    return `${base}-640.webp 640w, ${base}-960.webp 960w, ${base}-1280.webp 1280w`;
  }
}
'@
$car_html = @'
<swiper-container
  #swc
  init="false"
  class="sakura-swiper"
  slides-per-view="1"
  [attr.loop]="images.length > 1 ? 'true' : 'false'"
  pagination="true"
  autoplay="true"
  autoplay-delay="3500"
  autoplay-disable-on-interaction="false"
  observer="true"
  observe-parents="true"
  a11y="true"
>
  <ng-container *ngIf="images.length > 0; else noImgs">
    <swiper-slide *ngFor="let img of images; index as i">
      <figure class="slide">
        <picture>
          <source [attr.srcset]="enableSrcset ? buildSrcSet(img)?.replace(/\.webp/g,'.avif') : null" type="image/avif">
          <source [attr.srcset]="enableSrcset ? buildSrcSet(img) : null" type="image/webp">
          <img [src]="img" [attr.sizes]="enableSrcset ? sizes() : null" loading="lazy" decoding="async" (error)="onImgError($event)" [alt]="'Foto ' + (i+1) + ' da Laura'">
        </picture>
      </figure>
    </swiper-slide>
  </ng-container>

  <ng-template #noImgs>
    <swiper-slide>
      <figure class="slide">
        <img src="assets/photos/placeholder.svg" alt="Foto placeholder">
      </figure>
    </swiper-slide>
  </ng-template>
</swiper-container>
'@
$car_scss = @'
.sakura-swiper, swiper-container{ display:block; width:100%; height:100%; min-height:100%; }
swiper-slide{ height:100%; }
.slide{ margin:0; width:100%; height:100%; background:#fff; display:grid; place-items:center; }
.slide img{ width:100%; height:100%; object-fit: cover; display:block; }
swiper-container::part(pagination-bullet){ background: rgba(0,0,0,.25); opacity: 1; }
swiper-container::part(pagination-bullet-active){ background: var(--sakura-pink); }
'@
Write-Text "src/app/components/carousel-swiper/carousel-swiper.component.ts" $car_ts
Write-Text "src/app/components/carousel-swiper/carousel-swiper.component.html" $car_html
Write-Text "src/app/components/carousel-swiper/carousel-swiper.component.scss" $car_scss
Log "✓ Carrossel pronto." "Green"

# ============ 6) App (layout 16:9, cores #fff5f9, badge centrada, Quando/Local) ============
$app_html = @'
<petals-canvas></petals-canvas>

<section class="container">
  <article class="card invitation">

    <div class="badge" aria-label="1 aninho">
      <span class="cherry" aria-hidden="true">🍒</span>
      <span class="dot" aria-hidden="true">🌸</span>
      <span>1 aninho</span>
    </div>

    <h1 class="title">Laura faz aniversário!</h1>
    <p class="subtitle">Um ano de amor e descobertas</p>

    <countdown [targetISO]="env.eventDateISO"></countdown>

    <div class="media">
      <div class="ratio">
        <carousel-swiper [images]="env.photos"></carousel-swiper>
      </div>
    </div>

    <section class="info">
      <div class="row">
        <div class="ico" aria-hidden="true">🗓️</div>
        <div class="col">
          <div class="label">Quando</div>
          <div class="chips">
            <span class="chip">{{ dateStr }}</span>
            <span class="chip">{{ timeStr }}</span>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="ico" aria-hidden="true">📍</div>
        <div class="col">
          <div class="label">Local</div>
          <div class="address" [innerHTML]="addressHtml"></div>
        </div>
      </div>
    </section>

    <section class="actions">
      <a class="btn" [href]="mapsUrl" target="_blank" rel="noopener">Abrir no mapa</a>
      <a class="btn" [href]="icsUrl" download="Laura-1Aninho-19-12-2025.ics">Salvar na agenda</a>
      <a class="btn secondary" [href]="env.giftListUrl || '#'" target="_blank" rel="noopener">Lista de presentes</a>
      <a class="btn primary" [href]="env.rsvpUrl || '#'" target="_blank" rel="noopener">Confirmar presença</a>
    </section>

    <footer class="footnote">Sua presença vai deixar tudo ainda mais especial ✨</footer>
  </article>
</section>
'@
$app_scss = @'
.invitation{
  position: relative; z-index: 1;
  background: linear-gradient(180deg, #fff 0%, #fff9fb 100%);
  border: 1px solid #ffe3ec;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,.06);
  padding: clamp(14px, 4vw, 22px);
}
/* badge como pill centralizada */
.badge{
  display:flex; align-items:center; justify-content:center; gap:8px;
  padding:6px 12px; border-radius:999px; margin:0 auto 8px; width:fit-content;
  background:#fff; border:1px solid #ffd3df; color:#c25679; font-weight:700;
  box-shadow: 0 8px 18px rgba(255,183,197,.28);
}
.badge .cherry{ filter: drop-shadow(0 2px 6px rgba(0,0,0,.08)); }
.badge .dot{ font-size: 18px; }

.title{
  font-weight: 900; font-size: clamp(22px, 6.6vw, 28px); line-height: 1.15;
  color: #6a2240; margin: 10px 0 6px; text-align: center;
}
.subtitle{ text-align:center; color:#7d5465; margin:0 0 10px; font-weight:500; }

/* countdown chips já no componente */

/* mídia 16:9 */
.media{ margin: 10px 0 12px; }
.ratio{ width:100%; aspect-ratio:16/9; border-radius:18px; overflow:hidden; border:1px solid #ffe3ec; box-shadow:0 12px 28px rgba(0,0,0,.08); }
.ratio .sakura-swiper, .ratio swiper-container{ width:100%; height:100%; }

/* bloco de informações */
.info{
  display:grid; gap:10px; background:#fff; border:1px solid #ffe3ec;
  border-radius:16px; padding:10px;
}
.row{ display:flex; gap:10px; align-items:flex-start; }
.ico{ width:28px; height:28px; display:grid; place-items:center; font-size:18px; }
.label{ font-weight:800; color:#6a2240; margin-bottom:6px; }
.chips{ display:flex; gap:8px; flex-wrap:wrap; }
.chip{
  display:inline-block; padding:6px 10px; border-radius:999px; font-weight:800;
  background: var(--chip-bg); border:1px solid #ffd3df; box-shadow:0 6px 16px rgba(255,183,197,.18);
}
.address a{ color:#6a2240; font-weight:800; text-decoration: underline; }

/* grade 2x2 de botões */
.actions{ display:grid; gap:10px; margin:12px 0 6px; grid-template-columns:1fr 1fr; }
.btn{
  display:grid; place-items:center; text-align:center; padding:14px 12px; border-radius:16px; font-weight:800;
  color:#41202f; background:#fff5f9; border:1px solid #ffc3d2; box-shadow:0 10px 24px rgba(255,183,197,.28);
}
.btn.secondary{ background:#fff5f9; }
.btn.primary{ background:#fff5f9; }

.footnote{ text-align:center; color:#7d5465; margin:10px 0 6px; font-size:14px; }

@media (min-width: 560px){
  .container{ max-width:560px; }
}
'@
$app_ts = @'
import { Component } from "@angular/core";
import { CountdownComponent } from "./components/countdown/countdown.component";
import { PetalsCanvasComponent } from "./components/petals-canvas/petals-canvas.component";
import { CarouselSwiperComponent } from "./components/carousel-swiper/carousel-swiper.component";
import { environment } from "../environments/environment";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CarouselSwiperComponent, CountdownComponent, PetalsCanvasComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  env = environment;

  private eventDate = new Date(environment.eventDateISO);
  get dateStr(): string { return this.eventDate.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }); }
  get timeStr(): string { return this.eventDate.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }); }

  get mapsUrl(): string { return `https://www.google.com/maps/search/?api=1&query=${environment.mapsQuery}`; }
  icsUrl = "assets/event.ics";

  get addressHtml(): string {
    const txt = environment.addressText ?? '';
    const cepMatch = txt.match(/\b\d{5}-?\d{3}\b/);
    if(!cepMatch) return txt;
    const cep = cepMatch[0];
    const link = `https://www.google.com/search?q=${encodeURIComponent(cep)}`;
    return txt.replace(cep, `<a href="${link}" target="_blank" rel="noopener">${cep}</a>`);
  }
}
'@
Write-Text "src/app/app.component.html" $app_html
Write-Text "src/app/app.component.scss" $app_scss
Write-Text "src/app/app.component.ts" $app_ts
Log "✓ App (layout) pronto." "Green"

# ============ 7) placeholder & ICS ============
$ph = @'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF7FA"/><stop offset="100%" stop-color="#FFB7C5"/></linearGradient></defs><rect fill="url(#g)" width="100%" height="100%"/><g fill="#d56a86" opacity="0.2"><circle cx="260" cy="200" r="90"/><circle cx="600" cy="360" r="140"/><circle cx="980" cy="220" r="110"/></g><text x="50%" y="52%" font-family="Inter, Arial" font-size="42" text-anchor="middle" fill="#6a2240">Foto não encontrada</text></svg>
'@
Write-Text "src/assets/photos/placeholder.svg" $ph

$ics = @'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//convite-laura_v3//PT-BR
BEGIN:VEVENT
UID:laura-1-aninho-2025-12-19T20:00:00-03:00
DTSTAMP:20240801T120000Z
DTSTART:20251219T230000Z
DTEND:20251220T020000Z
SUMMARY:Aniversário da Laura (1 aninho)
LOCATION:Rua Alfredina Amaral, 75 - Milionários, Belo Horizonte/MG, 30620-220
DESCRIPTION:Venha comemorar!
END:VEVENT
END:VCALENDAR
'@
Write-Text "src/assets/event.ics" $ics
Log "✓ placeholder.svg e event.ics prontos." "Green"

# ============ 8) angular.json (CSS Swiper + outputPath opcional) ============
$jsonPath = "angular.json"
if(Test-Path $jsonPath){
  $json = Get-Content $jsonPath -Raw | ConvertFrom-Json
  $projName = ($json.projects.PSObject.Properties.Name | Where-Object { $_ -eq "convite-laura_v3" })[0]
  if(-not $projName){ $projName = $json.projects.PSObject.Properties.Name | Select-Object -First 1 }
  $proj = $json.projects.$projName
  if($null -ne $proj){
    $build = $proj.architect.build
    if($null -eq $build.options){ $build | Add-Member -NotePropertyName options -NotePropertyValue (@{}) }
    if($null -eq $build.options.styles){ $build.options | Add-Member -NotePropertyName styles -NotePropertyValue @() }
    $cssPath = "node_modules/swiper/swiper-bundle.min.css"
    if(($build.options.styles -join "`n") -notmatch [regex]::Escape($cssPath)){
      $build.options.styles = @($build.options.styles) + $cssPath
    }
    if(($build.options | Get-Member -Name outputPath -MemberType NoteProperty) -eq $null){
      $build.options | Add-Member -NotePropertyName outputPath -NotePropertyValue ("dist/{0}/browser" -f $projName)
    } else {
      $build.options.outputPath = "dist/$projName/browser"
    }
    # service worker (produção)
    if($null -eq $build.configurations){ $build | Add-Member -NotePropertyName configurations -NotePropertyValue (@{}) }
    if($null -eq $build.configurations.production){ $build.configurations | Add-Member -NotePropertyName production -NotePropertyValue (@{}) }
    $build.configurations.production.serviceWorker = $true
    $build.configurations.production.ngswConfigPath = "ngsw-config.json"

    ($json | ConvertTo-Json -Depth 100) | Set-Content $jsonPath -Encoding UTF8
    Log "✓ angular.json ajustado (styles/outputPath/serviceWorker)." "Green"
  }
}

# ============ 9) main.ts -> registrar Swiper Element com prepend seguro ============
$mainPath = "src/main.ts"
$rawMain = Read-Text $mainPath
if($rawMain -notmatch "swiper/element/bundle"){
  $patch = "import { register } from 'swiper/element/bundle';`r`nregister();`r`n"
  Write-Text $mainPath ($patch + $rawMain)
  Log "✓ Swiper Element registrado em main.ts" "Green"
} else {
  Log "• Swiper Element já estava registrado" "Yellow"
}

# ============ 10) Build ============
try {
  Log "• Rodando build..." "Yellow"
  npm run build | Out-Null
  Log "✅ Build OK. Se algum asset 404 aparecer, reinicie o 'ng serve'." "Green"
} catch {
  Log "⚠ Build falhou — veja erros acima." "Red"
}
